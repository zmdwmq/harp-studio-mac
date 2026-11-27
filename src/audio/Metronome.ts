/**
 * 高精度 Web Audio 前瞻节拍器（独立模块，带 UI 定时器清理）
 */

export type MetronomeSound = 'electronic' | 'woodblock' | 'drumkit' | 'cowbell';
export type MetronomeSubdivision = 'quarter' | 'eighth' | 'triplet' | 'sixteenth' | 'swing';

export class Metronome {
  private timerId: number | null = null;
  private uiTimeoutIds: Set<number> = new Set();
  private enabled = false;
  private bpm = 90;
  private beatsPerBar = 4;
  private subdivision: MetronomeSubdivision = 'quarter';
  private sound: MetronomeSound = 'woodblock';
  private volume = 0.5;
  private nextNoteTime = 0;
  private currentBeat = 0;
  private subStep = 0;
  private noiseBuffer: AudioBuffer | null = null;
  private onBeatCallback: ((beat: number) => void) | null = null;

  setOnBeatCallback(cb: ((beat: number) => void) | null): void {
    this.onBeatCallback = cb;
  }

  configure(
    getContext: () => AudioContext,
    opts: {
      enabled?: boolean;
      bpm?: number;
      beatsPerBar?: number;
      subdivision?: MetronomeSubdivision;
      sound?: MetronomeSound;
      volume?: number;
    }
  ): void {
    if (opts.bpm !== undefined) this.bpm = Math.max(40, Math.min(220, opts.bpm));
    if (opts.beatsPerBar !== undefined) {
      this.beatsPerBar = opts.beatsPerBar;
      this.currentBeat = 0;
      this.subStep = 0;
    }
    if (opts.subdivision !== undefined) {
      this.subdivision = opts.subdivision;
      this.subStep = 0;
    }
    if (opts.sound !== undefined) this.sound = opts.sound;
    if (opts.volume !== undefined) this.volume = opts.volume;
    if (opts.enabled !== undefined && opts.enabled !== this.enabled) {
      this.enabled = opts.enabled;
      if (this.enabled) {
        this.start(getContext());
      } else {
        this.stop();
      }
    }
  }

  private getSubStepDurationsSec(secPerBeat: number): number[] {
    switch (this.subdivision) {
      case 'eighth':
        return [secPerBeat / 2, secPerBeat / 2];
      case 'triplet':
        return [secPerBeat / 3, secPerBeat / 3, secPerBeat / 3];
      case 'sixteenth':
        return [secPerBeat / 4, secPerBeat / 4, secPerBeat / 4, secPerBeat / 4];
      case 'swing':
        return [(secPerBeat * 2) / 3, secPerBeat / 3];
      default:
        return [secPerBeat];
    }
  }

  private getBeatStrength(beatIdx: number, subIdx: number): 'accent' | 'secondary' | 'normal' | 'sub' {
    if (subIdx > 0) return 'sub';
    if (beatIdx === 0) return 'accent';
    if (this.beatsPerBar === 6 && beatIdx === 3) return 'secondary';
    if (this.beatsPerBar === 12 && (beatIdx === 3 || beatIdx === 6 || beatIdx === 9)) {
      return 'secondary';
    }
    return 'normal';
  }

  private start(ctx: AudioContext): void {
    this.stop();
    this.enabled = true;
    this.currentBeat = 0;
    this.subStep = 0;
    this.nextNoteTime = ctx.currentTime + 0.04;

    this.timerId = window.setInterval(() => {
      if (!this.enabled) return;
      const scheduleAhead = 0.1;
      while (this.nextNoteTime < ctx.currentTime + scheduleAhead) {
        const beatIndex = this.currentBeat;
        const subIndex = this.subStep;
        const strength = this.getBeatStrength(beatIndex, subIndex);
        this.scheduleClick(ctx, this.nextNoteTime, strength);

        if (subIndex === 0) {
          const delayMs = Math.max(0, (this.nextNoteTime - ctx.currentTime) * 1000);
          const tid = window.setTimeout(() => {
            this.uiTimeoutIds.delete(tid);
            if (this.enabled) this.onBeatCallback?.(beatIndex);
          }, delayMs);
          this.uiTimeoutIds.add(tid);
        }

        const secPerBeat = 60 / this.bpm;
        const stepDurations = this.getSubStepDurationsSec(secPerBeat);
        this.nextNoteTime += stepDurations[subIndex] ?? secPerBeat;

        this.subStep++;
        if (this.subStep >= stepDurations.length) {
          this.subStep = 0;
          this.currentBeat = (this.currentBeat + 1) % this.beatsPerBar;
        }
      }
    }, 25);
  }

