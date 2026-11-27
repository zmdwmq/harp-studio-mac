import React from 'react';
import {
  Music2,
  Mic,
  Sliders,
  Settings,
  Circle,
  Square,
  Play,
  Download,
  Video,
  Monitor,
  Footprints,
  Puzzle,
  HelpCircle,
  Save,
  FolderOpen,
  X,
} from 'lucide-react';
import {
  AudioInputDevice,
  BackingTrackInfo,
  HarpTrackMeta,
  MeterAndPitchFrame,
  MetronomeSound,
  MetronomeSubdivision,
} from '../audio/AudioEngine';
import { DspPreset, DspPresetId } from '../core/dspPresets';
import {
  BreathAction,
  ChromaticTuning,
  DiatonicTuning,
  HARMONICA_KEYS,
  HarmonicaHole,
  HarmonicaKey,
  HarmonicaType,
} from '../core/harmonicaMap';
import { AppLocale, I18nDict, LOCALE_OPTIONS } from '../core/i18n';
import { PluginMetronomePreset, PluginTabSong, PluginTheme, PluginTuningExtension } from '../core/pluginSystem';
import { ANDROID_APP_VERSION } from '../core/version';
import { ThemePreference } from './HeaderBar';
import { HarmonicaVisualizer } from './HarmonicaVisualizer';
import { FollowAlongPanel } from './FollowAlongPanel';
import { MetronomeBar } from './MetronomeBar';
import { PresetPanel } from './PresetPanel';
import { TrackListPanel } from './TrackListPanel';
import { WaveformPanel } from './WaveformPanel';

export type MobileTab = 'stage' | 'studio' | 'tone' | 'more';

export interface MobileLayoutProps {
  t: I18nDict;
  locale: AppLocale;
  onChangeLocale: (loc: AppLocale) => void;
  themePref: ThemePreference;
  pluginThemes: PluginTheme[];
  onChangeTheme: (th: ThemePreference) => void;
  harpType: HarmonicaType;
  harpKey: HarmonicaKey;
  diatonicTuning: DiatonicTuning;
  chromaticTuning: ChromaticTuning;
  pluginTunings: PluginTuningExtension[];
  selectedPluginTuningId: string | null;
  activeCustomHolesC?: HarmonicaHole[];
  onChangeHarpType: (ht: HarmonicaType) => void;
  onChangeHarpKey: (k: HarmonicaKey) => void;
  onChangeDiatonicTuning: (tn: DiatonicTuning) => void;
  onChangeChromaticTuning: (ct: ChromaticTuning) => void;
  onSelectPluginTuning: (id: string | null) => void;
  devices: AudioInputDevice[];
  selectedDeviceId: string;
  onSelectDevice: (id: string) => void;
  micActive: boolean;
  onToggleMic: () => void;
  meter: MeterAndPitchFrame;
  a4Hz: number;
  onChangeA4Hz: (hz: number) => void;
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
  onStopPlay: () => void;
  onSeek: (sec: number) => void;
  onTempoChange: (rate: number) => void;
  onPitchChange: (semis: number) => void;
  onSetLoopA: () => void;
  onSetLoopB: () => void;
  onToggleLoop: () => void;
  onOpenCircleOfFifths: () => void;
  metroEnabled: boolean;
  metroBpm: number;
  metroBeats: number;
  metroSubdivision: MetronomeSubdivision;
  metroSound: MetronomeSound;
  metroVol: number;
  currentBeat: number;
  metronomePluginEnabled: boolean;
  pluginMetronomePresets: PluginMetronomePreset[];
  onApplyMetronomePreset: (preset: PluginMetronomePreset) => void;
  multitrackRackPluginEnabled: boolean;
  onToggleMetro: () => void;
  onChangeMetroBpm: (bpm: number) => void;
  onChangeMetroBeats: (beats: number) => void;
  onChangeMetroSubdivision: (sub: MetronomeSubdivision) => void;
  onChangeMetroSound: (s: MetronomeSound) => void;
  onChangeMetroVol: (v: number) => void;
  allPresets: DspPreset[];
  presetId: DspPresetId;
  editingParams: DspPreset;
  onSelectPreset: (p: DspPreset) => void;
  onChangeDspParams: (p: DspPreset) => void;
  onSaveCustomPreset: (name: string) => void;
  onDeleteCustomPreset: (id: string) => void;
  tracks: HarpTrackMeta[];
  onImportTrackToRack: () => void;
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
  isRecording: boolean;
  countInEnabled: boolean;
  onToggleCountIn: (v: boolean) => void;
  countInBeat: number | null;
  recordWithBacking: boolean;
  onToggleRecordWithBacking: (v: boolean) => void;
  latencyCompensationMs: number;
  onChangeLatencyMs: (ms: number) => void;
  isCalibrating: boolean;
  onCalibrateLatency: () => void;
  noiseGateEnabled: boolean;
  onToggleNoiseGate: (v: boolean) => void;
  noiseGateThresholdDb: number;
  onChangeNoiseGateDb: (db: number) => void;
  onToggleRecord: () => void;
  onPreviewMix: () => void;
  onExportAudio: (fmt: 'wav' | 'mp3') => void;
  onExportVideo: () => void;
  videoExportProgress: number | null;
  backingVol: number;
  onChangeBackingVol: (v: number) => void;
  onSaveProject: () => void;
  onOpenProject: () => void;
  onOpenPlugins: () => void;
  onOpenPedal: () => void;
  midiDeviceCount: number;
  onOpenHelp: () => void;
  onSwitchToDesktop: () => void;
  pluginTabs: PluginTabSong[];
  followAlongTargetCue: { hole: number; action: BreathAction } | null;
  onFollowAlongTargetCueChange: (cue: { hole: number; action: BreathAction } | null) => void;
  onStartFollowCountIn: (bpm: number, onDone: () => void) => () => void;
  onEnsureMic: () => Promise<void>;
  onStatusMessage: (msg: string) => void;
  statusMsg: string;
}

