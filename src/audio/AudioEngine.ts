import { BUILTIN_DSP_PRESETS, BUILTIN_PRESET_LIST, DspPreset, DspPresetId } from '../core/dspPresets';
import {
  ChromaticTunerResult,
  ChromaticTuning,
  DiatonicTuning,
  HarmonicaHole,
  HarmonicaKey,
  HarmonicaType,
  PitchMatchResult,
  detectChromaticNote,
  matchFrequencyToHarmonica,
} from '../core/harmonicaMap';
import { detectPitchYin } from '../core/pitchYin';
import { NoiseGateProcessor } from '../core/noiseGate';
import { encodeWav } from '../core/wavEncoder';
import { encodeMp3 } from '../core/mp3Encoder';
import {
  HarpProjectFile,
  audioBufferToWavBase64,
  base64ToArrayBuffer,
} from '../core/projectSerializer';
import { DspChainHandle, createDspChain } from './DspChain';
import { Metronome, MetronomeSound, MetronomeSubdivision } from './Metronome';
import { createRecorderWorkletNode, ensureRecorderWorklet } from './recorderWorklet';
import {
  createPitchShifterNode,
  ensurePitchShifterWorklet,
  updatePitchShifterParams,
} from './pitchShifterWorklet';

export type { MetronomeSound, MetronomeSubdivision };

export interface AudioInputDevice {
  deviceId: string;
  label: string;
}

export interface MeterAndPitchFrame {
  rms: number;
  peak: number;
  clipping: boolean;
  pitchHz: number | null;
  confidence: number;
  match: PitchMatchResult | null;
  tuner: ChromaticTunerResult | null;
}

export interface BackingTrackInfo {
  name: string;
  durationSec: number;
  sampleRate: number;
  peaks: number[];
}

export interface HarpTrackMeta {
  id: string;
  name: string;
  presetId: DspPresetId;
  volume: number;
  muted: boolean;
  solo: boolean;
  offsetMs: number;
  fadeInMs: number;
  fadeOutMs: number;
  durationSec: number;
  peaks: number[];
}

interface InternalHarpTrack extends HarpTrackMeta {
  buffer: AudioBuffer;
}

/** 计算波形缩略图峰值数组 */
function computeWaveformPeaks(buffer: AudioBuffer, bars = 220): number[] {
  const ch0 = buffer.getChannelData(0);
  const step = Math.max(1, Math.floor(ch0.length / bars));
  const peaks: number[] = [];
  for (let i = 0; i < bars; i++) {
    let max = 0;
    const start = i * step;
    const end = Math.min(ch0.length, start + step);
    for (let j = start; j < end; j++) {
      const v = Math.abs(ch0[j]);
      if (v > max) max = v;
    }
    peaks.push(max);
  }
  return peaks;
}

