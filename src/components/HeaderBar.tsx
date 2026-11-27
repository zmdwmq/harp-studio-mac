import React from 'react';
import { Mic, Headphones, Palette, Globe, HelpCircle, Puzzle, Footprints, Smartphone } from 'lucide-react';
import { AudioInputDevice, MeterAndPitchFrame } from '../audio/AudioEngine';
import {
  ChromaticTuning,
  DiatonicTuning,
  HARMONICA_KEYS,
  HarmonicaKey,
  HarmonicaType,
} from '../core/harmonicaMap';
import { AppLocale, I18nDict, LOCALE_OPTIONS } from '../core/i18n';
import { PluginTheme, PluginTuningExtension } from '../core/pluginSystem';

export type ThemePreference = 'system' | 'dark' | 'light' | 'vintage' | (string & {});
export type UiMode = 'simple' | 'advanced';

const HARMONICA_TYPE_IDS: HarmonicaType[] = [
  'diatonic10',
  'chromatic12',
  'chromatic14',
  'chromatic16',
  'tremolo24',
];

interface HeaderBarProps {
  t: I18nDict;
  uiMode: UiMode;
  onChangeUiMode: (mode: UiMode) => void;
  harpType: HarmonicaType;
  harpKey: HarmonicaKey;
  diatonicTuning: DiatonicTuning;
  chromaticTuning: ChromaticTuning;
  onChangeHarpType: (type: HarmonicaType) => void;
  onChangeHarpKey: (key: HarmonicaKey) => void;
  onChangeDiatonicTuning: (tuning: DiatonicTuning) => void;
  onChangeChromaticTuning: (tuning: ChromaticTuning) => void;
  pluginTunings?: PluginTuningExtension[];
  selectedPluginTuningId?: string | null;
  onSelectPluginTuning?: (id: string | null) => void;
  devices: AudioInputDevice[];
  selectedDeviceId: string;
  onSelectDevice: (id: string) => void;
  micActive: boolean;
  onToggleMic: () => void;
  meter: MeterAndPitchFrame;
  monitorEnabled: boolean;
  onToggleMonitor: () => void;
  themePref: ThemePreference;
  pluginThemes?: PluginTheme[];
  onChangeTheme: (theme: ThemePreference) => void;
  locale: AppLocale;
  onChangeLocale: (locale: AppLocale) => void;
  onOpenPlugins: () => void;
  onOpenPedal: () => void;
  midiDeviceCount?: number;
  onSwitchToMobile?: () => void;
  onOpenHelp: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  t,
  uiMode,
  onChangeUiMode,
  harpType,
  harpKey,
  diatonicTuning,
  chromaticTuning,
  onChangeHarpType,
  onChangeHarpKey,
  onChangeDiatonicTuning,
  onChangeChromaticTuning,
  pluginTunings = [],
  selectedPluginTuningId = null,
  onSelectPluginTuning,
  devices,
  selectedDeviceId,
  onSelectDevice,
  micActive,
  onToggleMic,
  meter,
  monitorEnabled,
  onToggleMonitor,
  themePref,
  pluginThemes = [],
  onChangeTheme,
  locale,
  onChangeLocale,
  onOpenPlugins,
  onOpenPedal,
  midiDeviceCount = 0,
  onSwitchToMobile,
  onOpenHelp,
}) => {
  const meterPct = Math.min(100, Math.round(meter.rms * 320));

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#283042] bg-[#141821] px-6 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-sm font-bold text-white shadow">
            H
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-slate-100">HarpStudio</h1>
            <p className="text-[10px] text-slate-400">{t.appSubtitle}</p>
          </div>
        </div>

        {/* 简洁 / 高级模式切换 */}
        <div className="inline-flex rounded-lg border border-[#283042] bg-[#0c0e14] p-0.5">
          <button
            onClick={() => onChangeUiMode('simple')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              uiMode === 'simple'
                ? 'bg-sky-500/20 text-sky-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.simpleMode}
          </button>
          <button
            onClick={() => onChangeUiMode('advanced')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              uiMode === 'advanced'
                ? 'bg-sky-500/20 text-sky-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.advancedMode}
          </button>
        </div>
      </div>

      {/* 口琴类型与调性 */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={harpType}
          onChange={(e) => onChangeHarpType(e.target.value as HarmonicaType)}
          className="rounded-lg border border-[#283042] bg-[#0c0e14] px-2.5 py-1.5 text-xs text-slate-200"
        >
          {HARMONICA_TYPE_IDS.map((id) => (
            <option key={id} value={id}>
              {t.harpTypes[id]}
            </option>
          ))}
        </select>

        <select
          value={harpKey}
          onChange={(e) => onChangeHarpKey(e.target.value as HarmonicaKey)}
          className="rounded-lg border border-[#283042] bg-[#0c0e14] px-2.5 py-1.5 text-xs text-slate-200"
        >
          {HARMONICA_KEYS.map((k) => (
            <option key={k.key} value={k.key}>
              {k.key}
            </option>
          ))}
        </select>

        {harpType === 'diatonic10' && (
          <select
            value={
              selectedPluginTuningId &&
              pluginTunings.some((pt) => pt.id === selectedPluginTuningId && pt.targetType === 'diatonic10')
                ? `plugin:${selectedPluginTuningId}`
                : diatonicTuning
            }
            onChange={(e) => {
              const v = e.target.value;
              if (v.startsWith('plugin:')) {
                onSelectPluginTuning?.(v.slice(7));
              } else {
                onSelectPluginTuning?.(null);
                onChangeDiatonicTuning(v as DiatonicTuning);
              }
            }}
            className="rounded-lg border border-[#283042] bg-[#0c0e14] px-2 py-1.5 text-xs text-slate-200"
          >
            <option value="richter">Richter (标准)</option>
            <option value="paddy">Paddy Richter</option>
            <option value="country">Country (乡村)</option>
            <option value="melody_maker">Melody Maker (MM)</option>
            <option value="natural_minor">Natural Minor (自然小调)</option>
            {pluginTunings
              .filter((pt) => pt.targetType === 'diatonic10')
              .map((pt) => (
                <option key={pt.id} value={`plugin:${pt.id}`}>
                  [插件] {pt.name}
                </option>
              ))}
          </select>
        )}

        {(harpType === 'chromatic12' ||
          harpType === 'chromatic14' ||
          harpType === 'chromatic16') && (
          <select
            value={
              selectedPluginTuningId &&
              pluginTunings.some((pt) => pt.id === selectedPluginTuningId && pt.targetType === harpType)
                ? `plugin:${selectedPluginTuningId}`
                : chromaticTuning
            }
            onChange={(e) => {
              const v = e.target.value;
              if (v.startsWith('plugin:')) {
                onSelectPluginTuning?.(v.slice(7));
              } else {
                onSelectPluginTuning?.(null);
                onChangeChromaticTuning(v as ChromaticTuning);
              }
            }}
            className="rounded-lg border border-[#283042] bg-[#0c0e14] px-2 py-1.5 text-xs text-slate-200"
          >
            <option value="solo">Solo (标准)</option>
            <option value="c6">C6 (爵士六和弦)</option>
            {pluginTunings
              .filter((pt) => pt.targetType === harpType)
              .map((pt) => (
                <option key={pt.id} value={`plugin:${pt.id}`}>
                  [插件] {pt.name}
                </option>
              ))}
          </select>
        )}
      </div>

      {/* 麦克风、电平表、主题、语言与帮助 */}
      <div className="flex flex-wrap items-center gap-2.5">
        <select
          value={selectedDeviceId}
          onChange={(e) => onSelectDevice(e.target.value)}
          className="max-w-[180px] rounded-lg border border-[#283042] bg-[#0c0e14] px-2.5 py-1.5 text-xs text-slate-200"
        >
          {devices.length === 0 ? (
            <option value="">{t.defaultMic}</option>
          ) : (
            devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label}
              </option>
            ))
          )}
        </select>

        <button
          onClick={onToggleMic}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            micActive
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
          }`}
        >
          <Mic className="h-3.5 w-3.5" />
          {micActive ? t.micOn : t.micOff}
        </button>

        {/* 电平表 + 削波告警 */}
        <div className="flex items-center gap-1.5 rounded-lg border border-[#283042] bg-[#0c0e14] px-2.5 py-1.5">
          <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-800">
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

        {uiMode === 'advanced' && (
          <button
            onClick={onToggleMonitor}
            title={t.monitorTip}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs border transition ${
              monitorEnabled
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                : 'border-[#283042] bg-[#0c0e14] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Headphones className="h-3.5 w-3.5" />
            {monitorEnabled ? t.monitorOn : t.monitorOff}
          </button>
        )}

        <div className="inline-flex items-center gap-1 rounded-lg border border-[#283042] bg-[#0c0e14] px-2 py-1">
          <Palette className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={themePref}
            onChange={(e) => onChangeTheme(e.target.value as ThemePreference)}
            className="bg-transparent text-xs text-slate-200 outline-none"
          >
            <option value="system" className="bg-[#141821] text-slate-100">{t.themeSystem}</option>
            <option value="dark" className="bg-[#141821] text-slate-100">{t.themeDark}</option>
            <option value="light" className="bg-[#141821] text-slate-100">{t.themeLight}</option>
            <option value="vintage" className="bg-[#141821] text-slate-100">{t.themeVintage}</option>
            {pluginThemes.map((pt) => (
              <option key={pt.id} value={pt.id} className="bg-[#141821] text-slate-100">
                {pt.name}
              </option>
            ))}
          </select>
        </div>

        <div className="inline-flex items-center gap-1 rounded-lg border border-[#283042] bg-[#0c0e14] px-2 py-1">
          <Globe className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={locale}
            onChange={(e) => onChangeLocale(e.target.value as AppLocale)}
            className="bg-transparent text-xs text-slate-200 outline-none"
          >
            {LOCALE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-[#141821] text-slate-100">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onOpenPedal}
          title="MIDI / 蓝牙脚踏开关设置"
          className="inline-flex items-center gap-1 rounded-lg border border-[#283042] bg-[#0c0e14] px-2.5 py-1.5 text-xs text-slate-300 hover:border-sky-400 hover:text-sky-300 transition"
        >
          <Footprints className="h-3.5 w-3.5" />
          <span>脚踏</span>
          {midiDeviceCount > 0 && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          onClick={onOpenPlugins}
          className="inline-flex items-center gap-1 rounded-lg border border-[#283042] bg-[#0c0e14] px-2.5 py-1.5 text-xs text-slate-300 hover:border-sky-400 hover:text-sky-300 transition"
        >
          <Puzzle className="h-3.5 w-3.5" />
          {t.pluginsBtn}
        </button>

        {onSwitchToMobile && (
          <button
            onClick={onSwitchToMobile}
            title="切换至手机 4-Tab 移动布局"
            className="inline-flex items-center gap-1 rounded-lg border border-[#283042] bg-[#0c0e14] px-2.5 py-1.5 text-xs text-slate-300 hover:border-sky-400 hover:text-sky-300 transition"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>移动版</span>
          </button>
        )}

        <button
          onClick={onOpenHelp}
          className="inline-flex items-center gap-1 rounded-lg border border-[#283042] bg-[#0c0e14] px-2.5 py-1.5 text-xs text-slate-300 hover:border-sky-400 hover:text-sky-300 transition"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          {t.helpBtn}
        </button>
      </div>
    </header>
  );
};