  stop(): void {
    this.enabled = false;
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    for (const tid of this.uiTimeoutIds) {
      window.clearTimeout(tid);
    }
    this.uiTimeoutIds.clear();
    this.onBeatCallback?.(-1);
  }

  /** 播放一小节预备拍（Count-in），完成后触发 onComplete，返回取消函数 */
  scheduleCountIn(
    getContext: () => AudioContext,
    opts: {
      bpm?: number;
      beatsPerBar?: number;
      sound?: MetronomeSound;
      volume?: number;
    },
    onBeat: (beatIndex: number, totalBeats: number) => void,
    onComplete: () => void
  ): () => void {
    const ctx = getContext();
    const bpm = Math.max(40, Math.min(220, opts.bpm ?? this.bpm));
    const beats = Math.max(1, opts.beatsPerBar ?? this.beatsPerBar);
    if (opts.sound !== undefined) this.sound = opts.sound;
    if (opts.volume !== undefined) this.volume = opts.volume;

    const secPerBeat = 60 / bpm;
    const t0 = ctx.currentTime + 0.04;
    const timeouts: number[] = [];
    let cancelled = false;

    for (let i = 0; i < beats; i++) {
      const beatTime = t0 + i * secPerBeat;
      const strength = this.getBeatStrength(i, 0);
      this.scheduleClick(ctx, beatTime, strength);
      const delayMs = Math.max(0, (beatTime - ctx.currentTime) * 1000);
      timeouts.push(
        window.setTimeout(() => {
          if (!cancelled) onBeat(i, beats);
        }, delayMs)
      );
    }

    const totalDelayMs = Math.max(0, (t0 + beats * secPerBeat - ctx.currentTime) * 1000);
    timeouts.push(
      window.setTimeout(() => {
        if (!cancelled) onComplete();
      }, totalDelayMs)
    );

    return () => {
      cancelled = true;
      for (const tid of timeouts) window.clearTimeout(tid);
    };
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer || this.noiseBuffer.sampleRate !== ctx.sampleRate) {
      const len = Math.floor(ctx.sampleRate * 0.1);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        ch[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }
    return this.noiseBuffer;
  }

  private scheduleClick(
    ctx: AudioContext,
    time: number,
    strength: 'accent' | 'secondary' | 'normal' | 'sub'
  ): void {
    const amp =
      this.volume *
      (strength === 'accent'
        ? 0.75
        : strength === 'secondary'
          ? 0.55
          : strength === 'normal'
            ? 0.42
            : 0.2);
    if (amp <= 0.001) return;

    if (this.sound === 'woodblock') {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const freq =
        strength === 'accent' ? 980 : strength === 'secondary' ? 840 : strength === 'normal' ? 720 : 580;
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.75, time + 0.03);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 1.2, time);
      filter.Q.value = 3.5;
      gain.gain.setValueAtTime(amp * 1.1, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.055);
      return;
    }

    if (this.sound === 'drumkit') {
      if (strength === 'accent' || strength === 'secondary') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(strength === 'accent' ? 160 : 210, time);
        osc.frequency.exponentialRampToValueAtTime(55, time + 0.06);
        gain.gain.setValueAtTime(amp * 1.1, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.075);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.08);
      } else {
        const noise = ctx.createBufferSource();
        noise.buffer = this.getNoiseBuffer(ctx);
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(6500, time);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(amp * 0.75, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
        noise.connect(hp);
        hp.connect(gain);
        gain.connect(ctx.destination);
        noise.start(time);
        noise.stop(time + 0.05);
      }
      return;
    }

    if (this.sound === 'cowbell') {
      const f1 = strength === 'accent' ? 587 : strength === 'sub' ? 480 : 540;
      const f2 = f1 * 1.48;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(f2, time);
      bp.Q.value = 2.5;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(amp * 0.65, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      o1.type = 'square';
      o2.type = 'square';
      o1.frequency.setValueAtTime(f1, time);
      o2.frequency.setValueAtTime(f2, time);
      o1.connect(bp);
      o2.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      o1.start(time);
      o2.start(time);
      o1.stop(time + 0.075);
      o2.stop(time + 0.075);
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const freq =
      strength === 'accent' ? 1200 : strength === 'secondary' ? 960 : strength === 'normal' ? 820 : 620;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(amp, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.045);
  }
}
