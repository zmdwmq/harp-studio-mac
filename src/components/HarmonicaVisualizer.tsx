import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  BreathAction,
  ChromaticTunerResult,
  ChromaticTuning,
  DiatonicTuning,
  HARMONICA_POSITIONS,
  HarmonicaHole,
  HarmonicaKey,
  HarmonicaType,
  PitchMatchResult,
  SONG_KEYS,
  ScaleOverlayMode,
  calculatePositionFromSongKey,
  getHarmonicaLayout,
  getHoleScaleMatches,
  midiToJianpuParts,
  midiToNoteName,
} from '../core/harmonicaMap';

import { I18nDict } from '../core/i18n';

interface HarmonicaVisualizerProps {
  t: I18nDict;
  type: HarmonicaType;
  harpKey: HarmonicaKey;
  diatonicTuning?: DiatonicTuning;
  chromaticTuning?: ChromaticTuning;
  customHolesC?: HarmonicaHole[];
  mobileView?: boolean;
  targetCue?: { hole: number; action: BreathAction } | null;
  pitchHz: number | null;
  match: PitchMatchResult | null;
  tuner: ChromaticTunerResult | null;
  a4Hz: number;
  onChangeA4Hz: (hz: number) => void;
}

const NoteOrJianpu: React.FC<{
  midi: number;
  mode: 'note' | 'jianpu';
  harpKey: HarmonicaKey;
  type: HarmonicaType;
  octaveShift: number;
}> = ({ midi, mode, harpKey, type, octaveShift }) => {
  const displayMidi = midi + octaveShift;
  if (mode === 'note') {
    return <>{midiToNoteName(displayMidi)}</>;
  }
  const { label, octaveDiff } = midiToJianpuParts(displayMidi, harpKey, type);
  const accidental = label.startsWith('#') ? '#' : label.startsWith('b') ? '♭' : '';
  const digit = accidental ? label.slice(1) : label;
  const absDots = Math.min(2, Math.abs(octaveDiff));

  const renderDots = (count: number) => (
    <span className="flex flex-col items-center justify-center gap-[1.5px]">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="block h-[2.5px] w-[2.5px] rounded-full bg-current" />
      ))}
    </span>
  );

  return (
    <span className="inline-flex items-center font-sans font-bold leading-none">
      {accidental && (
        <span className="mr-[0.5px] text-[0.72em] font-semibold leading-none">
          {accidental}
        </span>
      )}
      <span className="inline-flex flex-col items-center leading-none">
        <span className="flex h-[8px] items-end justify-center pb-[1px]">
          {octaveDiff > 0 ? renderDots(absDots) : null}
        </span>
        <span className="leading-none">{digit}</span>
        <span className="flex h-[8px] items-start justify-center pt-[1px]">
          {octaveDiff < 0 ? renderDots(absDots) : null}
        </span>
      </span>
    </span>
  );
};

