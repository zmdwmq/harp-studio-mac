import React from 'react';
import { FolderOpen, Play, Pause, Square, Repeat, Calculator, Compass } from 'lucide-react';
import { BackingTrackInfo } from '../audio/AudioEngine';
import {
  HARMONICA_POSITIONS,
  HarmonicaKey,
  HarmonicaType,
  SONG_KEYS,
  calculateBackingTransposeSemitones,
} from '../core/harmonicaMap';

import { I18nDict } from '../core/i18n';

interface WaveformPanelProps {
  t: I18nDict;
  compact?: boolean;
  harpType: HarmonicaType;
  harpKey: HarmonicaKey;
  track: BackingTrackInfo | null;
  currentTimeSec: number;
  isPlaying: boolean;
  tempoRate: number;
  pitchSemitones: number;
  loopEnabled: boolean;
  loopA: number;
  loopB: number;
  onImportTrack: () => void;
  onTogglePlay: () => void;
  onStop: () => void;
  onSeek: (sec: number) => void;
  onTempoChange: (tempo: number) => void;
  onPitchChange: (semitones: number) => void;
  onSetLoopA: () => void;
  onSetLoopB: () => void;
  onToggleLoop: () => void;
  onOpenCircleOfFifths?: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const WaveformPanel: React.FC<WaveformPanelProps> = ({
  t,
  compact = false,
  harpType,
  harpKey,
  track,
  currentTimeSec,
  isPlaying,
  tempoRate,
  pitchSemitones,
  loopEnabled,
  loopA,
  loopB,
  onImportTrack,
  onTogglePlay,
  onStop,
  onSeek,
  onTempoChange,
  onPitchChange,
  onSetLoopA,
  onSetLoopB,
  onToggleLoop,
  onOpenCircleOfFifths,
}) => {
  const [songKeyIdx, setSongKeyIdx] = React.useState(0);
  const [harpPosition, setHarpPosition] = React.useState<number>(1);

  const applyKeyConversion = (nextSongIdx: number, nextPos: number) => {
    setSongKeyIdx(nextSongIdx);
    setHarpPosition(nextPos);
    const { semitones } = calculateBackingTransposeSemitones(nextSongIdx, harpKey, nextPos);
    onPitchChange(semitones);
  };

  const convPreview = calculateBackingTransposeSemitones(songKeyIdx, harpKey, harpPosition);

  const handleWaveClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!track) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * track.durationSec);
  };

  const progressPct = track && track.durationSec > 0 ? (currentTimeSec / track.durationSec) * 100 : 0;
  const loopAPct = track && track.durationSec > 0 ? (loopA / track.durationSec) * 100 : 0;
  const loopBPct = track && track.durationSec > 0 ? (loopB / track.durationSec) * 100 : 100;

  return (
    <section className="rounded-xl border border-[#283042] bg-[#141821] p-4 shadow-lg">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onImportTrack}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500/15 px-3 py-1.5 text-xs font-medium text-sky-300 border border-sky-500/30 hover:bg-sky-500/25 transition"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            {t.importBacking}
          </button>
          <span className="text-sm font-medium text-slate-200 truncate max-w-[260px]">
            {track ? track.name : t.noBacking}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
          <span>{formatTime(currentTimeSec)}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">{track ? formatTime(track.durationSec) : '00:00'}</span>
        </div>
      </div>

      {/* 波形显示区 */}
      <div
        onClick={handleWaveClick}
        className="relative mb-4 flex h-24 cursor-pointer items-center gap-[2px] overflow-hidden rounded-lg border border-[#283042] bg-[#0c0e14] px-2"
      >
        {track ? (
          <>
            {/* AB 循环区间高亮 */}
            {loopEnabled && loopB > loopA && (
              <div
                className="pointer-events-none absolute top-0 bottom-0 bg-emerald-500/10 border-x border-emerald-400/50"
                style={{ left: `${loopAPct}%`, width: `${Math.max(0, loopBPct - loopAPct)}%` }}
              />
            )}

            {track.peaks.map((peak, i) => {
              const barPct = (i / track.peaks.length) * 100;
              const passed = barPct <= progressPct;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    passed ? 'bg-sky-400' : 'bg-slate-600/60'
                  }`}
                  style={{ height: `${Math.max(8, peak * 86)}%` }}
                />
              );
            })}

            {/* 播放指针 */}
            <div
              className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_#fff]"
              style={{ left: `${progressPct}%` }}
            />
          </>
        ) : (
          <div className="flex w-full items-center justify-center text-xs text-slate-500">
            {t.noBackingHint}
          </div>
        )}
      </div>

      {/* 伴奏控制栏：播放 + AB循环 + 移调 + 变速 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            disabled={!track}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-40 transition"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isPlaying ? t.pause : t.playBacking}
          </button>
          <button
            onClick={onStop}
            disabled={!track}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition"
          >
            <Square className="h-3.5 w-3.5" />
            {t.stop}
          </button>

          {!compact && (
            <>
              <div className="mx-1 h-4 w-px bg-[#283042]" />

              <button
                onClick={onSetLoopA}
                disabled={!track}
                className="rounded bg-[#1b202c] px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              >
                {t.setA} ({formatTime(loopA)})
              </button>
              <button
                onClick={onSetLoopB}
                disabled={!track}
                className="rounded bg-[#1b202c] px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              >
                {t.setB} ({formatTime(loopB)})
              </button>
              <button
                onClick={onToggleLoop}
                disabled={!track}
                className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition disabled:opacity-40 ${
                  loopEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-[#1b202c] text-slate-400 hover:text-slate-200'
                }`}
              >
                <Repeat className="h-3 w-3" />
                {t.abLoop}
              </button>
            </>
          )}
        </div>

        {/* 移调与变速（高级模式显示） */}
        {!compact && (
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{t.pitchShift}</span>
              <input
                type="range"
                min={-12}
                max={12}
                step={1}
                value={pitchSemitones}
                onChange={(e) => onPitchChange(Number(e.target.value))}
                className="w-28"
              />
              <span className="w-14 font-mono text-xs text-sky-300">
                {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones} {t.semitoneUnit}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{t.tempoRate}</span>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={tempoRate}
                onChange={(e) => onTempoChange(Number(e.target.value))}
                className="w-28"
              />
              <span className="w-12 font-mono text-xs text-sky-300">{tempoRate.toFixed(2)}x</span>
            </div>
          </div>
        )}
      </div>

      {/* 初学者调性换算助手（高级模式） */}
      {!compact && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#283042] bg-[#0c0e14] px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Calculator className="h-3.5 w-3.5 text-sky-400" />
            <span className="text-slate-400">{t.keyConvTitle}</span>
            <select
              value={songKeyIdx}
              onChange={(e) => applyKeyConversion(Number(e.target.value), harpPosition)}
              className="rounded border border-[#283042] bg-[#141821] px-2 py-0.5 text-xs text-slate-200"
            >
              {SONG_KEYS.map((k) => (
                <option key={k.index} value={k.index}>
                  {k.name}
                </option>
              ))}
            </select>

            {harpType === 'diatonic10' && (
              <select
                value={harpPosition}
                onChange={(e) => applyKeyConversion(songKeyIdx, Number(e.target.value))}
                className="rounded border border-[#283042] bg-[#141821] px-2 py-0.5 text-xs text-slate-200"
              >
                {HARMONICA_POSITIONS.map((p) => (
                  <option key={p.pos} value={p.pos}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => applyKeyConversion(songKeyIdx, harpPosition)}
              className="rounded bg-sky-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-sky-300 border border-sky-500/30 hover:bg-sky-500/30 transition"
            >
              {t.matchHarpKey} {harpKey} {t.harpKeySuffix}
            </button>

            {harpType === 'diatonic10' && onOpenCircleOfFifths && (
              <button
                onClick={onOpenCircleOfFifths}
                className="inline-flex items-center gap-1 rounded border border-[#283042] bg-[#141821] px-2 py-0.5 text-[11px] text-slate-300 hover:border-sky-400 hover:text-sky-300 transition"
              >
                <Compass className="h-3 w-3" />
                5th
              </button>
            )}
          </div>

          <span className="font-mono text-[11px] text-slate-400">
            {t.suggestedShift}{' '}
            <strong className="text-emerald-400">
              {convPreview.semitones > 0 ? `+${convPreview.semitones}` : convPreview.semitones} {t.semitoneUnit}
            </strong>
            （{t.targetKeyPrefix} {convPreview.targetKeyName}）
          </span>
        </div>
      )}
    </section>
  );
};