const HARP_TYPE_IDS: HarmonicaType[] = [
  'diatonic10',
  'chromatic12',
  'chromatic14',
  'chromatic16',
  'tremolo24',
];

export const MobileLayout: React.FC<MobileLayoutProps> = (props) => {
  const {
    t,
    locale,
    onChangeLocale,
    themePref,
    pluginThemes,
    onChangeTheme,
    harpType,
    harpKey,
    diatonicTuning,
    chromaticTuning,
    pluginTunings,
    selectedPluginTuningId,
    activeCustomHolesC,
    onChangeHarpType,
    onChangeHarpKey,
    onChangeDiatonicTuning,
    onChangeChromaticTuning,
    onSelectPluginTuning,
    devices,
    selectedDeviceId,
    onSelectDevice,
    micActive,
    onToggleMic,
    meter,
    a4Hz,
    onChangeA4Hz,
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
    onStopPlay,
    onSeek,
    onTempoChange,
    onPitchChange,
    onSetLoopA,
    onSetLoopB,
    onToggleLoop,
    onOpenCircleOfFifths,
    metroEnabled,
    metroBpm,
    metroBeats,
    metroSubdivision,
    metroSound,
    metroVol,
    currentBeat,
    metronomePluginEnabled,
    pluginMetronomePresets,
    onApplyMetronomePreset,
    multitrackRackPluginEnabled,
    onToggleMetro,
    onChangeMetroBpm,
    onChangeMetroBeats,
    onChangeMetroSubdivision,
    onChangeMetroSound,
    onChangeMetroVol,
    allPresets,
    presetId,
    editingParams,
    onSelectPreset,
    onChangeDspParams,
    onSaveCustomPreset,
    onDeleteCustomPreset,
    tracks,
    onImportTrackToRack,
    onUpdateTrack,
    onDeleteTrack,
    isRecording,
    countInEnabled,
    onToggleCountIn,
    countInBeat,
    recordWithBacking,
    onToggleRecordWithBacking,
    latencyCompensationMs,
    onChangeLatencyMs,
    isCalibrating,
    onCalibrateLatency,
    noiseGateEnabled,
    onToggleNoiseGate,
    noiseGateThresholdDb,
    onChangeNoiseGateDb,
    onToggleRecord,
    onPreviewMix,
    onExportAudio,
    onExportVideo,
    videoExportProgress,
    backingVol,
    onChangeBackingVol,
    onSaveProject,
    onOpenProject,
    onOpenPlugins,
    onOpenPedal,
    midiDeviceCount,
    onOpenHelp,
    onSwitchToDesktop,
    pluginTabs,
    followAlongTargetCue,
    onFollowAlongTargetCueChange,
    onStartFollowCountIn,
    onEnsureMic,
    onStatusMessage,
    statusMsg,
  } = props;

  const [activeTab, setActiveTab] = React.useState<MobileTab>('stage');
  const [showHarpPicker, setShowHarpPicker] = React.useState(false);

  const meterPct = Math.min(100, Math.round(meter.peak * 135));

  return (
    <div className="flex min-h-screen flex-col bg-[#0c0e14] text-slate-100 pb-20">
      {/* 顶部精简栏 */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-[#283042] bg-[#141821]/95 px-3 py-2 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setShowHarpPicker(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-300"
        >
          <Music2 className="h-3.5 w-3.5" />
          <span className="truncate max-w-[130px]">
            {t.harpTypes[harpType]} · {harpKey}
          </span>
        </button>

        {/* 迷你电平条 */}
        <div className="flex flex-1 max-w-[90px] items-center gap-1.5">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#0c0e14] border border-[#283042]">
            <div
              className={`h-full transition-all duration-75 ${
                meter.clipping ? 'bg-rose-500' : meterPct > 75 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${meterPct}%` }}
            />
          </div>
          <span
            className={`h-2 w-2 rounded-full ${meter.clipping ? 'bg-rose-500 animate-ping' : 'bg-slate-700'}`}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleMic}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition ${
              micActive
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-sky-500 text-slate-950'
            }`}
          >
            <Mic className="h-3.5 w-3.5" />
            {micActive ? '已开' : '开麦'}
          </button>
          <button
            type="button"
            onClick={onSwitchToDesktop}
            title="切换回桌面端布局"
            className="rounded-full border border-[#283042] bg-[#0c0e14] p-1.5 text-slate-400 hover:text-sky-300"
          >
            <Monitor className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 space-y-3 p-3">
        {activeTab === 'stage' && (
          <>
            <HarmonicaVisualizer
              t={t}
              type={harpType}
              harpKey={harpKey}
              diatonicTuning={diatonicTuning}
              chromaticTuning={chromaticTuning}
              customHolesC={activeCustomHolesC}
              mobileView={true}
              targetCue={followAlongTargetCue}
              pitchHz={meter.pitchHz}
              match={meter.match}
              tuner={meter.tuner}
              a4Hz={a4Hz}
              onChangeA4Hz={onChangeA4Hz}
            />
            {pluginTabs.length > 0 && (
              <FollowAlongPanel
                tabs={pluginTabs}
                harmonicaType={harpType}
                harpKey={harpKey}
                diatonicTuning={diatonicTuning}
                chromaticTuning={chromaticTuning}
                customHolesC={activeCustomHolesC}
                match={meter.match}
                micActive={micActive}
                onEnsureMic={onEnsureMic}
                onStartCountIn={onStartFollowCountIn}
                onTargetCueChange={onFollowAlongTargetCueChange}
                onStatusMessage={onStatusMessage}
              />
            )}
            {metronomePluginEnabled && (
              <MetronomeBar
                t={t}
                enabled={metroEnabled}
                bpm={metroBpm}
                beatsPerBar={metroBeats}
                subdivision={metroSubdivision}
                sound={metroSound}
                volume={metroVol}
                currentBeat={currentBeat}
                presets={pluginMetronomePresets}
                onApplyPreset={onApplyMetronomePreset}
                onToggle={onToggleMetro}
                onChangeBpm={onChangeMetroBpm}
                onChangeBeatsPerBar={onChangeMetroBeats}
                onChangeSubdivision={onChangeMetroSubdivision}
                onChangeSound={onChangeMetroSound}
                onChangeVolume={onChangeMetroVol}
              />
            )}
          </>
        )}

        {activeTab === 'studio' && (
          <>
            <WaveformPanel
              t={t}
              compact={false}
              harpType={harpType}
              harpKey={harpKey}
              track={track}
              currentTimeSec={currentTimeSec}
              isPlaying={isPlaying}
              tempoRate={tempoRate}
              pitchSemitones={pitchSemitones}
              loopEnabled={loopEnabled}
              loopA={loopA}
              loopB={loopB}
              onImportTrack={onImportTrack}
              onTogglePlay={onTogglePlay}
              onStop={onStopPlay}
              onSeek={onSeek}
              onTempoChange={onTempoChange}
              onPitchChange={onPitchChange}
              onSetLoopA={onSetLoopA}
              onSetLoopB={onSetLoopB}
              onToggleLoop={onToggleLoop}
              onOpenCircleOfFifths={onOpenCircleOfFifths}
            />

            {/* 移动录音控制卡（大号圆形录音按钮 + 降噪门 + 延迟校准） */}
            <section className="rounded-xl border border-[#283042] bg-[#141821] p-4 shadow-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <label className="flex items-center gap-1.5 text-slate-300">
                  <input
                    type="checkbox"
                    checked={countInEnabled}
                    onChange={(e) => onToggleCountIn(e.target.checked)}
                    className="rounded"
                  />
                  {t.countInLabel}
                </label>
                <label className="flex items-center gap-1.5 text-slate-300">
                  <input
                    type="checkbox"
                    checked={recordWithBacking}
                    onChange={(e) => onToggleRecordWithBacking(e.target.checked)}
                    className="rounded"
                  />
                  {t.syncBackingLabel}
                </label>
              </div>

              {/* 大号拇指录音按钮 + 试听 */}
              <div className="flex items-center justify-center gap-5 py-2">
                <button
                  type="button"
                  onClick={onToggleRecord}
                  className={`flex h-20 w-20 flex-col items-center justify-center rounded-full text-xs font-bold shadow-xl transition active:scale-95 ${
                    isRecording
                      ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/40'
                      : countInBeat !== null
                        ? 'bg-amber-500 text-slate-950 animate-pulse ring-4 ring-amber-400/40'
                        : 'bg-rose-500 text-white hover:bg-rose-400 ring-4 ring-rose-500/20'
                  }`}
                >
                  {isRecording || countInBeat !== null ? (
                    <Square className="h-6 w-6 mb-0.5" />
                  ) : (
                    <Circle className="h-6 w-6 mb-0.5 fill-current" />
                  )}
                  <span>
                    {countInBeat !== null
                      ? `${countInBeat}/${metroBeats}`
                      : isRecording
                        ? '停止'
                        : '录音'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onPreviewMix}
                  disabled={tracks.length === 0 && !track}
                  className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-[#283042] bg-[#1b202c] px-5 text-xs font-semibold text-slate-100 disabled:opacity-40"
                >
                  <Play className="h-4 w-4" />
                  {t.previewMix}
                </button>
              </div>

              {/* 前端降噪门 */}
              <div className="flex items-center justify-between gap-2 rounded-lg border border-[#283042] bg-[#0c0e14] px-3 py-2 text-xs">
                <label className="flex items-center gap-1.5 text-slate-300">
                  <input
                    type="checkbox"
                    checked={noiseGateEnabled}
                    onChange={(e) => onToggleNoiseGate(e.target.checked)}
                    className="rounded"
                  />
                  <span>前端降噪门</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={-60}
                    max={-25}
                    step={1}
                    value={noiseGateThresholdDb}
                    disabled={!noiseGateEnabled}
                    onChange={(e) => onChangeNoiseGateDb(Number(e.target.value))}
                    className="w-24 disabled:opacity-40"
                  />
                  <span className="font-mono text-[11px] text-slate-400">{noiseGateThresholdDb}dB</span>
                </div>
              </div>

              {/* 延迟校准 */}
              <div className="flex items-center justify-between gap-2 rounded-lg border border-[#283042] bg-[#0c0e14] px-3 py-2 text-xs">
                <span className="text-slate-400">{t.latencyCalibrateLabel}:</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded border border-[#283042] bg-[#141821] px-1.5 py-0.5 font-mono text-[11px]">
                    <button
                      type="button"
                      onClick={() => onChangeLatencyMs(Math.max(-500, latencyCompensationMs - 5))}
                      className="px-1.5 py-0.5 text-slate-300"
                    >
                      -5
                    </button>
                    <span className="min-w-[40px] text-center text-sky-300">{latencyCompensationMs}ms</span>
                    <button
                      type="button"
                      onClick={() => onChangeLatencyMs(Math.min(500, latencyCompensationMs + 5))}
                      className="px-1.5 py-0.5 text-slate-300"
                    >
                      +5
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={onCalibrateLatency}
                    disabled={isCalibrating || isRecording || countInBeat !== null}
                    className="rounded-md border border-sky-500/30 bg-sky-500/15 px-2.5 py-1 text-[11px] font-medium text-sky-300 disabled:opacity-40"
                  >
                    {isCalibrating ? t.calibratingBtn : t.calibrateBtn}
                  </button>
                </div>
              </div>

              {/* 导出 3 按钮 */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onExportAudio('wav')}
                  disabled={(tracks.length === 0 && !track) || videoExportProgress !== null}
                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" />
                  WAV
                </button>
                <button
                  type="button"
                  onClick={() => onExportAudio('mp3')}
                  disabled={(tracks.length === 0 && !track) || videoExportProgress !== null}
                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-sky-500 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" />
                  MP3
                </button>
                <button
                  type="button"
                  onClick={onExportVideo}
                  disabled={tracks.length === 0 && !track}
                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-violet-500 py-2.5 text-xs font-bold text-white disabled:opacity-40"
                >
                  <Video className="h-3.5 w-3.5" />
                  {videoExportProgress !== null ? `${Math.round(videoExportProgress * 100)}%` : t.exportVideoBtn}
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="text-slate-400 whitespace-nowrap">{t.backingVol}</span>
                <input
                  type="range"
                  min={0}
                  max={1.2}
                  step={0.05}
                  value={backingVol}
                  onChange={(e) => onChangeBackingVol(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-10 text-right font-mono text-slate-400">
                  {Math.round(backingVol * 100)}%
                </span>
              </div>
            </section>

            {multitrackRackPluginEnabled && (
              <TrackListPanel
                t={t}
                tracks={tracks}
                presets={allPresets}
                onImportTrack={onImportTrackToRack}
                onUpdateTrack={onUpdateTrack}
                onDeleteTrack={onDeleteTrack}
              />
            )}
          </>
        )}

        {activeTab === 'tone' && (
          <PresetPanel
            t={t}
            compact={false}
            presets={allPresets}
            selectedPresetId={presetId}
            editingParams={editingParams}
            onSelectPreset={onSelectPreset}
            onChangeParams={onChangeDspParams}
            onSaveCustomPreset={onSaveCustomPreset}
            onDeleteCustomPreset={onDeleteCustomPreset}
          />
        )}

        {activeTab === 'more' && (
          <section className="space-y-3 rounded-xl border border-[#283042] bg-[#141821] p-4 shadow-lg text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">麦克风设备</span>
              <select
                value={selectedDeviceId}
                onChange={(e) => onSelectDevice(e.target.value)}
                className="max-w-[200px] rounded-lg border border-[#283042] bg-[#0c0e14] px-2 py-1.5 text-xs text-slate-200"
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">界面主题</span>
              <select
                value={themePref}
                onChange={(e) => onChangeTheme(e.target.value as ThemePreference)}
                className="rounded-lg border border-[#283042] bg-[#0c0e14] px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="system">{t.themeSystem}</option>
                <option value="dark">{t.themeDark}</option>
                <option value="light">{t.themeLight}</option>
                <option value="vintage">{t.themeVintage}</option>
                {pluginThemes.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">界面语言</span>
              <select
                value={locale}
                onChange={(e) => onChangeLocale(e.target.value as AppLocale)}
                className="rounded-lg border border-[#283042] bg-[#0c0e14] px-2.5 py-1.5 text-xs text-slate-200"
              >
                {LOCALE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={onOpenPedal}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#283042] bg-[#0c0e14] py-3 text-slate-200"
              >
                <Footprints className="h-4 w-4 text-sky-400" />
                <span>脚踏开关 {midiDeviceCount > 0 ? `(${midiDeviceCount})` : ''}</span>
              </button>
              <button
                type="button"
                onClick={onOpenPlugins}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#283042] bg-[#0c0e14] py-3 text-slate-200"
              >
                <Puzzle className="h-4 w-4 text-sky-400" />
                <span>{t.pluginsBtn}</span>
              </button>
              <button
                type="button"
                onClick={onOpenProject}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#283042] bg-[#0c0e14] py-3 text-slate-200"
              >
                <FolderOpen className="h-4 w-4 text-emerald-400" />
                <span>{t.openProject}</span>
              </button>
              <button
                type="button"
                onClick={onSaveProject}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#283042] bg-[#0c0e14] py-3 text-slate-200"
              >
                <Save className="h-4 w-4 text-emerald-400" />
                <span>{t.saveProject}</span>
              </button>
              <button
                type="button"
                onClick={onOpenHelp}
                className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#283042] bg-[#0c0e14] py-3 text-slate-200"
              >
                <HelpCircle className="h-4 w-4 text-sky-400" />
                <span>{t.helpBtn}</span>
              </button>
            </div>

            <div className="pt-2 text-center font-mono text-[11px] text-slate-500">
              HarpStudio Android {ANDROID_APP_VERSION} · {statusMsg}
            </div>
          </section>
        )}
      </main>

      {/* 底部 4-Tab 导航栏 */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t border-[#283042] bg-[#141821]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        {(
          [
            { id: 'stage', label: '舞台', icon: Music2 },
            { id: 'studio', label: '录音', icon: Mic },
            { id: 'tone', label: '音色', icon: Sliders },
            { id: 'more', label: '更多', icon: Settings },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
                active ? 'text-sky-400' : 'text-slate-400'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 预备拍全屏大字倒计时浮层 */}
      {countInBeat !== null && (
        <div
          onClick={onToggleRecord}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm"
        >
          <span className="text-xs uppercase tracking-widest text-amber-300">预备拍 Count-in</span>
          <span className="my-2 font-mono text-8xl font-black text-amber-400 animate-pulse">
            {countInBeat}
          </span>
          <span className="text-xs text-slate-400">第 {countInBeat} / {metroBeats} 拍（点击屏幕可取消）</span>
        </div>
      )}

      {/* 口琴型号与调性底部选择器 */}
      {showHarpPicker && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/65 backdrop-blur-sm">
          <div className="w-full rounded-t-2xl border-t border-[#283042] bg-[#141821] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-100">选择口琴与调性</span>
              <button
                type="button"
                onClick={() => setShowHarpPicker(false)}
                className="rounded-lg p-1 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <span className="text-slate-400">口琴类型</span>
              <div className="flex flex-wrap gap-1.5">
                {HARP_TYPE_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onChangeHarpType(id)}
                    className={`rounded-lg px-2.5 py-1.5 font-medium ${
                      harpType === id
                        ? 'bg-sky-500 text-slate-950 font-bold'
                        : 'border border-[#283042] bg-[#0c0e14] text-slate-300'
                    }`}
                  >
                    {t.harpTypes[id]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <span className="text-slate-400">口琴调性</span>
              <div className="grid grid-cols-4 gap-1.5">
                {HARMONICA_KEYS.map((k) => (
                  <button
                    key={k.key}
                    type="button"
                    onClick={() => onChangeHarpKey(k.key)}
                    className={`rounded-lg py-1.5 font-mono ${
                      harpKey === k.key
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'border border-[#283042] bg-[#0c0e14] text-slate-300'
                    }`}
                  >
                    {k.key}
                  </button>
                ))}
              </div>
            </div>

            {(harpType === 'diatonic10' ||
              harpType === 'chromatic12' ||
              harpType === 'chromatic14' ||
              harpType === 'chromatic16') && (
              <div className="space-y-2 text-xs">
                <span className="text-slate-400">调弦排列</span>
                <select
                  value={
                    selectedPluginTuningId &&
                    pluginTunings.some((pt) => pt.id === selectedPluginTuningId && pt.targetType === harpType)
                      ? `plugin:${selectedPluginTuningId}`
                      : harpType === 'diatonic10'
                        ? diatonicTuning
                        : chromaticTuning
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v.startsWith('plugin:')) {
                      onSelectPluginTuning(v.slice(7));
                    } else {
                      onSelectPluginTuning(null);
                      if (harpType === 'diatonic10') {
                        onChangeDiatonicTuning(v as DiatonicTuning);
                      } else {
                        onChangeChromaticTuning(v as ChromaticTuning);
                      }
                    }
                  }}
                  className="w-full rounded-lg border border-[#283042] bg-[#0c0e14] px-3 py-2 text-xs text-slate-200"
                >
                  {harpType === 'diatonic10' ? (
                    <>
                      <option value="richter">Richter (标准)</option>
                      <option value="paddy">Paddy Richter</option>
                      <option value="country">Country (乡村)</option>
                      <option value="melody_maker">Melody Maker (MM)</option>
                      <option value="natural_minor">Natural Minor (自然小调)</option>
                    </>
                  ) : (
                    <>
                      <option value="solo">Solo (标准)</option>
                      <option value="c6">C6 (爵士六和弦)</option>
                    </>
                  )}
                  {pluginTunings
                    .filter((pt) => pt.targetType === harpType)
                    .map((pt) => (
                      <option key={pt.id} value={`plugin:${pt.id}`}>
                        [插件] {pt.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowHarpPicker(false)}
              className="w-full rounded-xl bg-sky-500 py-2.5 text-xs font-bold text-slate-950"
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