export const HarmonicaVisualizer: React.FC<HarmonicaVisualizerProps> = ({
  t,
  type,
  harpKey,
  diatonicTuning = 'richter',
  chromaticTuning = 'solo',
  customHolesC,
  mobileView = false,
  targetCue = null,
  pitchHz,
  match,
  tuner,
  a4Hz,
  onChangeA4Hz,
}) => {
  const [stageMode, setStageMode] = React.useState<'practice' | 'tuner'>('practice');
  const [notationMode, setNotationMode] = React.useState<'note' | 'jianpu'>('jianpu');
  const [pitchDisplay, setPitchDisplay] = React.useState<'standard' | 'harmonica'>('standard');
  const [songKeyIndex, setSongKeyIndex] = React.useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('harpstudio_song_key_v1'));
      return Number.isInteger(saved) && saved >= 0 && saved < 12 ? saved : 7;
    } catch {
      return 7;
    }
  });
  const [scaleMode, setScaleMode] = React.useState<ScaleOverlayMode>(() => {
    try {
      const saved = localStorage.getItem('harpstudio_scale_mode_v1');
      if (saved === 'blues' || saved === 'major_pentatonic' || saved === 'natural_minor') {
        return saved;
      }
      return 'off';
    } catch {
      return 'off';
    }
  });
  const [showPitchCurve, setShowPitchCurve] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem('harpstudio_pitch_curve_v1') !== '0';
    } catch {
      return true;
    }
  });
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem('harpstudio_stage_collapsed_v1') === '1';
    } catch {
      return false;
    }
  });
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('harpstudio_stage_collapsed_v1', next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };
  const octaveShift = pitchDisplay === 'harmonica' ? -12 : 0;
  const holes = React.useMemo(
    () => getHarmonicaLayout(type, harpKey, diatonicTuning, chromaticTuning, customHolesC),
    [type, harpKey, diatonicTuning, chromaticTuning, customHolesC]
  );
  const holeCardRefs = React.useRef<Record<number, HTMLDivElement | null>>({});
  const useHorizontalStrip = mobileView && holes.length > 10;

  React.useEffect(() => {
    if (!useHorizontalStrip || !match?.hole) return;
    const el = holeCardRefs.current[match.hole];
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [useHorizontalStrip, match?.hole]);
  const positionNum = React.useMemo(
    () => calculatePositionFromSongKey(harpKey, songKeyIndex),
    [harpKey, songKeyIndex]
  );
  const positionLabel = React.useMemo(
    () => HARMONICA_POSITIONS.find((p) => p.pos === positionNum)?.label ?? `${positionNum}把位`,
    [positionNum]
  );

  React.useEffect(() => {
    try {
      localStorage.setItem('harpstudio_song_key_v1', String(songKeyIndex));
    } catch {
      // ignore
    }
  }, [songKeyIndex]);

  React.useEffect(() => {
    try {
      localStorage.setItem('harpstudio_scale_mode_v1', scaleMode);
    } catch {
      // ignore
    }
  }, [scaleMode]);

  React.useEffect(() => {
    try {
      localStorage.setItem('harpstudio_pitch_curve_v1', showPitchCurve ? '1' : '0');
    } catch {
      // ignore
    }
  }, [showPitchCurve]);

  const cents = match ? Math.max(-50, Math.min(50, match.centsOffset)) : 0;
  const inTune = match ? Math.abs(match.centsOffset) <= 10 : false;

  const getHoleHighlightStyle = (holeNum: number) => {
    if (!match || match.hole !== holeNum) return null;
    if (match.action === 'blow') {
      return {
        card: 'border-2 border-sky-500 bg-sky-500/25 ring-2 ring-sky-400/50 shadow-[0_0_20px_rgba(14,165,233,0.45)] scale-[1.04] z-10',
        holeBadge: 'bg-sky-500 text-white shadow-md',
        tag: '↑ 吹',
        tagClass: 'bg-sky-500 text-white',
      };
    }
    if (match.action === 'draw') {
      return {
        card: 'border-2 border-orange-500 bg-orange-500/25 ring-2 ring-orange-400/50 shadow-[0_0_20px_rgba(249,115,22,0.45)] scale-[1.04] z-10',
        holeBadge: 'bg-orange-500 text-white shadow-md',
        tag: '↓ 吸',
        tagClass: 'bg-orange-500 text-white',
      };
    }
    if (match.action === 'draw_bend' || match.action === 'blow_bend') {
      return {
        card: 'border-2 border-purple-500 bg-purple-500/25 ring-2 ring-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.5)] scale-[1.04] z-10',
        holeBadge: 'bg-purple-500 text-white shadow-md',
        tag: '⤵ 压',
        tagClass: 'bg-purple-500 text-white',
      };
    }
    if (match.action === 'overblow' || match.action === 'overdraw') {
      return {
        card: 'border-2 border-pink-500 bg-pink-500/25 ring-2 ring-pink-400/50 shadow-[0_0_20px_rgba(236,72,153,0.55)] scale-[1.04] z-10',
        holeBadge: 'bg-pink-500 text-white shadow-md',
        tag: '⚡ 超',
        tagClass: 'bg-pink-500 text-white',
      };
    }
    return {
      card: 'border-2 border-teal-500 bg-teal-500/25 ring-2 ring-teal-400/50 shadow-[0_0_20px_rgba(20,184,166,0.45)] scale-[1.04] z-10',
      holeBadge: 'bg-teal-500 text-white shadow-md',
      tag: '⇄ 推',
      tagClass: 'bg-teal-500 text-white',
    };
  };

  return (
    <section className="rounded-xl border border-[#283042] bg-[#141821] p-4 shadow-lg">
      <div className={`${collapsed ? '' : 'mb-3 '}flex flex-col gap-2`}>
        {/* 第一行：标题 + 模式切换 + 图例 + 折叠开关 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={toggleCollapsed}
              className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-sky-300 transition"
              title={collapsed ? t.expandStage : t.collapseStage}
            >
              {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              {t.stageTitle}
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="inline-flex rounded-md border border-[#283042] bg-[#0c0e14] p-0.5">
                <button
                  onClick={() => setStageMode('practice')}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                    stageMode === 'practice'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.practiceMode}
                </button>
                <button
                  onClick={() => setStageMode('tuner')}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                    stageMode === 'tuner'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.tunerMode}
                </button>
              </div>

              {stageMode === 'practice' && (
                <>
                  <div className="inline-flex rounded-md border border-[#283042] bg-[#0c0e14] p-0.5">
                    <button
                      onClick={() => setNotationMode('jianpu')}
                      className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                        notationMode === 'jianpu'
                          ? 'bg-sky-500/25 text-sky-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t.jianpu}
                    </button>
                    <button
                      onClick={() => setNotationMode('note')}
                      className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                        notationMode === 'note'
                          ? 'bg-sky-500/25 text-sky-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t.noteName}
                    </button>
                  </div>

                  <div className="inline-flex rounded-md border border-[#283042] bg-[#0c0e14] p-0.5">
                    <button
                      onClick={() => setPitchDisplay('standard')}
                      className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                        pitchDisplay === 'standard'
                          ? 'bg-indigo-500/25 text-indigo-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t.standardPitch}
                    </button>
                    <button
                      onClick={() => setPitchDisplay('harmonica')}
                      className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                        pitchDisplay === 'harmonica'
                          ? 'bg-indigo-500/25 text-indigo-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t.harmonicaPitch}
                    </button>
                  </div>
                </>
              )}
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <i className="h-2 w-2 rounded-full bg-sky-400" /> {t.blow}
              </span>
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <i className="h-2 w-2 rounded-full bg-orange-400" /> {t.draw}
              </span>
              {type === 'diatonic10' && (
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <i className="h-2 w-2 rounded-full bg-purple-400" /> {t.bend}
                </span>
              )}
              {(type === 'chromatic12' || type === 'chromatic14' || type === 'chromatic16') && (
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <i className="h-2 w-2 rounded-full bg-teal-400" /> {t.slide}
                </span>
              )}
            </div>
          </div>

          {/* 音高与音分指示器（固定不换行，防止推杆字数变化导致跳行） */}
          <div className="flex shrink-0 items-center gap-3 whitespace-nowrap">
            <div className="flex min-w-[230px] items-baseline justify-end gap-2 font-mono">
              <span className="text-base font-bold text-slate-100">
                {match
                  ? `${match.holeLabel}${t.holeUnit} ${t.actions[match.action]}`
                  : t.waitingPlay}
              </span>
              <span className="w-[105px] text-right text-xs text-sky-400">
                {match
                  ? `${midiToNoteName(match.targetMidi + octaveShift)} (${pitchHz?.toFixed(1)}Hz)`
                  : '--'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500">-50¢</span>
              <div className="relative h-2.5 w-28 overflow-hidden rounded-full bg-[#0c0e14] border border-[#283042]">
                <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-slate-500/60" />
                {match && (
                  <div
                    className={`absolute top-0 h-full w-2.5 -translate-x-1/2 rounded-full transition-all duration-75 ${
                      inTune ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                    style={{ left: `${50 + cents}%` }}
                  />
                )}
              </div>
              <span className="text-[11px] text-slate-500">+50¢</span>
              <span
                className={`w-11 text-right font-mono text-xs font-semibold ${
                  !match ? 'text-slate-500' : inTune ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {match ? `${match.centsOffset >= 0 ? '+' : ''}${match.centsOffset.toFixed(0)}¢` : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {!collapsed && (stageMode === 'tuner' ? (
        <ReedTunerPanel t={t} tuner={tuner} a4Hz={a4Hz} onChangeA4Hz={onChangeA4Hz} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {/* 把位与音阶高亮工具条 */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#283042] bg-[#0c0e14] px-3 py-1.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400">曲目调性</span>
              <select
                value={songKeyIndex}
                onChange={(e) => setSongKeyIndex(Number(e.target.value))}
                className="rounded border border-[#283042] bg-[#181d28] px-2 py-0.5 text-[11px] text-slate-200"
              >
                {SONG_KEYS.map((sk) => (
                  <option key={sk.index} value={sk.index}>
                    {sk.name}
                  </option>
                ))}
              </select>
              <span className="rounded-md border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                {positionLabel}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400">音阶高亮</span>
              <select
                value={scaleMode}
                onChange={(e) => setScaleMode(e.target.value as ScaleOverlayMode)}
                className="rounded border border-[#283042] bg-[#181d28] px-2 py-0.5 text-[11px] text-slate-200"
              >
                <option value="off">关闭</option>
                <option value="blues">布鲁斯音阶 (Blues)</option>
                <option value="major_pentatonic">大调五声音阶</option>
                <option value="natural_minor">自然小调音阶</option>
              </select>
              <button
                type="button"
                onClick={() => setShowPitchCurve((v) => !v)}
                className={`rounded border px-2 py-0.5 text-[11px] font-medium transition ${
                  showPitchCurve
                    ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                    : 'border-[#283042] bg-[#181d28] text-slate-400 hover:text-slate-200'
                }`}
              >
                {showPitchCurve ? '隐藏音高轨迹' : '显示音高轨迹'}
              </button>
            </div>
          </div>

          <div
            className={
              useHorizontalStrip
                ? 'flex gap-2 overflow-x-auto snap-x rounded-lg border border-[#283042] bg-[#0c0e14] p-3'
                : 'grid gap-1.5 rounded-lg border border-[#283042] bg-[#0c0e14] p-3'
            }
            style={
              useHorizontalStrip
                ? undefined
                : { gridTemplateColumns: `repeat(${holes.length}, minmax(0, 1fr))` }
            }
          >
            {holes.map((h) => {
              const highlightStyle = getHoleHighlightStyle(h.hole);
              const isSmall = !useHorizontalStrip && (type === 'tremolo24' || type === 'chromatic16');
              const isChromatic =
                type === 'chromatic12' || type === 'chromatic14' || type === 'chromatic16';
              const activeHole = match?.hole === h.hole;
              const activeAction = activeHole ? match?.action : null;
              const isTargetHole = targetCue?.hole === h.hole;
              const scaleInfo =
                scaleMode !== 'off' ? getHoleScaleMatches(h, songKeyIndex, scaleMode) : null;

              return (
                <div
                  key={h.hole}
                  ref={(el) => {
                    holeCardRefs.current[h.hole] = el;
                  }}
                  className={`relative grid grid-rows-[1fr_auto_1fr] items-center justify-items-center gap-1 rounded-md py-2 transition-all duration-75 ${
                    useHorizontalStrip ? 'min-w-[54px] shrink-0 snap-center' : ''
                  } ${
                    highlightStyle
                      ? highlightStyle.card
                      : isTargetHole
                        ? 'border-2 border-dashed border-emerald-400 bg-emerald-500/10'
                        : 'border border-[#242c3d] bg-[#181d28]'
                  }`}
                >
                  {isTargetHole && !highlightStyle && (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-500 px-1.5 py-0.5 text-[8px] font-bold leading-none text-slate-950 shadow">
                      {targetCue?.action === 'draw' ? '目标↓吸' : targetCue?.action === 'draw_bend' ? '目标⤵压' : '目标↑吹'}
                    </span>
                  )}
                  {highlightStyle && (
                    <span
                      className={`absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none shadow ${highlightStyle.tagClass}`}
                    >
                      {highlightStyle.tag}
                    </span>
                  )}
                  {/* 吹气 + 半音阶推杆吹（底部对齐紧贴孔号） */}
                  <div className="flex flex-col items-center justify-end self-end gap-0.5 leading-tight min-h-[24px]">
                    <span
                      className={`inline-flex items-center gap-0.5 font-mono ${isSmall ? 'text-[9px]' : 'text-[11px]'} ${
                        activeAction === 'blow' || activeAction === 'blow_bend' || activeAction === 'overblow'
                          ? 'rounded bg-sky-500 px-1.5 py-0.5 font-extrabold text-white shadow-sm'
                          : scaleInfo?.blowInScale
                            ? 'rounded bg-sky-500/15 px-1 ring-1 ring-sky-400/50 text-sky-300/90'
                            : 'text-sky-300/90'
                      }`}
                    >
                      {scaleInfo?.blowIsRoot && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="主音 (Root)" />
                      )}
                      {h.blowMidi >= 0 ? (
                        <NoteOrJianpu
                          midi={h.blowMidi}
                          mode={notationMode}
                          harpKey={harpKey}
                          type={type}
                          octaveShift={octaveShift}
                        />
                      ) : (
                        '·'
                      )}
                    </span>
                    {isChromatic && h.slideBlowMidi !== undefined && (
                      <span
                        className={`font-mono ${isSmall ? 'text-[8px]' : 'text-[10px]'} ${
                          activeAction === 'slide_blow'
                            ? 'rounded bg-teal-500/30 px-1 font-bold text-teal-200'
                            : 'text-teal-400/70'
                        }`}
                      >
                        <NoteOrJianpu
                          midi={h.slideBlowMidi}
                          mode={notationMode}
                          harpKey={harpKey}
                          type={type}
                          octaveShift={octaveShift}
                        />
                      </span>
                    )}
                  </div>

                  <div className="relative flex items-center justify-center">
                    <span
                      title={h.isBassExtension ? '倍低音区孔位' : undefined}
                      className={`flex items-center justify-center rounded font-mono font-bold transition-all ${
                        highlightStyle
                          ? highlightStyle.holeBadge
                          : h.isBassExtension
                            ? 'bg-indigo-950/70 text-indigo-300 border border-indigo-500/30'
                            : 'bg-[#0c0e14] text-slate-200'
                      } ${isSmall ? 'h-5 w-6 text-[10px]' : 'h-7 w-7 text-xs'}`}
                    >
                      {h.holeLabel}
                    </span>
                    {scaleInfo?.bendInScale && (
                      <span
                        title="此孔压音包含音阶音"
                        className="absolute -right-2 -bottom-1 rounded bg-purple-500/80 px-0.5 text-[8px] font-bold leading-tight text-white"
                      >
                        压
                      </span>
                    )}
                  </div>

                  {/* 吸气 + 半音阶推杆吸（顶部对齐紧贴孔号） */}
                  <div className="flex flex-col items-center justify-start self-start gap-0.5 leading-tight min-h-[24px]">
                    <span
                      className={`inline-flex items-center gap-0.5 font-mono ${isSmall ? 'text-[9px]' : 'text-[11px]'} ${
                        activeAction === 'draw' || activeAction === 'draw_bend' || activeAction === 'overdraw'
                          ? 'rounded bg-orange-500 px-1.5 py-0.5 font-extrabold text-white shadow-sm'
                          : scaleInfo?.drawInScale
                            ? 'rounded bg-orange-500/15 px-1 ring-1 ring-orange-400/50 text-orange-300/90'
                            : 'text-orange-300/90'
                      }`}
                    >
                      {scaleInfo?.drawIsRoot && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="主音 (Root)" />
                      )}
                      {h.drawMidi >= 0 ? (
                        <NoteOrJianpu
                          midi={h.drawMidi}
                          mode={notationMode}
                          harpKey={harpKey}
                          type={type}
                          octaveShift={octaveShift}
                        />
                      ) : (
                        '·'
                      )}
                    </span>
                    {isChromatic && h.slideDrawMidi !== undefined && (
                      <span
                        className={`font-mono ${isSmall ? 'text-[8px]' : 'text-[10px]'} ${
                          activeAction === 'slide_draw'
                            ? 'rounded bg-teal-500/30 px-1 font-bold text-teal-200'
                            : 'text-teal-400/70'
                        }`}
                      >
                        <NoteOrJianpu
                          midi={h.slideDrawMidi}
                          mode={notationMode}
                          harpKey={harpKey}
                          type={type}
                          octaveShift={octaveShift}
                        />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {showPitchCurve && (
            <PitchTrajectoryPanel match={match} pitchHz={pitchHz} />
          )}
        </div>
      ))}
    </section>
  );
};

const A4_PRESETS = [440, 442, 443, 444];

const PitchTrajectoryPanel: React.FC<{
  match: PitchMatchResult | null;
  pitchHz: number | null;
}> = ({ match, pitchHz }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const historyRef = React.useRef<Array<{ cents: number; key: string } | null>>([]);
  const maxPoints = 140;

  React.useEffect(() => {
    const arr = historyRef.current;
    if (match && pitchHz) {
      const clamped = Math.max(-50, Math.min(50, match.centsOffset));
      arr.push({ cents: clamped, key: `${match.hole}-${match.action}` });
    } else {
      arr.push(null);
    }
    if (arr.length > maxPoints) {
      arr.splice(0, arr.length - maxPoints);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // 中心 ±10¢ 稳定绿区
    const bandTop = h * 0.4;
    const bandHeight = h * 0.2;
    ctx.fillStyle = 'rgba(52, 211, 153, 0.08)';
    ctx.fillRect(0, bandTop, w, bandHeight);

    // 基准线 0¢
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // ±25¢ 虚线
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    for (const ratio of [0.25, 0.75]) {
      ctx.beginPath();
      ctx.moveTo(0, h * ratio);
      ctx.lineTo(w, h * ratio);
      ctx.stroke();
    }
    ctx.restore();

    // 绘制实时音高轨迹折线
    const stepX = w / (maxPoints - 1);
    const offsetStart = maxPoints - arr.length;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < arr.length; i++) {
      const prev = arr[i - 1];
      const curr = arr[i];
      if (!prev || !curr) continue;
      if (prev.key !== curr.key && Math.abs(prev.cents - curr.cents) > 35) continue;

      const x1 = (offsetStart + i - 1) * stepX;
      const y1 = h / 2 - (prev.cents / 50) * (h * 0.44);
      const x2 = (offsetStart + i) * stepX;
      const y2 = h / 2 - (curr.cents / 50) * (h * 0.44);

      const inTune = Math.abs(curr.cents) <= 10;
      ctx.strokeStyle = inTune ? '#34d399' : curr.cents < 0 ? '#38bdf8' : '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }, [match, pitchHz]);

  return (
    <div className="rounded-lg border border-[#283042] bg-[#0c0e14] px-3 py-2">
      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
        <span className="font-medium text-slate-300">实时音高轨迹（压音 / 颤音波形）</span>
        <span className="font-mono text-[10px] text-slate-500">
          绿区 ±10¢ 稳定 · 上高(+50¢) / 下低(-50¢)
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={760}
        height={64}
        className="h-16 w-full rounded bg-[#080a0f]"
      />
    </div>
  );
};

const ReedTunerPanel: React.FC<{
  t: I18nDict;
  tuner: ChromaticTunerResult | null;
  a4Hz: number;
  onChangeA4Hz: (hz: number) => void;
}> = ({ t, tuner, a4Hz, onChangeA4Hz }) => {
  const cents = tuner ? Math.max(-50, Math.min(50, tuner.centsOffset)) : 0;
  const isPerfect = tuner ? Math.abs(tuner.centsOffset) <= 3 : false;
  const isFlat = tuner ? tuner.centsOffset < -3 : false;

  const hintText = !tuner
    ? t.tunerIdle
    : isPerfect
      ? t.tunerPerfect
      : isFlat
        ? t.tunerFlat
        : t.tunerSharp;

  return (
    <div className="rounded-lg border border-[#283042] bg-[#0c0e14] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{t.a4Ref}</span>
          {A4_PRESETS.map((hz) => (
            <button
              key={hz}
              onClick={() => onChangeA4Hz(hz)}
              className={`rounded px-2 py-1 font-mono text-xs transition ${
                a4Hz === hz
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'bg-[#181d28] text-slate-400 hover:text-slate-200'
              }`}
            >
              {hz} Hz
            </button>
          ))}
        </div>
        <span className="text-[11px] text-slate-500">
          {t.a4Hint}
        </span>
      </div>

      <div className="grid items-center gap-4 md:grid-cols-3">
        {/* 目标音名与频率 */}
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-black font-mono text-slate-100">
            {tuner ? tuner.noteName : '--'}
          </span>
          <div className="flex flex-col text-xs font-mono">
            <span className="text-slate-400">
              {t.targetFreq}{tuner ? `${tuner.targetHz.toFixed(2)} Hz` : '--'}
            </span>
            <span className="text-sky-400">
              {t.actualFreq}{tuner ? `${tuner.freqHz.toFixed(2)} Hz` : '--'}
            </span>
          </div>
        </div>

        {/* 高精度标尺 */}
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-sky-400">{t.flatLabel}</span>
            <span
              className={`text-sm font-bold ${
                !tuner
                  ? 'text-slate-500'
                  : isPerfect
                    ? 'text-emerald-400'
                    : isFlat
                      ? 'text-sky-400'
                      : 'text-orange-400'
              }`}
            >
              {tuner
                ? `${tuner.centsOffset >= 0 ? '+' : ''}${tuner.centsOffset.toFixed(1)} cents`
                : '0.0 cents'}
            </span>
            <span className="text-orange-400">{t.sharpLabel}</span>
          </div>

          <div className="relative h-5 overflow-hidden rounded-full border border-[#283042] bg-[#141821]">
            {/* ±3 cents 完美绿区 */}
            <div className="absolute left-1/2 top-0 h-full w-[6%] -translate-x-1/2 bg-emerald-500/20 border-x border-emerald-500/40" />
            <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-emerald-400" />
            {tuner && (
              <div
                className={`absolute top-0.5 bottom-0.5 w-3 -translate-x-1/2 rounded-full transition-all duration-75 ${
                  isPerfect ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]' : isFlat ? 'bg-sky-400' : 'bg-orange-400'
                }`}
                style={{ left: `${50 + cents}%` }}
              />
            )}
          </div>

          <div
            className={`text-xs ${
              !tuner
                ? 'text-slate-500'
                : isPerfect
                  ? 'text-emerald-300'
                  : isFlat
                    ? 'text-sky-300'
                    : 'text-orange-300'
            }`}
          >
            {hintText}
          </div>
        </div>
      </div>
    </div>
  );
};
