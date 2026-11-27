import {
  ChromaticTuning,
  DiatonicTuning,
  HarmonicaHole,
  HarmonicaKey,
  HarmonicaType,
  PitchMatchResult,
  getHarmonicaLayout,
  matchFrequencyToHarmonica,
  midiToNoteName,
} from '../core/harmonicaMap';
import { detectPitchYin } from '../core/pitchYin';

export interface VideoThemeColors {
  bg: string;
  panel: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
}

export interface VideoExportOptions {
  ctx: AudioContext;
  mixBuffer: AudioBuffer;
  harpBuffer: AudioBuffer | null;
  harmonicaType: HarmonicaType;
  harmonicaKey: HarmonicaKey;
  diatonicTuning: DiatonicTuning;
  chromaticTuning: ChromaticTuning;
  customHolesC?: HarmonicaHole[];
  a4Hz: number;
  title: string;
  subtitle: string;
  versionText: string;
  themeColors?: VideoThemeColors;
  labels?: {
    playingText: string;
    holePrefix: string;
  };
  onProgress?: (progress: number, elapsedSec: number, totalSec: number) => void;
}

function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function drawRoundedRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + radius, y);
  g.arcTo(x + w, y, x + w, y + h, radius);
  g.arcTo(x + w, y + h, x, y + h, radius);
  g.arcTo(x, y + h, x, y, radius);
  g.arcTo(x, y, x + w, y, radius);
  g.closePath();
}

function pickSupportedMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  for (const mime of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return 'video/webm';
}

/**
 * 将混音音频与实时口琴孔位舞台动画合成为 720p WebM 视频。
 */
