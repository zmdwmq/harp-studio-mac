import React from 'react';
import { Trash2, Volume2, Layers, FolderPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { HarpTrackMeta } from '../audio/AudioEngine';
import { DspPreset, DspPresetId } from '../core/dspPresets';
import { I18nDict } from '../core/i18n';

interface TrackListPanelProps {
  t: I18nDict;
  tracks: HarpTrackMeta[];
  presets: DspPreset[];
  onImportTrack: () => void;
  onUpdateTrack: (
    id: string,
    patch: Partial<
      Pick<
        HarpTrackMeta,
        'name' | 'presetId' | 'volume' | 'muted' | 'solo' | 'offsetMs' | 'fadeInMs' | 'fadeOutMs'
      >
    >
  ) => void;
  onDeleteTrack: (id: string) => void;
}

export const TrackListPanel: React.FC<TrackListPanelProps> = ({
  t,
  tracks,
  presets,
  onImportTrack,
  onUpdateTrack,
  onDeleteTrack,
}) => {
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem('harpstudio_tracks_collapsed_v1') === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('harpstudio_tracks_collapsed_v1', next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <section className="rounded-xl border border-[#283042] bg-[#141821] p-4 shadow-lg">
      <div className={`${collapsed ? '' : 'mb-3 '}flex flex-wrap items-center justify-between gap-2`}>
        <button
          onClick={toggleCollapsed}
          title={collapsed ? t.expandStage : t.collapseStage}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-sky-300 transition"
        >
          {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          <Layers className="h-4 w-4 text-sky-400" />
          <span>
            {t.tracksTitle} ({tracks.length} {t.trackUnit})
          </span>
        </button>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] text-slate-500 md:inline">
            {t.tracksHint}
          </span>
          <button
            onClick={onImportTrack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-300 hover:bg-sky-500/25 transition"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            {t.importTrackBtn}
          </button>
        </div>
      </div>

      {!collapsed && (tracks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#283042] bg-[#0c0e14] py-5 text-center text-xs text-slate-500">
          {t.tracksEmpty}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tracks.map((t) => (
            <div
              key={t.id}
              className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 transition ${
                t.muted
                  ? 'border-[#222836] bg-[#0f1219] opacity-60'
                  : 'border-[#283042] bg-[#1b202c]'
              }`}
            >
              {/* 轨名与时长 */}
              <div className="flex min-w-[130px] flex-col">
                <input
                  value={t.name}
                  onChange={(e) => onUpdateTrack(t.id, { name: e.target.value })}
                  className="bg-transparent text-xs font-semibold text-slate-100 outline-none focus:text-sky-300"
                />
                <span className="font-mono text-[10px] text-slate-400">
                  {t.durationSec.toFixed(1)}s
                </span>
              </div>

              {/* 迷你波形 */}
              <div className="flex h-7 flex-1 min-w-[120px] items-center gap-[1.5px] rounded bg-[#0c0e14] px-2">
                {t.peaks.map((pk, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 rounded-full ${t.muted ? 'bg-slate-600' : 'bg-sky-400/80'}`}
                    style={{ height: `${Math.max(10, pk * 85)}%` }}
                  />
                ))}
              </div>

              {/* 独立音色预设 */}
              <select
                value={t.presetId}
                onChange={(e) => onUpdateTrack(t.id, { presetId: e.target.value as DspPresetId })}
                className="rounded border border-[#283042] bg-[#0c0e14] px-2 py-1 text-[11px] text-slate-200"
              >
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* M / S 按钮 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onUpdateTrack(t.id, { muted: !t.muted })}
                  title="静音 (Mute)"
                  className={`h-6 w-6 rounded text-[11px] font-bold transition ${
                    t.muted
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                      : 'bg-[#0c0e14] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  M
                </button>
                <button
                  onClick={() => onUpdateTrack(t.id, { solo: !t.solo })}
                  title="独奏 (Solo)"
                  className={`h-6 w-6 rounded text-[11px] font-bold transition ${
                    t.solo
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                      : 'bg-[#0c0e14] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  S
                </button>
              </div>

              {/* 时间偏移微调 (ms) */}
              <div className="flex items-center gap-1 rounded border border-[#283042] bg-[#0c0e14] px-1.5 py-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => onUpdateTrack(t.id, { offsetMs: (t.offsetMs ?? 0) - 5 })}
                  title="提前 5ms (-5ms)"
                  className="rounded px-1 text-slate-400 hover:bg-slate-800 hover:text-sky-300"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateTrack(t.id, { offsetMs: 0 })}
                  title="时间偏移（点击归零）"
                  className={`min-w-[46px] text-center font-mono ${
                    (t.offsetMs ?? 0) === 0 ? 'text-slate-400' : 'text-sky-300 font-semibold'
                  }`}
                >
                  {(t.offsetMs ?? 0) > 0 ? `+${t.offsetMs ?? 0}` : (t.offsetMs ?? 0)}ms
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateTrack(t.id, { offsetMs: (t.offsetMs ?? 0) + 5 })}
                  title="延后 5ms (+5ms)"
                  className="rounded px-1 text-slate-400 hover:bg-slate-800 hover:text-sky-300"
                >
                  +5
                </button>
              </div>

              {/* 首尾淡入淡出 (ms) */}
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    const steps = [0, 15, 30, 80, 150, 300];
                    const cur = t.fadeInMs ?? 0;
                    const next = steps[(steps.indexOf(cur) + 1) % steps.length];
                    onUpdateTrack(t.id, { fadeInMs: next });
                  }}
                  title="点击切换首部淡入时长"
                  className={`rounded border px-1.5 py-0.5 font-mono transition ${
                    (t.fadeInMs ?? 0) > 0
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      : 'border-[#283042] bg-[#0c0e14] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  淡入{t.fadeInMs ?? 0}ms
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const steps = [0, 15, 30, 80, 150, 300];
                    const cur = t.fadeOutMs ?? 0;
                    const next = steps[(steps.indexOf(cur) + 1) % steps.length];
                    onUpdateTrack(t.id, { fadeOutMs: next });
                  }}
                  title="点击切换尾部淡出时长"
                  className={`rounded border px-1.5 py-0.5 font-mono transition ${
                    (t.fadeOutMs ?? 0) > 0
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      : 'border-[#283042] bg-[#0c0e14] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  淡出{t.fadeOutMs ?? 0}ms
                </button>
              </div>

              {/* 轨道音量 */}
              <div className="flex w-28 items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5 text-slate-400" />
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={t.volume}
                  onChange={(e) => onUpdateTrack(t.id, { volume: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              <button
                onClick={() => onDeleteTrack(t.id)}
                title="删除此轨"
                className="rounded p-1 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
};
