import React from 'react';
import { Timer, Volume2, Play, Square } from 'lucide-react';
import { MetronomeSound, MetronomeSubdivision } from '../audio/AudioEngine';
import { I18nDict } from '../core/i18n';
import { PluginMetronomePreset } from '../core/pluginSystem';

interface MetronomeBarProps {
  t: I18nDict;
  enabled: boolean;
  bpm: number;
  beatsPerBar: number;
  subdivision: MetronomeSubdivision;
  sound: MetronomeSound;
  volume: number;
  currentBeat: number;
  presets?: PluginMetronomePreset[];
  onApplyPreset?: (preset: PluginMetronomePreset) => void;
  onToggle: () => void;
  onChangeBpm: (bpm: number) => void;
  onChangeBeatsPerBar: (beats: number) => void;
  onChangeSubdivision: (sub: MetronomeSubdivision) => void;
  onChangeSound: (sound: MetronomeSound) => void;
  onChangeVolume: (vol: number) => void;
}

const TIME_SIGNATURES = [
  { beats: 4, label: '4/4' },
  { beats: 3, label: '3/4' },
  { beats: 2, label: '2/4' },
  { beats: 6, label: '6/8' },
  { beats: 12, label: '12/8 (Blues)' },
  { beats: 5, label: '5/4' },
  { beats: 7, label: '7/8' },
];

export const MetronomeBar: React.FC<MetronomeBarProps> = ({
  t,
  enabled,
  bpm,
  beatsPerBar,
  subdivision,
  sound,
  volume,
  currentBeat,
  presets,
  onApplyPreset,
  onToggle,
  onChangeBpm,
  onChangeBeatsPerBar,
  onChangeSubdivision,
  onChangeSound,
  onChangeVolume,
}) => {
  const tapTimesRef = React.useRef<number[]>([]);

  const handleTapTempo = () => {
    const now = performance.now();
    const list = tapTimesRef.current.filter((t) => now - t < 2000);
    list.push(now);
    tapTimesRef.current = list;
    if (list.length >= 2) {
      let sum = 0;
      for (let i = 1; i < list.length; i++) {
        sum += list[i] - list[i - 1];
      }
      const avgMs = sum / (list.length - 1);
      const nextBpm = Math.round(60000 / avgMs);
      onChangeBpm(Math.max(40, Math.min(220, nextBpm)));
    }
  };

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#283042] bg-[#141821] px-4 py-2.5 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Timer className="h-4 w-4 text-sky-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t.metronome}
          </span>
        </div>

        <button
          onClick={onToggle}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
            enabled
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-[#1b202c] text-slate-300 border border-[#283042] hover:border-slate-500'
          }`}
        >
          {enabled ? <Square className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
          {enabled ? t.stopShort : t.start}
        </button>

        {/* 视觉拍点指示灯 */}
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[#283042] bg-[#0c0e14] px-2.5 py-1">
          {Array.from({ length: beatsPerBar }, (_, idx) => {
            const active = enabled && currentBeat === idx;
            const isFirst = idx === 0;
            const isSecondary =
              (beatsPerBar === 6 && idx === 3) ||
              (beatsPerBar === 12 && (idx === 3 || idx === 6 || idx === 9));
            return (
              <span
                key={idx}
                className={`h-2 w-2 rounded-full transition-transform duration-75 ${
                  active
                    ? isFirst
                      ? 'scale-125 bg-orange-400 shadow-[0_0_8px_#fb923c]'
                      : isSecondary
                        ? 'scale-110 bg-amber-300 shadow-[0_0_6px_#fcd34d]'
                        : 'scale-110 bg-sky-400 shadow-[0_0_8px_#38bdf8]'
                    : 'bg-slate-700'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* BPM + 拍号 + 节奏型 + 音色 + 音量 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onChangeBpm(Math.max(40, bpm - 1))}
            className="h-6 w-6 rounded border border-[#283042] bg-[#1b202c] text-xs font-bold text-slate-300 hover:border-slate-500"
          >
            -
          </button>
          <input
            type="range"
            min={40}
            max={220}
            step={1}
            value={bpm}
            onChange={(e) => onChangeBpm(Number(e.target.value))}
            className="w-24"
          />
          <button
            onClick={() => onChangeBpm(Math.min(220, bpm + 1))}
            className="h-6 w-6 rounded border border-[#283042] bg-[#1b202c] text-xs font-bold text-slate-300 hover:border-slate-500"
          >
            +
          </button>
          <span className="w-16 font-mono text-xs font-bold text-sky-300">{bpm} BPM</span>
          <button
            onClick={handleTapTempo}
            title="连续点击几次可测出心仪速度"
            className="rounded border border-[#283042] bg-[#1b202c] px-2 py-1 text-[11px] text-slate-300 hover:border-sky-400 hover:text-sky-300 transition"
          >
            Tap
          </button>
        </div>

        <select
          value={beatsPerBar}
          onChange={(e) => onChangeBeatsPerBar(Number(e.target.value))}
          title="拍号"
          className="rounded border border-[#283042] bg-[#0c0e14] px-2 py-1 text-xs text-slate-200"
        >
          {TIME_SIGNATURES.map((ts) => (
            <option key={ts.beats} value={ts.beats}>
              {ts.label}
            </option>
          ))}
        </select>

        <select
          value={subdivision}
          onChange={(e) => onChangeSubdivision(e.target.value as MetronomeSubdivision)}
          className="rounded border border-[#283042] bg-[#0c0e14] px-2 py-1 text-xs text-slate-200"
        >
          {(Object.keys(t.subdivisions) as MetronomeSubdivision[]).map((id) => (
            <option key={id} value={id}>
              {t.subdivisions[id]}
            </option>
          ))}
        </select>

        <select
          value={sound}
          onChange={(e) => onChangeSound(e.target.value as MetronomeSound)}
          className="rounded border border-[#283042] bg-[#0c0e14] px-2 py-1 text-xs text-slate-200"
        >
          {(Object.keys(t.metroSounds) as MetronomeSound[]).map((id) => (
            <option key={id} value={id}>
              {t.soundPrefix}{t.metroSounds[id]}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <Volume2 className="h-3.5 w-3.5 text-slate-400" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => onChangeVolume(Number(e.target.value))}
            className="w-16"
            title="节拍器音量（不混入导出成品）"
          />
        </div>

        {presets && presets.length > 0 && onApplyPreset && (
          <select
            value=""
            onChange={(e) => {
              const found = presets.find((p) => p.id === e.target.value);
              if (found) onApplyPreset(found);
            }}
            title="节奏型预设（来自插件）"
            className="rounded border border-[#283042] bg-[#0c0e14] px-2 py-1 text-xs text-amber-300"
          >
            <option value="" disabled>
              节奏预设 ({presets.length})
            </option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} ({preset.bpm} BPM)
              </option>
            ))}
          </select>
        )}
      </div>
    </section>
  );
};