/** 为单轨 GainNode 应用首尾淡入淡出包络（消除起音/收尾咔哒声） */
function applyTrackFadeEnvelope(
  gainParam: AudioParam,
  baseTime: number,
  volume: number,
  playDurationSec: number,
  fadeInMs: number,
  fadeOutMs: number
): void {
  const fadeInSec = Math.min(playDurationSec * 0.45, Math.max(0, fadeInMs / 1000));
  const fadeOutSec = Math.min(playDurationSec * 0.45, Math.max(0, fadeOutMs / 1000));

  if (fadeInSec > 0.001) {
    gainParam.setValueAtTime(0.0001, baseTime);
    gainParam.linearRampToValueAtTime(volume, baseTime + fadeInSec);
  } else {
    gainParam.setValueAtTime(volume, baseTime);
  }

  if (fadeOutSec > 0.001 && playDurationSec > fadeOutSec) {
    const fadeOutStart = baseTime + playDurationSec - fadeOutSec;
    gainParam.setValueAtTime(volume, fadeOutStart);
    gainParam.linearRampToValueAtTime(0.0001, baseTime + playDurationSec);
  }
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private monitorGain: GainNode | null = null;
  private recorderNode: AudioNode | null = null;
  private dspHandle: DspChainHandle | null = null;

  private readonly metronome = new Metronome();
  private readonly noiseGate = new NoiseGateProcessor();

  // 伴奏与多轨状态
  private backingTrackName = '';
  private backingBuffer: AudioBuffer | null = null;
  private backingSource: AudioBufferSourceNode | null = null;
  private backingPitchNode: AudioWorkletNode | null = null;
  private backingGain: GainNode | null = null;
  private activeTrackSources: AudioBufferSourceNode[] = [];
  private onPlaybackEndedCallback: (() => void) | null = null;

  private isPlaying = false;
  private playStartCtxTime = 0;
  private playOffsetSec = 0;

  private isRecording = false;
  private isCalibrating = false;
  private recordingWithPlayAlong = false;
  private latencyCompensationMs = 0;
  private recordedChunks: Float32Array[] = [];
  private calibratingChunks: Float32Array[] = [];
  private tracks: InternalHarpTrack[] = [];
  private trackSeq = 1;

  // 可调参数
  private presetRegistry: Map<string, DspPreset> = new Map(
    BUILTIN_PRESET_LIST.map((p) => [p.id, p])
  );
  private activePreset: DspPreset = { ...BUILTIN_DSP_PRESETS.bright_folk };
  private monitorEnabled = false;
  private backingVolume = 0.75;
  private tempoRate = 1.0;
  private pitchSemitones = 0;
  private loopEnabled = false;
  private loopA = 0;
  private loopB = 0;

  // 口琴识别配置
  private harmonicaType: HarmonicaType = 'diatonic10';
  private harmonicaKey: HarmonicaKey = 'C';
  private diatonicTuning: DiatonicTuning = 'richter';
  private chromaticTuning: ChromaticTuning = 'solo';
  private customTuningHolesC: HarmonicaHole[] | undefined = undefined;
  private a4Hz = 440;
  private smoothedPitchHz: number | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: 'interactive' });
      this.backingGain = this.ctx.createGain();
      this.backingGain.gain.value = this.backingVolume;
      this.backingGain.connect(this.ctx.destination);
      void ensurePitchShifterWorklet(this.ctx);
      void ensureRecorderWorklet(this.ctx);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  async listInputDevices(): Promise<AudioInputDevice[]> {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tempStream.getTracks().forEach((t) => t.stop());
    } catch {
      // 忽略权限拒绝，仍尝试枚举
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'audioinput')
      .map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Mic ${i + 1}`,
      }));
  }

  async startMic(deviceId?: string): Promise<void> {
    this.stopMic();
    const ctx = this.ensureContext();
    const workletReady = await ensureRecorderWorklet(ctx);

    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    this.micSource = ctx.createMediaStreamSource(this.micStream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.monitorGain = ctx.createGain();
    this.monitorGain.gain.value = this.monitorEnabled ? 1.0 : 0;

    this.dspHandle = createDspChain(ctx, this.activePreset);

    const silentGain = ctx.createGain();
    silentGain.gain.value = 0;

    const workletRec = workletReady
      ? createRecorderWorkletNode(ctx, (samples) => {
          if (this.isCalibrating) {
            this.calibratingChunks.push(samples);
          } else if (this.isRecording) {
            this.recordedChunks.push(this.noiseGate.process(samples, ctx.sampleRate));
          }
        })
      : null;

    if (workletRec) {
      this.recorderNode = workletRec;
    } else {
      const legacyNode = ctx.createScriptProcessor(2048, 1, 1);
      legacyNode.onaudioprocess = (e) => {
        if (this.isCalibrating) {
          this.calibratingChunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
        } else if (this.isRecording) {
          const raw = new Float32Array(e.inputBuffer.getChannelData(0));
          this.recordedChunks.push(this.noiseGate.process(raw, ctx.sampleRate));
        }
      };
      this.recorderNode = legacyNode;
    }

    this.micSource.connect(this.analyser);
    this.micSource.connect(this.recorderNode);
    this.recorderNode.connect(silentGain);
    silentGain.connect(ctx.destination);

    this.micSource.connect(this.dspHandle.input);
    this.dspHandle.output.connect(this.monitorGain);
    this.monitorGain.connect(ctx.destination);
  }

  stopMic(): void {
    this.recorderNode?.disconnect();
    this.micSource?.disconnect();
    this.analyser?.disconnect();
    this.monitorGain?.disconnect();
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.recorderNode = null;
    this.micSource = null;
    this.analyser = null;
    this.monitorGain = null;
    this.micStream = null;
    this.dspHandle = null;
  }

  registerCustomPresets(customs: DspPreset[]): void {
    this.presetRegistry = new Map(BUILTIN_PRESET_LIST.map((p) => [p.id, p]));
    for (const c of customs) {
      this.presetRegistry.set(c.id, c);
    }
  }

  getPresetById(id: DspPresetId): DspPreset {
    return this.presetRegistry.get(id) ?? BUILTIN_DSP_PRESETS.bright_folk;
  }

  setPreset(id: DspPresetId): void {
    this.applyCustomDspParams(this.getPresetById(id));
  }

  applyCustomDspParams(p: DspPreset): void {
    this.activePreset = { ...p };
    if (this.dspHandle && this.ctx) {
      this.dspHandle.applyParams(this.ctx, p);
    }
  }

  setMonitorEnabled(enabled: boolean): void {
    this.monitorEnabled = enabled;
    if (this.monitorGain) {
      this.monitorGain.gain.value = enabled ? 1.0 : 0;
    }
  }

  setHarmonicaConfig(
    type: HarmonicaType,
    key: HarmonicaKey,
    tuning: DiatonicTuning = 'richter',
    chromaticTuning: ChromaticTuning = 'solo',
    customHolesC?: HarmonicaHole[]
  ): void {
    this.harmonicaType = type;
    this.harmonicaKey = key;
    this.diatonicTuning = tuning;
    this.chromaticTuning = chromaticTuning;
    this.customTuningHolesC = customHolesC;
    this.smoothedPitchHz = null;
  }

  setA4Reference(hz: number): void {
    this.a4Hz = hz;
  }

  setOnBeatCallback(cb: ((beat: number) => void) | null): void {
    this.metronome.setOnBeatCallback(cb);
  }

  setOnPlaybackEndedCallback(cb: (() => void) | null): void {
    this.onPlaybackEndedCallback = cb;
  }

  setMetronomeConfig(opts: {
    enabled?: boolean;
    bpm?: number;
    beatsPerBar?: number;
    subdivision?: MetronomeSubdivision;
    sound?: MetronomeSound;
    volume?: number;
  }): void {
    this.metronome.configure(() => this.ensureContext(), opts);
  }

  setLatencyCompensationMs(ms: number): void {
    this.latencyCompensationMs = Math.max(-500, Math.min(500, Math.round(ms)));
  }

  setNoiseGateConfig(enabled: boolean, thresholdDb: number): void {
    this.noiseGate.configure(enabled, thresholdDb);
  }

  getLatencyCompensationMs(): number {
    return this.latencyCompensationMs;
  }

  startCountIn(
    opts: {
      bpm?: number;
      beatsPerBar?: number;
      sound?: MetronomeSound;
      volume?: number;
    },
    onBeat: (beatIndex: number, totalBeats: number) => void,
    onComplete: () => void
  ): () => void {
    return this.metronome.scheduleCountIn(() => this.ensureContext(), opts, onBeat, onComplete);
  }

  /**
   * 录音往返延迟一键校准：
   * 通过扬声器发出 3 次短促脉冲，同时麦克风采集回环信号，计算往返延迟中位数（ms）。
   */
  async measureLoopbackLatencyMs(): Promise<{
    ok: boolean;
    latencyMs?: number;
    reason?: 'no_mic' | 'no_signal';
  }> {
    if (!this.micStream || !this.ctx) {
      return { ok: false, reason: 'no_mic' };
    }
    const ctx = this.ctx;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    this.calibratingChunks = [];
    this.isCalibrating = true;
    const t0 = ctx.currentTime + 0.18;
    const clickOffsetsSec = [0, 0.42, 0.84];

    try {
      for (const dt of clickOffsetsSec) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1600, t0 + dt);
        gain.gain.setValueAtTime(0.001, t0 + dt);
        gain.gain.linearRampToValueAtTime(0.65, t0 + dt + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + dt + 0.018);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0 + dt);
        osc.stop(t0 + dt + 0.02);
      }

      await new Promise((resolve) => window.setTimeout(resolve, 1450));
    } finally {
      this.isCalibrating = false;
    }

    const totalLen = this.calibratingChunks.reduce((acc, c) => acc + c.length, 0);
    if (totalLen === 0) return { ok: false, reason: 'no_signal' };

    const merged = new Float32Array(totalLen);
    let pos = 0;
    for (const chunk of this.calibratingChunks) {
      merged.set(chunk, pos);
      pos += chunk.length;
    }
    this.calibratingChunks = [];

    const sr = ctx.sampleRate;
    const noiseSamples = Math.min(merged.length, Math.floor(sr * 0.12));
    let noisePeak = 0;
    for (let i = 0; i < noiseSamples; i++) {
      const v = Math.abs(merged[i]);
      if (v > noisePeak) noisePeak = v;
    }
    const threshold = Math.max(noisePeak * 3.5, 0.03);

    const measuredList: number[] = [];
    const searchLen = Math.floor(sr * 0.32);
    for (const dt of clickOffsetsSec) {
      const emitIdx = Math.floor((0.18 + dt) * sr);
      const endIdx = Math.min(merged.length, emitIdx + searchLen);
      for (let i = emitIdx; i < endIdx; i++) {
        if (Math.abs(merged[i]) >= threshold) {
          const delayMs = ((i - emitIdx) / sr) * 1000;
          if (delayMs >= 4 && delayMs <= 300) {
            measuredList.push(delayMs);
          }
          break;
        }
      }
    }

    if (measuredList.length === 0) {
      return { ok: false, reason: 'no_signal' };
    }
    measuredList.sort((a, b) => a - b);
    const median = Math.round(measuredList[Math.floor(measuredList.length / 2)]);
    this.setLatencyCompensationMs(median);
    return { ok: true, latencyMs: median };
  }

  setBackingVolume(vol: number): void {
    this.backingVolume = vol;
    if (this.backingGain) this.backingGain.gain.value = vol;
  }

  setTempoAndPitch(tempo: number, semitones: number): void {
    if (this.isPlaying && this.ctx) {
      const elapsed = (this.ctx.currentTime - this.playStartCtxTime) * this.tempoRate;
      this.playOffsetSec += elapsed;
      this.playStartCtxTime = this.ctx.currentTime;
    }
    this.tempoRate = tempo;
    this.pitchSemitones = semitones;
    if (this.backingSource) {
      this.backingSource.playbackRate.value = tempo;
      if (this.backingPitchNode) {
        this.backingSource.detune.value = 0;
        updatePitchShifterParams(this.backingPitchNode, tempo, semitones);
      } else {
        this.backingSource.detune.value = semitones * 100;
      }
    }
  }

  setLoop(enabled: boolean, aSec: number, bSec: number): void {
    this.loopEnabled = enabled;
    this.loopA = aSec;
    this.loopB = bSec;
    if (this.backingSource) {
      this.backingSource.loop = enabled && bSec > aSec + 0.2;
      this.backingSource.loopStart = aSec;
      this.backingSource.loopEnd = bSec;
    }
  }

  async loadBackingTrack(name: string, arrayBuffer: ArrayBuffer): Promise<BackingTrackInfo> {
    this.stopPlayback();
    const ctx = this.ensureContext();
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    this.backingTrackName = name;
    this.backingBuffer = decoded;
    this.playOffsetSec = 0;
    this.loopA = 0;
    this.loopB = decoded.duration;
    return {
      name,
      durationSec: decoded.duration,
      sampleRate: decoded.sampleRate,
      peaks: computeWaveformPeaks(decoded, 220),
    };
  }

  private getAudibleTracks(): InternalHarpTrack[] {
    const anySolo = this.tracks.some((t) => t.solo);
    return this.tracks.filter((t) => (anySolo ? t.solo : !t.muted));
  }

  startPlayback(fromSec?: number, includeTracks = false): void {
    const ctx = this.ensureContext();
    this.stopPlayback(false);

    const startOffset = fromSec ?? this.playOffsetSec;
    this.playOffsetSec = startOffset;
    this.playStartCtxTime = ctx.currentTime;
    this.isPlaying = true;

    let remainingNonLoopSources = 0;
    const handleSourceEnded = () => {
      remainingNonLoopSources = Math.max(0, remainingNonLoopSources - 1);
      if (this.isPlaying && remainingNonLoopSources === 0 && !this.loopEnabled) {
        this.isPlaying = false;
        this.playOffsetSec = 0;
        this.onPlaybackEndedCallback?.();
      }
    };

    if (this.backingBuffer && this.backingGain) {
      const src = ctx.createBufferSource();
      src.buffer = this.backingBuffer;
      src.playbackRate.value = this.tempoRate;
      const pitchNode = createPitchShifterNode(ctx, this.tempoRate, this.pitchSemitones);
      if (pitchNode) {
        src.detune.value = 0;
        src.connect(pitchNode);
        pitchNode.connect(this.backingGain);
        this.backingPitchNode = pitchNode;
      } else {
        src.detune.value = this.pitchSemitones * 100;
        src.connect(this.backingGain);
      }
      if (this.loopEnabled && this.loopB > this.loopA + 0.2) {
        src.loop = true;
        src.loopStart = this.loopA;
        src.loopEnd = this.loopB;
      } else {
        remainingNonLoopSources++;
        src.onended = handleSourceEnded;
      }
      src.start(0, Math.min(startOffset, Math.max(0, this.backingBuffer.duration - 0.05)));
      this.backingSource = src;
    }

    if (includeTracks) {
      const audible = this.getAudibleTracks();
      for (const track of audible) {
        const trackOffsetSec = (track.offsetMs ?? 0) / 1000;
        const relStart = trackOffsetSec - startOffset;
        const whenOffset = relStart >= 0 ? relStart : 0;
        const bufOffset = relStart < 0 ? -relStart : 0;
        if (bufOffset >= track.buffer.duration) continue;

        const tSrc = ctx.createBufferSource();
        tSrc.buffer = track.buffer;
        const dsp = createDspChain(ctx, this.getPresetById(track.presetId));
        const tGain = ctx.createGain();
        const startAt = ctx.currentTime + whenOffset;
        const playDur = track.buffer.duration - bufOffset;
        applyTrackFadeEnvelope(
          tGain.gain,
          startAt,
          track.volume,
          playDur,
          track.fadeInMs ?? 0,
          track.fadeOutMs ?? 0
        );
        tSrc.connect(dsp.input);
        dsp.output.connect(tGain);
        tGain.connect(ctx.destination);
        remainingNonLoopSources++;
        tSrc.onended = handleSourceEnded;
        tSrc.start(startAt, bufOffset);
        this.activeTrackSources.push(tSrc);
      }
    }

    if (remainingNonLoopSources === 0 && !this.loopEnabled) {
      this.isPlaying = false;
      this.onPlaybackEndedCallback?.();
    }
  }

  stopPlayback(resetOffset = true): void {
    if (this.isPlaying && this.ctx) {
      const elapsed = (this.ctx.currentTime - this.playStartCtxTime) * this.tempoRate;
      this.playOffsetSec = resetOffset ? 0 : this.playOffsetSec + elapsed;
    }
    this.isPlaying = false;
    if (this.backingSource) {
      this.backingSource.onended = null;
      try {
        this.backingSource.stop();
      } catch {
        // ignore
      }
      this.backingSource.disconnect();
      this.backingSource = null;
    }
    this.backingPitchNode?.disconnect();
    this.backingPitchNode = null;

    for (const s of this.activeTrackSources) {
      s.onended = null;
      try {
        s.stop();
      } catch {
        // ignore
      }
      s.disconnect();
    }
    this.activeTrackSources = [];
  }

  getCurrentPlayTimeSec(): number {
    if (!this.isPlaying || !this.ctx) return this.playOffsetSec;
    const elapsed = (this.ctx.currentTime - this.playStartCtxTime) * this.tempoRate;
    let pos = this.playOffsetSec + elapsed;
    if (this.loopEnabled && this.loopB > this.loopA + 0.2 && pos >= this.loopB) {
      const span = this.loopB - this.loopA;
      pos = this.loopA + ((pos - this.loopA) % span);
    }
    return pos;
  }

  startRecording(withPlayAlong: boolean): void {
    this.ensureContext();
    this.recordedChunks = [];
    this.noiseGate.reset();
    this.recordingWithPlayAlong = withPlayAlong;
    this.isRecording = true;
    if (withPlayAlong && (this.backingBuffer || this.tracks.length > 0)) {
      this.startPlayback(0, true);
    }
  }

  stopRecording(): HarpTrackMeta | null {
    this.isRecording = false;
    this.stopPlayback(true);
    const ctx = this.ensureContext();

    const totalLen = this.recordedChunks.reduce((acc, c) => acc + c.length, 0);
    if (totalLen === 0) return null;

    const merged = new Float32Array(totalLen);
    let offset = 0;
    for (const chunk of this.recordedChunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const buf = ctx.createBuffer(1, totalLen, ctx.sampleRate);
    buf.copyToChannel(merged, 0);

    const trackNum = this.trackSeq++;
    const autoOffsetMs =
      this.recordingWithPlayAlong && this.latencyCompensationMs !== 0
        ? -this.latencyCompensationMs
        : 0;
    const newTrack: InternalHarpTrack = {
      id: `track-${Date.now()}-${trackNum}`,
      name: `Track ${trackNum}`,
      presetId: this.activePreset.id,
      volume: 1.0,
      muted: false,
      solo: false,
      offsetMs: autoOffsetMs,
      fadeInMs: 15,
      fadeOutMs: 30,
      durationSec: buf.duration,
      peaks: computeWaveformPeaks(buf, 80),
      buffer: buf,
    };
    this.tracks.push(newTrack);
    return this.toMeta(newTrack);
  }

  private toMeta(t: InternalHarpTrack): HarpTrackMeta {
    return {
      id: t.id,
      name: t.name,
      presetId: t.presetId,
      volume: t.volume,
      muted: t.muted,
      solo: t.solo,
      offsetMs: t.offsetMs,
      fadeInMs: t.fadeInMs,
      fadeOutMs: t.fadeOutMs,
      durationSec: t.durationSec,
      peaks: t.peaks,
    };
  }

  getTracks(): HarpTrackMeta[] {
    return this.tracks.map((t) => this.toMeta(t));
  }

  async importTrackFromFile(name: string, arrayBuffer: ArrayBuffer): Promise<HarpTrackMeta> {
    const ctx = this.ensureContext();
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const trackNum = this.trackSeq++;
    const cleanName = name.replace(/\.[^.]+$/, '') || `Track ${trackNum}`;
    const newTrack: InternalHarpTrack = {
      id: `track-${Date.now()}-${trackNum}`,
      name: cleanName,
      presetId: 'dry',
      volume: 1.0,
      muted: false,
      solo: false,
      offsetMs: 0,
      fadeInMs: 0,
      fadeOutMs: 0,
      durationSec: decoded.duration,
      peaks: computeWaveformPeaks(decoded, 80),
      buffer: decoded,
    };
    this.tracks.push(newTrack);
    return this.toMeta(newTrack);
  }

  updateTrack(
    id: string,
    patch: Partial<
      Pick<
        HarpTrackMeta,
        'name' | 'presetId' | 'volume' | 'muted' | 'solo' | 'offsetMs' | 'fadeInMs' | 'fadeOutMs'
      >
    >
  ): HarpTrackMeta[] {
    const target = this.tracks.find((t) => t.id === id);
    if (target) Object.assign(target, patch);
    return this.getTracks();
  }

  deleteTrack(id: string): HarpTrackMeta[] {
    this.tracks = this.tracks.filter((t) => t.id !== id);
    return this.getTracks();
  }

  pollMeterAndPitch(): MeterAndPitchFrame {
    if (!this.analyser || !this.ctx) {
      return {
        rms: 0,
        peak: 0,
        clipping: false,
        pitchHz: null,
        confidence: 0,
        match: null,
        tuner: null,
      };
    }
    const buf = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buf);

    let sumSq = 0;
    let peak = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = Math.abs(buf[i]);
      sumSq += v * v;
      if (v > peak) peak = v;
    }
    const rms = Math.sqrt(sumSq / buf.length);
    const clipping = peak >= 0.98;

    const yin = detectPitchYin(buf, this.ctx.sampleRate);
    if (!yin || yin.confidence < 0.78) {
      this.smoothedPitchHz = null;
      return {
        rms,
        peak,
        clipping,
        pitchHz: null,
        confidence: 0,
        match: null,
        tuner: null,
      };
    }

    const alpha = this.harmonicaType === 'tremolo24' ? 0.35 : 0.65;
    this.smoothedPitchHz =
      this.smoothedPitchHz === null
        ? yin.frequency
        : this.smoothedPitchHz * (1 - alpha) + yin.frequency * alpha;

    const match = matchFrequencyToHarmonica(
      this.smoothedPitchHz,
      this.harmonicaType,
      this.harmonicaKey,
      this.a4Hz,
      this.diatonicTuning,
      this.chromaticTuning,
      this.customTuningHolesC
    );
    const tuner = detectChromaticNote(this.smoothedPitchHz, this.a4Hz);

    return {
      rms,
      peak,
      clipping,
      pitchHz: this.smoothedPitchHz,
      confidence: yin.confidence,
      match,
      tuner,
    };
  }

  private async renderMixToAudioBuffer(onlyTracks = false): Promise<AudioBuffer | null> {
    const audible = this.getAudibleTracks();
    if (onlyTracks && audible.length === 0) return null;
    if (!onlyTracks && audible.length === 0 && !this.backingBuffer) return null;

    const sampleRate = audible[0]?.buffer.sampleRate ?? this.backingBuffer?.sampleRate ?? 48000;
    const backingDur =
      !onlyTracks && this.backingBuffer ? this.backingBuffer.duration / this.tempoRate : 0;
    const maxTrackDur = audible.reduce(
      (m, t) => Math.max(m, Math.max(0, t.buffer.duration + (t.offsetMs ?? 0) / 1000)),
      0
    );
    const totalDur = Math.max(backingDur, maxTrackDur, 0.5);
    const totalFrames = Math.ceil(totalDur * sampleRate);

    const offline = new OfflineAudioContext(2, totalFrames, sampleRate);
    await ensurePitchShifterWorklet(offline);

    if (!onlyTracks && this.backingBuffer) {
      const bSrc = offline.createBufferSource();
      bSrc.buffer = this.backingBuffer;
      bSrc.playbackRate.value = this.tempoRate;
      const bGain = offline.createGain();
      bGain.gain.value = this.backingVolume;
      const pitchNode = createPitchShifterNode(offline, this.tempoRate, this.pitchSemitones);
      if (pitchNode) {
        bSrc.detune.value = 0;
        bSrc.connect(pitchNode);
        pitchNode.connect(bGain);
      } else {
        bSrc.detune.value = this.pitchSemitones * 100;
        bSrc.connect(bGain);
      }
      bGain.connect(offline.destination);
      bSrc.start(0);
    }

    for (const track of audible) {
      const trackOffsetSec = (track.offsetMs ?? 0) / 1000;
      const whenSec = trackOffsetSec >= 0 ? trackOffsetSec : 0;
      const bufOffset = trackOffsetSec < 0 ? -trackOffsetSec : 0;
      if (bufOffset >= track.buffer.duration) continue;

      const rSrc = offline.createBufferSource();
      rSrc.buffer = track.buffer;
      const dsp = createDspChain(offline, this.getPresetById(track.presetId));
      const rGain = offline.createGain();
      const playDur = track.buffer.duration - bufOffset;
      applyTrackFadeEnvelope(
        rGain.gain,
        whenSec,
        track.volume,
        playDur,
        track.fadeInMs ?? 0,
        track.fadeOutMs ?? 0
      );
      rSrc.connect(dsp.input);
      dsp.output.connect(rGain);
      rGain.connect(offline.destination);
      rSrc.start(whenSec, bufOffset);
    }

    return offline.startRendering();
  }

  async exportMixWav(): Promise<Uint8Array | null> {
    const rendered = await this.renderMixToAudioBuffer();
    if (!rendered) return null;
    return encodeWav(
      [rendered.getChannelData(0), rendered.getChannelData(1)],
      rendered.sampleRate
    );
  }

  async exportMixMp3(kbps = 320): Promise<Uint8Array | null> {
    const rendered = await this.renderMixToAudioBuffer();
    if (!rendered) return null;
    return encodeMp3(
      [rendered.getChannelData(0), rendered.getChannelData(1)],
      rendered.sampleRate,
      kbps
    );
  }

  async renderMixAndHarpBuffers(): Promise<{
    mixBuffer: AudioBuffer;
    harpBuffer: AudioBuffer | null;
  } | null> {
    const mixBuffer = await this.renderMixToAudioBuffer(false);
    if (!mixBuffer) return null;
    const harpBuffer = await this.renderMixToAudioBuffer(true);
    return { mixBuffer, harpBuffer };
  }

  getAudioContextForExport(): AudioContext {
    return this.ensureContext();
  }

  getHarmonicaConfig(): {
    harmonicaType: HarmonicaType;
    harmonicaKey: HarmonicaKey;
    diatonicTuning: DiatonicTuning;
    chromaticTuning: ChromaticTuning;
    customHolesC?: HarmonicaHole[];
    a4Hz: number;
  } {
    return {
      harmonicaType: this.harmonicaType,
      harmonicaKey: this.harmonicaKey,
      diatonicTuning: this.diatonicTuning,
      chromaticTuning: this.chromaticTuning,
      customHolesC: this.customTuningHolesC,
      a4Hz: this.a4Hz,
    };
  }

  exportProjectData(customPresets: DspPreset[]): HarpProjectFile {
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      harmonicaType: this.harmonicaType,
      harmonicaKey: this.harmonicaKey,
      a4Hz: this.a4Hz,
      backingTrack: this.backingBuffer
        ? {
            name: this.backingTrackName || 'backing.wav',
            wavBase64: audioBufferToWavBase64(this.backingBuffer),
          }
        : null,
      backingParams: {
        volume: this.backingVolume,
        tempoRate: this.tempoRate,
        pitchSemitones: this.pitchSemitones,
        loopEnabled: this.loopEnabled,
        loopA: this.loopA,
        loopB: this.loopB,
      },
      tracks: this.tracks.map((t) => ({
        id: t.id,
        name: t.name,
        presetId: t.presetId,
        volume: t.volume,
        muted: t.muted,
        solo: t.solo,
        offsetMs: t.offsetMs,
        fadeInMs: t.fadeInMs,
        fadeOutMs: t.fadeOutMs,
        durationSec: t.durationSec,
        wavBase64: audioBufferToWavBase64(t.buffer),
      })),
      customPresets,
    };
  }

  async loadProjectData(project: HarpProjectFile): Promise<{
    backingInfo: BackingTrackInfo | null;
    tracks: HarpTrackMeta[];
  }> {
    this.stopPlayback(true);
    const ctx = this.ensureContext();

    this.harmonicaType = project.harmonicaType;
    this.harmonicaKey = project.harmonicaKey;
    this.a4Hz = project.a4Hz || 440;

    let backingInfo: BackingTrackInfo | null = null;
    if (project.backingTrack) {
      const ab = base64ToArrayBuffer(project.backingTrack.wavBase64);
      const decoded = await ctx.decodeAudioData(ab);
      this.backingTrackName = project.backingTrack.name;
      this.backingBuffer = decoded;
      backingInfo = {
        name: project.backingTrack.name,
        durationSec: decoded.duration,
        sampleRate: decoded.sampleRate,
        peaks: computeWaveformPeaks(decoded, 220),
      };
    } else {
      this.backingTrackName = '';
      this.backingBuffer = null;
    }

    const bp = project.backingParams;
    this.setBackingVolume(bp.volume);
    this.setTempoAndPitch(bp.tempoRate, bp.pitchSemitones);
    this.setLoop(bp.loopEnabled, bp.loopA, bp.loopB);

    const restoredTracks: InternalHarpTrack[] = [];
    for (const st of project.tracks) {
      const ab = base64ToArrayBuffer(st.wavBase64);
      const decoded = await ctx.decodeAudioData(ab);
      restoredTracks.push({
        id: st.id,
        name: st.name,
        presetId: st.presetId,
        volume: st.volume,
        muted: st.muted,
        solo: st.solo,
        offsetMs: st.offsetMs ?? 0,
        fadeInMs: st.fadeInMs ?? 0,
        fadeOutMs: st.fadeOutMs ?? 0,
        durationSec: decoded.duration,
        peaks: computeWaveformPeaks(decoded, 80),
        buffer: decoded,
      });
    }
    this.tracks = restoredTracks;
    this.trackSeq = restoredTracks.length + 1;

    return { backingInfo, tracks: this.getTracks() };
  }
}