export function startVideoExport(options: VideoExportOptions): {
  promise: Promise<Blob>;
  cancel: () => void;
} {
  const {
    ctx,
    mixBuffer,
    harpBuffer,
    harmonicaType,
    harmonicaKey,
    diatonicTuning,
    chromaticTuning,
    customHolesC,
    a4Hz,
    title,
    subtitle,
    versionText,
    themeColors,
    labels,
    onProgress,
  } = options;

  const palette: VideoThemeColors = themeColors ?? {
    bg: '#090d16',
    panel: '#111827',
    card: '#0c0e14',
    border: '#334155',
    text: '#f8fafc',
    muted: '#94a3b8',
    accent: '#38bdf8',
  };
  const playingText = labels?.playingText ?? '♪ Playing...';
  const holePrefix = labels?.holePrefix ?? 'Hole';

  const width = 1280;
  const height = 720;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d')!;

  const holes = getHarmonicaLayout(harmonicaType, harmonicaKey, diatonicTuning, chromaticTuning, customHolesC);
  const analysisBuffer = harpBuffer ?? mixBuffer;
  const analysisSamples = analysisBuffer.getChannelData(0);
  const mixSamples = mixBuffer.getChannelData(0);
  const analysisSr = analysisBuffer.sampleRate;
  const mixSr = mixBuffer.sampleRate;
  const durationSec = mixBuffer.duration;

  const mimeType = pickSupportedMimeType();
  const canvasStream = canvas.captureStream(30);
  const audioDest = ctx.createMediaStreamDestination();
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks(),
  ]);

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 3_500_000,
    audioBitsPerSecond: 192_000,
  });

  const chunks: Blob[] = [];
  let cancelled = false;
  let rafId = 0;
  let smoothedPitch: number | null = null;

  const src = ctx.createBufferSource();
  src.buffer = mixBuffer;
  src.connect(audioDest);

  const cleanup = () => {
    if (rafId) cancelAnimationFrame(rafId);
    try {
      src.stop();
    } catch {
      // ignore
    }
    src.disconnect();
    audioDest.disconnect();
    combinedStream.getTracks().forEach((t) => t.stop());
  };

  let rejectFn: ((err: Error) => void) | null = null;

  const promise = new Promise<Blob>((resolve, reject) => {
    rejectFn = reject;
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      cleanup();
      if (cancelled) {
        reject(new Error('EXPORT_CANCELLED'));
      } else {
        resolve(new Blob(chunks, { type: mimeType }));
      }
    };
    recorder.onerror = () => {
      cleanup();
      reject(new Error('MEDIA_RECORDER_ERROR'));
    };

    const startCtxTime = ctx.currentTime + 0.05;
    recorder.start(250);
    src.start(startCtxTime);

    const analysisWin = new Float32Array(2048);

    const drawFrame = () => {
      if (cancelled) return;
      const elapsed = Math.max(0, Math.min(durationSec, ctx.currentTime - startCtxTime));
      onProgress?.(Math.min(1, elapsed / Math.max(0.1, durationSec)), elapsed, durationSec);

      // 1. Pitch analysis on harp track (or mix) around elapsed
      let match: PitchMatchResult | null = null;
      const aCenter = Math.floor(elapsed * analysisSr);
      if (aCenter + 2048 < analysisSamples.length) {
        let rms = 0;
        for (let i = 0; i < 2048; i++) {
          const v = analysisSamples[aCenter + i];
          analysisWin[i] = v;
          rms += v * v;
        }
        rms = Math.sqrt(rms / 2048);
        if (rms > 0.012) {
          const yin = detectPitchYin(analysisWin, analysisSr);
          if (yin && yin.confidence >= 0.78) {
            smoothedPitch =
              smoothedPitch === null ? yin.frequency : smoothedPitch * 0.4 + yin.frequency * 0.6;
            match = matchFrequencyToHarmonica(
              smoothedPitch,
              harmonicaType,
              harmonicaKey,
              a4Hz,
              diatonicTuning,
              chromaticTuning,
              customHolesC
            );
          } else {
            smoothedPitch = null;
          }
        } else {
          smoothedPitch = null;
        }
      }

      // 2. Background
      const bg = g.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, palette.bg);
      bg.addColorStop(0.55, palette.panel);
      bg.addColorStop(1, palette.bg);
      g.fillStyle = bg;
      g.fillRect(0, 0, width, height);

      // Subtle decorative studio frame
      g.strokeStyle = palette.border;
      g.lineWidth = 2;
      drawRoundedRect(g, 28, 28, width - 56, height - 56, 24);
      g.stroke();

      // 3. Header Title & Subtitle
      g.fillStyle = palette.text;
      g.font = 'bold 38px "Segoe UI", system-ui, sans-serif';
      g.textAlign = 'left';
      g.fillText(title, 64, 94);

      g.fillStyle = palette.accent;
      g.font = '600 20px "Segoe UI", system-ui, sans-serif';
      g.fillText(subtitle, 64, 130);

      // Top-right badge
      g.fillStyle = 'rgba(15, 23, 42, 0.85)';
      drawRoundedRect(g, width - 250, 62, 186, 40, 20);
      g.fill();
      g.strokeStyle = 'rgba(244, 63, 94, 0.45)';
      g.stroke();
      g.fillStyle = '#f43f5e';
      g.beginPath();
      g.arc(width - 224, 82, 6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#e2e8f0';
      g.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
      g.textAlign = 'left';
      g.fillText('HARPSTUDIO', width - 208, 87);

      // 4. Spectrum / Waveform Bars (44 bars)
      const barCount = 44;
      const barAreaW = width - 160;
      const barStep = barAreaW / barCount;
      const mixStart = Math.floor(elapsed * mixSr);
      const samplesPerBar = 180;
      for (let b = 0; b < barCount; b++) {
        let peak = 0;
        const base = mixStart + b * samplesPerBar;
        for (let k = 0; k < samplesPerBar; k++) {
          const idx = base + k;
          if (idx >= 0 && idx < mixSamples.length) {
            const v = Math.abs(mixSamples[idx]);
            if (v > peak) peak = v;
          }
        }
        const barH = Math.max(8, Math.min(110, peak * 185));
        const bx = 80 + b * barStep + 4;
        const by = 225 - barH / 2;
        const barGrad = g.createLinearGradient(bx, by, bx, by + barH);
        barGrad.addColorStop(0, '#38bdf8');
        barGrad.addColorStop(1, '#818cf8');
        g.fillStyle = barGrad;
        drawRoundedRect(g, bx, by, Math.max(6, barStep - 10), barH, 4);
        g.fill();
      }

      // 5. Harmonica Hole Stage
      const stageX = 64;
      const stageY = 315;
      const stageW = width - 128;
      const stageH = 210;
      g.fillStyle = 'rgba(15, 23, 42, 0.8)';
      drawRoundedRect(g, stageX, stageY, stageW, stageH, 20);
      g.fill();
      g.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      g.lineWidth = 1.5;
      g.stroke();

      const holeCount = holes.length;
      const gap = holeCount > 16 ? 6 : 10;
      const cardW = (stageW - 48 - gap * (holeCount - 1)) / holeCount;
      const cardH = 148;
      const startX = stageX + 24;
      const cardY = stageY + 31;

      for (let i = 0; i < holeCount; i++) {
        const h = holes[i];
        const cx = startX + i * (cardW + gap);
        const isActive = match?.hole === h.hole;
        const isDraw =
          isActive &&
          (match?.action === 'draw' ||
            match?.action === 'draw_bend' ||
            match?.action === 'slide_draw' ||
            match?.action === 'overdraw');

        g.fillStyle = isActive
          ? isDraw
            ? 'rgba(245, 158, 11, 0.22)'
            : 'rgba(56, 189, 248, 0.22)'
          : 'rgba(12, 14, 20, 0.85)';
        drawRoundedRect(g, cx, cardY, cardW, cardH, 10);
        g.fill();
        g.strokeStyle = isActive
          ? isDraw
            ? '#f59e0b'
            : '#38bdf8'
          : 'rgba(51, 65, 85, 0.7)';
        g.lineWidth = isActive ? 2.5 : 1;
        g.stroke();

        // Blow note
        g.fillStyle = isActive && !isDraw ? '#7dd3fc' : '#94a3b8';
        g.font = `bold ${holeCount > 16 ? 12 : 15}px "Segoe UI", sans-serif`;
        g.textAlign = 'center';
        g.fillText(midiToNoteName(h.blowMidi), cx + cardW / 2, cardY + 34);

        // Hole box
        g.fillStyle = isActive ? (isDraw ? '#f59e0b' : '#38bdf8') : '#1e293b';
        drawRoundedRect(g, cx + cardW * 0.2, cardY + 54, cardW * 0.6, 36, 7);
        g.fill();
        g.fillStyle = isActive ? '#090d16' : '#e2e8f0';
        g.font = `bold ${holeCount > 16 ? 13 : 16}px monospace`;
        g.fillText(h.holeLabel, cx + cardW / 2, cardY + 78);

        // Draw note
        g.fillStyle = isActive && isDraw ? '#fcd34d' : '#cbd5e1';
        g.font = `bold ${holeCount > 16 ? 12 : 15}px "Segoe UI", sans-serif`;
        g.fillText(midiToNoteName(h.drawMidi), cx + cardW / 2, cardY + 124);
      }

      // 6. Active Note Readout + Progress Bar + Watermark
      g.textAlign = 'left';
      if (match) {
        const centsText = `${match.centsOffset >= 0 ? '+' : ''}${Math.round(match.centsOffset)}¢`;
        g.fillStyle = palette.accent;
        g.font = 'bold 26px "Segoe UI", sans-serif';
        g.fillText(`${holePrefix} ${match.holeLabel} · ${match.noteName} (${centsText})`, 64, 590);
      } else {
        g.fillStyle = palette.muted;
        g.font = '600 22px "Segoe UI", sans-serif';
        g.fillText(playingText, 64, 590);
      }

      // Timecode & Version Watermark
      g.textAlign = 'right';
      g.fillStyle = palette.text;
      g.font = 'bold 20px monospace';
      g.fillText(`${formatClock(elapsed)} / ${formatClock(durationSec)}`, width - 64, 590);

      // Progress track
      const barY = 616;
      const barW = width - 128;
      g.fillStyle = palette.card;
      drawRoundedRect(g, 64, barY, barW, 10, 5);
      g.fill();
      g.fillStyle = palette.accent;
      drawRoundedRect(g, 64, barY, Math.max(10, barW * (elapsed / Math.max(0.1, durationSec))), 10, 5);
      g.fill();

      g.textAlign = 'center';
      g.fillStyle = palette.muted;
      g.font = '500 14px "Segoe UI", sans-serif';
      g.fillText(`HarpStudio ${versionText} · Harmonica Recording Workstation`, width / 2, 662);

      if (elapsed >= durationSec) {
        if (recorder.state !== 'inactive') recorder.stop();
        return;
      }
      rafId = requestAnimationFrame(drawFrame);
    };

    src.onended = () => {
      if (!cancelled && recorder.state !== 'inactive') {
        onProgress?.(1, durationSec, durationSec);
        recorder.stop();
      }
    };

    rafId = requestAnimationFrame(drawFrame);
  });

  return {
    promise,
    cancel: () => {
      cancelled = true;
      if (recorder.state !== 'inactive') {
        recorder.stop();
      } else {
        cleanup();
        rejectFn?.(new Error('EXPORT_CANCELLED'));
      }
    },
  };
}
