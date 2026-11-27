import React from 'react';
import { Capacitor } from '@capacitor/core';
import { Circle, Square, Play, Download, Volume2, Save, FolderOpen, Video } from 'lucide-react';
import {
  AudioEngine,
  AudioInputDevice,
  BackingTrackInfo,
  HarpTrackMeta,
  MeterAndPitchFrame,
  MetronomeSound,
  MetronomeSubdivision,
} from './audio/AudioEngine';
import { startVideoExport } from './audio/VideoExporter';
import { BUILTIN_DSP_PRESETS, BUILTIN_PRESET_LIST, DspPreset, DspPresetId } from './core/dspPresets';
import { BreathAction, ChromaticTuning, DiatonicTuning, HarmonicaKey, HarmonicaType } from './core/harmonicaMap';
import { AppLocale, TRANSLATIONS } from './core/i18n';
import { APP_VERSION } from './core/version';
import {
  HarpProjectFile,
  compressProjectJson,
  decompressProjectBytes,
} from './core/projectSerializer';
import type { PluginHostContext, PluginMetronomePreset } from './core/pluginSystem';
import { platformAdapter } from './adapters/platformAdapter';
import { HeaderBar, ThemePreference, UiMode } from './components/HeaderBar';
import { WaveformPanel } from './components/WaveformPanel';
import { HarmonicaVisualizer } from './components/HarmonicaVisualizer';
import { TrackListPanel } from './components/TrackListPanel';
import { PresetPanel } from './components/PresetPanel';
import { MetronomeBar } from './components/MetronomeBar';
import { HelpModal, OnboardingModal, ScrollingTipsTicker } from './components/HelpAndOnboarding';
import { CircleOfFifthsModal } from './components/CircleOfFifthsModal';
import { PluginManagerModal } from './components/PluginManagerModal';
import { PedalConfigModal } from './components/PedalConfigModal';
import { MobileLayout } from './components/MobileLayout';
import { FollowAlongPanel } from './components/FollowAlongPanel';
import { usePluginSystem } from './hooks/usePluginSystem';
import { usePedalController } from './hooks/usePedalController';

const CUSTOM_PRESETS_STORAGE_KEY = 'harpstudio_custom_presets_v1';
const THEME_STORAGE_KEY = 'harpstudio_theme_v1';
const UI_MODE_STORAGE_KEY = 'harpstudio_ui_mode_v1';
const LOCALE_STORAGE_KEY = 'harpstudio_locale_v1';
const ONBOARDED_STORAGE_KEY = 'harpstudio_onboarded_v1';

function loadThemePreference(): ThemePreference {
  try {
    const val = localStorage.getItem(THEME_STORAGE_KEY);
    if (val) return val;
  } catch {
    // ignore
  }
  return 'system';
}

function loadLocalePreference(): AppLocale {
  try {
    const val = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (val === 'zh' || val === 'en' || val === 'ja') return val;
  } catch {
    // ignore
  }
  return 'zh';
}

function loadCustomPresets(): DspPreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const engineRef = React.useRef<AudioEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new AudioEngine();
  }
  const engine = engineRef.current;

  const [uiMode, setUiMode] = React.useState<UiMode>(() => {
    try {
      return localStorage.getItem(UI_MODE_STORAGE_KEY) === 'advanced' ? 'advanced' : 'simple';
    } catch {
      return 'simple';
    }
  });
  const [layoutMode, setLayoutMode] = React.useState<'auto' | 'mobile' | 'desktop'>(() => {
    try {
      const saved = localStorage.getItem('harpstudio_layout_mode_v1');
      return saved === 'mobile' || saved === 'desktop' ? saved : 'auto';
    } catch {
      return 'auto';
    }
  });
  const [isNarrowScreen, setIsNarrowScreen] = React.useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  );

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsNarrowScreen(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem('harpstudio_layout_mode_v1', layoutMode);
    } catch {
      // ignore
    }
  }, [layoutMode]);

  const useMobileLayout =
    layoutMode === 'mobile' ||
    (layoutMode === 'auto' && (isNarrowScreen || Capacitor.isNativePlatform()));
  const [themePref, setThemePref] = React.useState<ThemePreference>(() => loadThemePreference());
  const [locale, setLocale] = React.useState<AppLocale>(() => loadLocalePreference());
  const [showHelp, setShowHelp] = React.useState(false);
  const [showCircleOfFifths, setShowCircleOfFifths] = React.useState(false);
  const [showPlugins, setShowPlugins] = React.useState(false);
  const [showPedal, setShowPedal] = React.useState(false);
  const [showOnboarding, setShowOnboarding] = React.useState(() => {
    try {
      return localStorage.getItem(ONBOARDED_STORAGE_KEY) !== '1';
    } catch {
      return false;
    }
  });
  const t = TRANSLATIONS[locale];

  const [devices, setDevices] = React.useState<AudioInputDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = React.useState<string>('');
  const [micActive, setMicActive] = React.useState(false);
  const [monitorEnabled, setMonitorEnabled] = React.useState(false);
  const [harpType, setHarpType] = React.useState<HarmonicaType>('diatonic10');
  const [harpKey, setHarpKey] = React.useState<HarmonicaKey>('C');
  const [diatonicTuning, setDiatonicTuning] = React.useState<DiatonicTuning>('richter');
  const [chromaticTuning, setChromaticTuning] = React.useState<ChromaticTuning>('solo');
  const [a4Hz, setA4Hz] = React.useState(440);

  const [meter, setMeter] = React.useState<MeterAndPitchFrame>({
    rms: 0,
    peak: 0,
    clipping: false,
    pitchHz: null,
    confidence: 0,
    match: null,
    tuner: null,
  });

  const [track, setTrack] = React.useState<BackingTrackInfo | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTimeSec, setCurrentTimeSec] = React.useState(0);
  const [tempoRate, setTempoRate] = React.useState(1.0);
  const [pitchSemitones, setPitchSemitones] = React.useState(0);
  const [loopEnabled, setLoopEnabled] = React.useState(false);
  const [loopA, setLoopA] = React.useState(0);
  const [loopB, setLoopB] = React.useState(0);

  const [metroEnabled, setMetroEnabled] = React.useState(false);
  const [metroBpm, setMetroBpm] = React.useState(90);
  const [metroBeats, setMetroBeats] = React.useState(4);
  const [metroSubdivision, setMetroSubdivision] = React.useState<MetronomeSubdivision>('quarter');
  const [metroSound, setMetroSound] = React.useState<MetronomeSound>('woodblock');
  const [metroVol, setMetroVol] = React.useState(0.5);
  const [currentBeat, setCurrentBeat] = React.useState(-1);

  const [statusMsg, setStatusMsg] = React.useState<string>(() => TRANSLATIONS[loadLocalePreference()].statusReady);

  const {
    pluginManager,
    pluginEntries,
    pluginPresets,
    pluginThemes,
    pluginTunings,
    pluginTabs,
    pluginMetronomePresets,
    metronomePluginEnabled,
    multitrackRackPluginEnabled,
    pluginActions,
    persistUserPlugins,
    handleInstallPluginScript,
    handleImportJsonPlugin,
    handleExportJsonPlugin,
    handleUninstallPlugin,
  } = usePluginSystem(setStatusMsg);

  React.useEffect(() => {
    if (!metronomePluginEnabled && metroEnabled) {
      setMetroEnabled(false);
      engine.setMetronomeConfig({ enabled: false });
    }
  }, [metronomePluginEnabled, metroEnabled, engine]);

  const handleApplyMetronomePreset = React.useCallback(
    (preset: PluginMetronomePreset) => {
      setMetroBpm(preset.bpm);
      setMetroBeats(preset.beatsPerBar);
      setMetroSubdivision(preset.subdivision);
      if (preset.sound) {
        setMetroSound(preset.sound);
      }
      engine.setMetronomeConfig({
        bpm: preset.bpm,
        beatsPerBar: preset.beatsPerBar,
        subdivision: preset.subdivision,
        ...(preset.sound ? { sound: preset.sound } : {}),
      });
      setStatusMsg(`已应用节拍预设：${preset.name} (${preset.bpm} BPM)`);
    },
    [engine]
  );

  const [customPresets, setCustomPresets] = React.useState<DspPreset[]>(() => loadCustomPresets());
  const [selectedPluginTuningId, setSelectedPluginTuningId] = React.useState<string | null>(null);
  const activePluginTuning = React.useMemo(
    () =>
      selectedPluginTuningId
        ? pluginTunings.find((pt) => pt.id === selectedPluginTuningId && pt.targetType === harpType)
        : undefined,
    [pluginTunings, selectedPluginTuningId, harpType]
  );

  React.useEffect(() => {
    engine.setHarmonicaConfig(
      harpType,
      harpKey,
      diatonicTuning,
      chromaticTuning,
      activePluginTuning?.holesC
    );
  }, [engine, harpType, harpKey, diatonicTuning, chromaticTuning, activePluginTuning]);
  const allPresets = React.useMemo(
    () => [...BUILTIN_PRESET_LIST, ...pluginPresets, ...customPresets],
    [pluginPresets, customPresets]
  );
  const [presetId, setPresetId] = React.useState<DspPresetId>('bright_folk');
  const [editingParams, setEditingParams] = React.useState<DspPreset>(
    () => ({ ...BUILTIN_DSP_PRESETS.bright_folk })
  );
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordWithBacking, setRecordWithBacking] = React.useState(true);
  const [countInEnabled, setCountInEnabled] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem('harpstudio_countin_v1') === '1';
    } catch {
      return false;
    }
  });
  const [countInBeat, setCountInBeat] = React.useState<number | null>(null);
  const cancelCountInRef = React.useRef<(() => void) | null>(null);
  const [latencyCompensationMs, setLatencyCompensationMs] = React.useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('harpstudio_latency_ms_v1'));
      return Number.isFinite(saved) ? Math.max(-500, Math.min(500, Math.round(saved))) : 0;
    } catch {
      return 0;
    }
  });
  const [isCalibrating, setIsCalibrating] = React.useState(false);
  const [noiseGateEnabled, setNoiseGateEnabled] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem('harpstudio_noisegate_enabled_v1') === '1';
    } catch {
      return false;
    }
  });
  const [noiseGateThresholdDb, setNoiseGateThresholdDb] = React.useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('harpstudio_noisegate_db_v1'));
      return Number.isFinite(saved) ? Math.max(-60, Math.min(-25, Math.round(saved))) : -45;
    } catch {
      return -45;
    }
  });
  const [videoExportProgress, setVideoExportProgress] = React.useState<number | null>(null);
  const cancelVideoExportRef = React.useRef<(() => void) | null>(null);
  const [tracks, setTracks] = React.useState<HarpTrackMeta[]>([]);
  const [backingVol, setBackingVol] = React.useState(0.75);
  const [followAlongTargetCue, setFollowAlongTargetCue] = React.useState<{
    hole: number;
    action: BreathAction;
  } | null>(null);

  React.useEffect(() => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // ignore
    }
  }, [locale]);

  React.useEffect(() => {
    try {
      localStorage.setItem(UI_MODE_STORAGE_KEY, uiMode);
    } catch {
      // ignore
    }
  }, [uiMode]);

  React.useEffect(() => {
    engine.setLatencyCompensationMs(latencyCompensationMs);
    try {
      localStorage.setItem('harpstudio_latency_ms_v1', String(latencyCompensationMs));
    } catch {
      // ignore
    }
  }, [engine, latencyCompensationMs]);

  React.useEffect(() => {
    engine.setNoiseGateConfig(noiseGateEnabled, noiseGateThresholdDb);
    try {
      localStorage.setItem('harpstudio_noisegate_enabled_v1', noiseGateEnabled ? '1' : '0');
      localStorage.setItem('harpstudio_noisegate_db_v1', String(noiseGateThresholdDb));
    } catch {
      // ignore
    }
  }, [engine, noiseGateEnabled, noiseGateThresholdDb]);

  React.useEffect(() => {
    try {
      localStorage.setItem('harpstudio_countin_v1', countInEnabled ? '1' : '0');
    } catch {
      // ignore
    }
  }, [countInEnabled]);

  React.useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themePref);
    } catch {
      // ignore
    }
    const root = document.documentElement;
    const varKeys = [
      '--hs-bg',
      '--hs-panel',
      '--hs-card',
      '--hs-border',
      '--hs-text',
      '--hs-text-sub',
      '--hs-muted',
      '--hs-accent',
    ];
    const matchedPluginTheme = pluginThemes.find((pt) => pt.id === themePref);
    if (matchedPluginTheme) {
      root.setAttribute('data-theme', 'plugin');
      const v = matchedPluginTheme.vars;
      root.style.setProperty('--hs-bg', v.bg);
      root.style.setProperty('--hs-panel', v.panel);
      root.style.setProperty('--hs-card', v.card);
      root.style.setProperty('--hs-border', v.border);
      root.style.setProperty('--hs-text', v.text);
      root.style.setProperty('--hs-text-sub', v.textSub);
      root.style.setProperty('--hs-muted', v.muted);
      root.style.setProperty('--hs-accent', v.accent);
      return;
    }

    for (const k of varKeys) root.style.removeProperty(k);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const resolved =
        themePref === 'system'
          ? mq.matches
            ? 'dark'
            : 'light'
          : themePref === 'light' || themePref === 'vintage' || themePref === 'dark'
            ? themePref
            : 'dark';
      root.setAttribute('data-theme', resolved);
    };
    applyTheme();
    if (themePref === 'system') {
      mq.addEventListener('change', applyTheme);
      return () => mq.removeEventListener('change', applyTheme);
    }
  }, [themePref, pluginThemes]);

  React.useEffect(() => {
    engine.registerCustomPresets([...pluginPresets, ...customPresets]);
    try {
      localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(customPresets));
    } catch {
      // ignore
    }
  }, [engine, pluginPresets, customPresets]);

  React.useEffect(() => {
    engine.setOnBeatCallback((beat) => setCurrentBeat(beat));
    engine.setOnPlaybackEndedCallback(() => {
      setIsPlaying(false);
      setCurrentTimeSec(0);
    });
    void engine.listInputDevices().then((list) => {
      setDevices(list);
      if (list.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(list[0].deviceId);
      }
    });
    return () => {
      cancelCountInRef.current?.();
      cancelVideoExportRef.current?.();
      engine.setMetronomeConfig({ enabled: false });
      engine.setOnBeatCallback(null);
      engine.setOnPlaybackEndedCallback(null);
      engine.stopMic();
    };
  }, [engine]);

  React.useEffect(() => {
    let rafId = 0;
    const tick = () => {
      if (micActive) {
        const frame = engine.pollMeterAndPitch();
        setMeter(frame);
        pluginManager.emitPitch(frame.match, frame.pitchHz);
      }
      if (isPlaying || isRecording) {
        setCurrentTimeSec(engine.getCurrentPlayTimeSec());
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [engine, pluginManager, micActive, isPlaying, isRecording]);

  const handleToggleMic = async () => {
    if (micActive) {
      engine.stopMic();
      setMicActive(false);
      setStatusMsg(t.status.micClosed);
    } else {
      try {
        await engine.startMic(selectedDeviceId || undefined);
        setMicActive(true);
        setStatusMsg(t.status.micConnected);
      } catch (err) {
        setStatusMsg(`${t.status.micError}${String(err)}`);
      }
    }
  };

  const handleSelectDevice = async (nextId: string) => {
    setSelectedDeviceId(nextId);
    if (micActive) {
      try {
        await engine.startMic(nextId || undefined);
        const devName = devices.find((d) => d.deviceId === nextId)?.label ?? t.defaultMic;
        setStatusMsg(`${t.status.micSwitched}${devName}`);
      } catch (err) {
        setStatusMsg(`${t.status.micSwitchError}${String(err)}`);
      }
    }
  };

  const handleImportTrack = async () => {
    const file = await platformAdapter.openAudioFile();
    if (!file) return;
    try {
      const info = await engine.loadBackingTrack(file.name, file.data);
      setTrack(info);
      setLoopA(0);
      setLoopB(info.durationSec);
      setCurrentTimeSec(0);
      setIsPlaying(false);
      setStatusMsg(`${t.status.backingLoaded}${info.name}`);
    } catch (err) {
      setStatusMsg(`${t.status.backingError}${String(err)}`);
    }
  };

  const handleImportTrackToRack = async () => {
    const file = await platformAdapter.openAudioFile();
    if (!file) return;
    try {
      const added = await engine.importTrackFromFile(file.name, file.data);
      setTracks(engine.getTracks());
      setStatusMsg(`${t.status.trackImported}${added.name} (${added.durationSec.toFixed(1)}s)`);
    } catch (err) {
      setStatusMsg(`${t.status.trackImportError}${String(err)}`);
    }
  };

  const handleTogglePlay = () => {
    if (!track) return;
    if (isPlaying) {
      engine.stopPlayback(false);
      setIsPlaying(false);
    } else {
      engine.startPlayback(currentTimeSec, false);
      setIsPlaying(true);
    }
  };

  const handleStopPlay = () => {
    engine.stopPlayback(true);
    setIsPlaying(false);
    setCurrentTimeSec(0);
  };

  const handleSelectPreset = (p: DspPreset) => {
    setPresetId(p.id);
    setEditingParams({ ...p });
    engine.setPreset(p.id);
    setStatusMsg(`${t.status.presetChanged}${p.name}`);
  };

  const handleChangeDspParams = (next: DspPreset) => {
    setEditingParams(next);
    engine.applyCustomDspParams(next);
  };

  const handleSaveCustomPreset = (name: string) => {
    const newPreset: DspPreset = {
      ...editingParams,
      id: `custom-${Date.now()}`,
      name,
      subtitle: `${editingParams.highPassHz}Hz / Drive ${Math.round(editingParams.overdriveAmount * 100)}% / Rev ${Math.round(editingParams.reverbWet * 100)}%`,
      isCustom: true,
    };
    const nextList = [...customPresets, newPreset];
    setCustomPresets(nextList);
    engine.registerCustomPresets(nextList);
    setPresetId(newPreset.id);
    setEditingParams(newPreset);
    engine.setPreset(newPreset.id);
    setStatusMsg(`${t.status.templateSaved}${name}`);
  };

  const handleDeleteCustomPreset = (id: DspPresetId) => {
    const nextList = customPresets.filter((c) => c.id !== id);
    setCustomPresets(nextList);
    if (presetId === id) {
      handleSelectPreset(BUILTIN_DSP_PRESETS.bright_folk);
    }
    setStatusMsg(t.status.templateDeleted);
  };

  const handleToggleRecord = async () => {
    if (countInBeat !== null) {
      cancelCountInRef.current?.();
      cancelCountInRef.current = null;
      setCountInBeat(null);
      setStatusMsg('已取消预备拍');
      return;
    }

    if (!micActive) {
      await handleToggleMic();
    }
    if (isRecording) {
      const created = engine.stopRecording();
      setIsRecording(false);
      setIsPlaying(false);
      setTracks(engine.getTracks());
      if (created) {
        pluginManager.emitRecordingComplete(created.durationSec, created.name);
      }
      setStatusMsg(
        created
          ? `${t.status.recAdded}${created.name} (${created.durationSec.toFixed(1)}s)`
          : t.status.recEmpty
      );
    } else {
      const beginActualRecording = () => {
        engine.startRecording(recordWithBacking);
        setIsRecording(true);
        if (recordWithBacking && (track || tracks.length > 0)) setIsPlaying(true);
        setStatusMsg(tracks.length > 0 ? t.status.recOverdubbing : t.status.recFirst);
      };

      if (countInEnabled) {
        setCountInBeat(1);
        setStatusMsg(`${t.countInBeatPrefix} 1/${metroBeats}...`);
        cancelCountInRef.current = engine.startCountIn(
          {
            bpm: metroBpm,
            beatsPerBar: metroBeats,
            sound: metroSound,
            volume: metroVol,
          },
          (beatIdx, total) => {
            const num = beatIdx + 1;
            setCountInBeat(num);
            setStatusMsg(`${t.countInBeatPrefix} ${num}/${total}...`);
          },
          () => {
            cancelCountInRef.current = null;
            setCountInBeat(null);
            beginActualRecording();
          }
        );
      } else {
        beginActualRecording();
      }
    }
  };

  const handleCalibrateLatency = async () => {
    if (isCalibrating || isRecording) return;
    if (!micActive) {
      await handleToggleMic();
    }
    setIsCalibrating(true);
    setStatusMsg('正在发出校准脉冲，请保持环境安静并打开扬声器...');
    try {
      const res = await engine.measureLoopbackLatencyMs();
      if (res.ok && res.latencyMs !== undefined) {
        setLatencyCompensationMs(res.latencyMs);
        setStatusMsg(`校准完成：测得往返延迟 ${res.latencyMs} ms，后续叠录将自动对齐`);
      } else {
        setStatusMsg('未检测到扬声器回环脉冲（若戴耳机请使用下方 -5/+5 手动微调延迟）');
      }
    } finally {
      setIsCalibrating(false);
    }
  };

  const handlePreviewMix = () => {
    if (tracks.length === 0 && !track) return;
    if (isPlaying) {
      engine.stopPlayback(true);
      setIsPlaying(false);
    } else {
      engine.startPlayback(0, true);
      setIsPlaying(true);
      setStatusMsg(`${t.status.previewing} (${tracks.length} ${t.trackUnit})`);
    }
  };

  const handleExport = async (format: 'wav' | 'mp3') => {
    setStatusMsg(t.status.exporting);
    const bytes = format === 'mp3' ? await engine.exportMixMp3(320) : await engine.exportMixWav();
    if (!bytes) {
      setStatusMsg(t.status.exportEmpty);
      return;
    }
    const baseName = track ? track.name.replace(/\.[^.]+$/, '') : 'HarpStudio_Mix';
    const result = await platformAdapter.saveAudioFile(
      `${baseName}_HarpStudio.${format}`,
      bytes,
      format
    );
    setStatusMsg(
      result.saved
        ? `${t.status.exportDone}${result.filePath ?? `${baseName}.${format}`}`
        : t.status.exportCanceled
    );
  };

  const handleExportVideo = async () => {
    if (videoExportProgress !== null) {
      cancelVideoExportRef.current?.();
      cancelVideoExportRef.current = null;
      setVideoExportProgress(null);
      setStatusMsg(t.status.exportCanceled);
      return;
    }

    setStatusMsg('正在渲染混音与口琴孔位动画视频...');
    setVideoExportProgress(0);
    try {
      const buffers = await engine.renderMixAndHarpBuffers();
      if (!buffers) {
        setVideoExportProgress(null);
        setStatusMsg(t.status.exportEmpty);
        return;
      }
      const cfg = engine.getHarmonicaConfig();
      const baseName = track
        ? track.name.replace(/\.[^.]+$/, '')
        : tracks[0]?.name || 'HarpStudio_Cover';
      const activePluginTheme = pluginThemes.find((pt) => pt.id === themePref);
      const isLight =
        !activePluginTheme &&
        (themePref === 'light' ||
          (themePref === 'system' &&
            typeof window !== 'undefined' &&
            !window.matchMedia('(prefers-color-scheme: dark)').matches));
      const themeColors = activePluginTheme
        ? activePluginTheme.vars
        : themePref === 'vintage'
          ? {
              bg: '#1c1510',
              panel: '#261d16',
              card: '#31251c',
              border: '#4d3b2c',
              text: '#f5ebd6',
              muted: '#b59d82',
              accent: '#f59e0b',
            }
          : isLight
            ? {
                bg: '#f1f5f9',
                panel: '#ffffff',
                card: '#e2e8f0',
                border: '#cbd5e1',
                text: '#0f172a',
                muted: '#64748b',
                accent: '#0284c7',
              }
            : undefined;
      const labels =
        locale === 'en'
          ? { playingText: '♪ Playing...', holePrefix: 'Hole' }
          : locale === 'ja'
            ? { playingText: '♪ 演奏中...', holePrefix: '穴' }
            : { playingText: '♪ 吹奏中...', holePrefix: '孔' };

      const exporter = startVideoExport({
        ctx: engine.getAudioContextForExport(),
        mixBuffer: buffers.mixBuffer,
        harpBuffer: buffers.harpBuffer,
        harmonicaType: cfg.harmonicaType,
        harmonicaKey: cfg.harmonicaKey,
        diatonicTuning: cfg.diatonicTuning,
        chromaticTuning: cfg.chromaticTuning,
        customHolesC: cfg.customHolesC,
        a4Hz: cfg.a4Hz,
        title: baseName,
        subtitle: `${cfg.harmonicaKey} · ${t.harpTypes[cfg.harmonicaType]}`,
        versionText: APP_VERSION,
        themeColors,
        labels,
        onProgress: (p, elapsed, total) => {
          setVideoExportProgress(p);
          setStatusMsg(
            `正在生成视频 ${Math.round(p * 100)}% (${elapsed.toFixed(1)}s / ${total.toFixed(1)}s)...`
          );
        },
      });
      cancelVideoExportRef.current = exporter.cancel;
      const blob = await exporter.promise;
      cancelVideoExportRef.current = null;
      setVideoExportProgress(null);

      const videoBytes = new Uint8Array(await blob.arrayBuffer());
      const saveRes = await platformAdapter.saveAudioFile(
        `${baseName}_HarpStudio.webm`,
        videoBytes,
        'webm'
      );
      setStatusMsg(
        saveRes.saved
          ? `${t.status.exportDone}${saveRes.filePath ?? `${baseName}_HarpStudio.webm`}`
          : t.status.exportCanceled
      );
    } catch (err) {
      cancelVideoExportRef.current = null;
      setVideoExportProgress(null);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'EXPORT_CANCELLED') {
        setStatusMsg(t.status.exportCanceled);
      } else {
        setStatusMsg(`视频导出失败: ${msg}`);
      }
    }
  };

  const handleSaveProject = async () => {
    setStatusMsg(t.status.projSaving);
    const proj = engine.exportProjectData(customPresets);
    const baseName = track ? track.name.replace(/\.[^.]+$/, '') : 'HarpStudio_Project';
    const compressed = await compressProjectJson(JSON.stringify(proj));
    const result = await platformAdapter.saveProjectFile(`${baseName}.harpproj`, compressed);
    setStatusMsg(
      result.saved
        ? `${t.status.projSaved}${result.filePath ?? `${baseName}.harpproj`}`
        : t.status.projSaveCanceled
    );
  };

  const handleOpenProject = async () => {
    const file = await platformAdapter.openProjectFile();
    if (!file) return;
    try {
      const jsonText = await decompressProjectBytes(file.data);
      const parsed = JSON.parse(jsonText) as HarpProjectFile;
      if (!parsed || parsed.version !== 1) {
        setStatusMsg(t.status.projBadFormat);
        return;
      }
      if (Array.isArray(parsed.customPresets) && parsed.customPresets.length > 0) {
        const merged = [...customPresets];
        for (const cp of parsed.customPresets) {
          if (!merged.some((m) => m.id === cp.id)) merged.push(cp);
        }
        setCustomPresets(merged);
        engine.registerCustomPresets(merged);
      }
      const restored = await engine.loadProjectData(parsed);
      setHarpType(parsed.harmonicaType);
      setHarpKey(parsed.harmonicaKey);
      setA4Hz(parsed.a4Hz || 440);
      setTrack(restored.backingInfo);
      setTracks(restored.tracks);
      setBackingVol(parsed.backingParams.volume);
      setTempoRate(parsed.backingParams.tempoRate);
      setPitchSemitones(parsed.backingParams.pitchSemitones);
      setLoopEnabled(parsed.backingParams.loopEnabled);
      setLoopA(parsed.backingParams.loopA);
      setLoopB(parsed.backingParams.loopB);
      setCurrentTimeSec(0);
      setIsPlaying(false);
      setStatusMsg(`${t.status.projRestored}${file.name} (${restored.tracks.length} ${t.trackUnit})`);
    } catch (err) {
      setStatusMsg(`${t.status.projOpenError}${String(err)}`);
    }
  };

  const pluginHostContext: PluginHostContext = {
    getHarpType: () => harpType,
    getHarpKey: () => harpKey,
    setStatusMessage: (msg) => setStatusMsg(msg),
    selectPresetById: (id) => {
      const found = allPresets.find((p) => p.id === id);
      if (found) handleSelectPreset(found);
    },
  };

  const {
    pedalBindings,
    updateBindings: updatePedalBindings,
    learningPedalAction,
    setLearningPedalAction,
    midiSupported,
    midiDevices,
  } = usePedalController((action) => {
    if (action === 'toggleRecord') {
      void handleToggleRecord();
    } else if (action === 'togglePlay') {
      if (track) {
        if (isPlaying) {
          engine.stopPlayback(false);
          setIsPlaying(false);
        } else {
          engine.startPlayback(undefined, true);
          setIsPlaying(true);
        }
      } else if (tracks.length > 0) {
        handlePreviewMix();
      }
    } else if (action === 'toggleLoop') {
      const next = !loopEnabled;
      setLoopEnabled(next);
      engine.setLoop(next, loopA, loopB);
      setStatusMsg(next ? '脚踏已开启 AB 循环' : '脚踏已关闭 AB 循环');
    } else if (action === 'nextPreset') {
      if (allPresets.length > 0) {
        const idx = allPresets.findIndex((p) => p.id === presetId);
        const nextPreset = allPresets[(idx + 1) % allPresets.length];
        handleSelectPreset(nextPreset);
      }
    }
  }, setStatusMsg);

  return (
    <div className="flex min-h-screen flex-col bg-[#0c0e14] text-slate-100">
      {useMobileLayout ? (
        <MobileLayout
          t={t}
          locale={locale}
          onChangeLocale={setLocale}
          themePref={themePref}
          pluginThemes={pluginThemes}
          onChangeTheme={setThemePref}
          harpType={harpType}
          harpKey={harpKey}
          diatonicTuning={diatonicTuning}
          chromaticTuning={chromaticTuning}
          pluginTunings={pluginTunings}
          selectedPluginTuningId={selectedPluginTuningId}
          activeCustomHolesC={activePluginTuning?.holesC}
          onChangeHarpType={(ht) => {
            setHarpType(ht);
            engine.setHarmonicaConfig(ht, harpKey, diatonicTuning, chromaticTuning);
          }}
          onChangeHarpKey={(k) => {
            setHarpKey(k);
            engine.setHarmonicaConfig(harpType, k, diatonicTuning, chromaticTuning);
          }}
          onChangeDiatonicTuning={(tn) => {
            setDiatonicTuning(tn);
            engine.setHarmonicaConfig(harpType, harpKey, tn, chromaticTuning);
          }}
          onChangeChromaticTuning={(ct) => {
            setChromaticTuning(ct);
            engine.setHarmonicaConfig(harpType, harpKey, diatonicTuning, ct);
          }}
          onSelectPluginTuning={setSelectedPluginTuningId}
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={handleSelectDevice}
          micActive={micActive}
          onToggleMic={handleToggleMic}
          meter={meter}
          a4Hz={a4Hz}
          onChangeA4Hz={(hz) => {
            setA4Hz(hz);
            engine.setA4Reference(hz);
          }}
          track={track}
          currentTimeSec={currentTimeSec}
          isPlaying={isPlaying}
          tempoRate={tempoRate}
          pitchSemitones={pitchSemitones}
          loopEnabled={loopEnabled}
          loopA={loopA}
          loopB={loopB}
          onImportTrack={handleImportTrack}
          onTogglePlay={handleTogglePlay}
          onStopPlay={handleStopPlay}
          onSeek={(sec) => {
            setCurrentTimeSec(sec);
            if (isPlaying) engine.startPlayback(sec, false);
          }}
          onTempoChange={(tp) => {
            setTempoRate(tp);
            engine.setTempoAndPitch(tp, pitchSemitones);
          }}
          onPitchChange={(p) => {
            setPitchSemitones(p);
            engine.setTempoAndPitch(tempoRate, p);
          }}
          onSetLoopA={() => {
            setLoopA(currentTimeSec);
            engine.setLoop(loopEnabled, currentTimeSec, loopB);
          }}
          onSetLoopB={() => {
            setLoopB(currentTimeSec);
            engine.setLoop(loopEnabled, loopA, currentTimeSec);
          }}
          onToggleLoop={() => {
            const next = !loopEnabled;
            setLoopEnabled(next);
            engine.setLoop(next, loopA, loopB);
          }}
          onOpenCircleOfFifths={() => setShowCircleOfFifths(true)}
          metroEnabled={metroEnabled}
          metroBpm={metroBpm}
          metroBeats={metroBeats}
          metroSubdivision={metroSubdivision}
          metroSound={metroSound}
          metroVol={metroVol}
          currentBeat={currentBeat}
          metronomePluginEnabled={metronomePluginEnabled}
          pluginMetronomePresets={pluginMetronomePresets}
          onApplyMetronomePreset={handleApplyMetronomePreset}
          multitrackRackPluginEnabled={multitrackRackPluginEnabled}
          onToggleMetro={() => {
            const next = !metroEnabled;
            setMetroEnabled(next);
            engine.setMetronomeConfig({
              enabled: next,
              bpm: metroBpm,
              beatsPerBar: metroBeats,
              subdivision: metroSubdivision,
              sound: metroSound,
              volume: metroVol,
            });
          }}
          onChangeMetroBpm={(b) => {
            setMetroBpm(b);
            engine.setMetronomeConfig({ bpm: b });
          }}
          onChangeMetroBeats={(beats) => {
            setMetroBeats(beats);
            engine.setMetronomeConfig({ beatsPerBar: beats });
          }}
          onChangeMetroSubdivision={(sub) => {
            setMetroSubdivision(sub);
            engine.setMetronomeConfig({ subdivision: sub });
          }}
          onChangeMetroSound={(s) => {
            setMetroSound(s);
            engine.setMetronomeConfig({ sound: s });
          }}
          onChangeMetroVol={(v) => {
            setMetroVol(v);
            engine.setMetronomeConfig({ volume: v });
          }}
          allPresets={allPresets}
          presetId={presetId}
          editingParams={editingParams}
          onSelectPreset={handleSelectPreset}
          onChangeDspParams={handleChangeDspParams}
          onSaveCustomPreset={handleSaveCustomPreset}
          onDeleteCustomPreset={handleDeleteCustomPreset}
          tracks={tracks}
          onImportTrackToRack={handleImportTrackToRack}
          onUpdateTrack={(id, patch) => setTracks(engine.updateTrack(id, patch))}
          onDeleteTrack={(id) => setTracks(engine.deleteTrack(id))}
          isRecording={isRecording}
          countInEnabled={countInEnabled}
          onToggleCountIn={setCountInEnabled}
          countInBeat={countInBeat}
          recordWithBacking={recordWithBacking}
          onToggleRecordWithBacking={setRecordWithBacking}
          latencyCompensationMs={latencyCompensationMs}
          onChangeLatencyMs={setLatencyCompensationMs}
          isCalibrating={isCalibrating}
          onCalibrateLatency={handleCalibrateLatency}
          noiseGateEnabled={noiseGateEnabled}
          onToggleNoiseGate={setNoiseGateEnabled}
          noiseGateThresholdDb={noiseGateThresholdDb}
          onChangeNoiseGateDb={setNoiseGateThresholdDb}
          onToggleRecord={handleToggleRecord}
          onPreviewMix={handlePreviewMix}
          onExportAudio={handleExport}
          onExportVideo={handleExportVideo}
          videoExportProgress={videoExportProgress}
          backingVol={backingVol}
          onChangeBackingVol={(v) => {
            setBackingVol(v);
            engine.setBackingVolume(v);
          }}
          onSaveProject={handleSaveProject}
          onOpenProject={handleOpenProject}
          onOpenPlugins={() => setShowPlugins(true)}
          onOpenPedal={() => setShowPedal(true)}
          midiDeviceCount={midiDevices.length}
          onOpenHelp={() => setShowHelp(true)}
          onSwitchToDesktop={() => setLayoutMode('desktop')}
          pluginTabs={pluginTabs}
          followAlongTargetCue={followAlongTargetCue}
          onFollowAlongTargetCueChange={setFollowAlongTargetCue}
          onStartFollowCountIn={(bpmVal, onDone) =>
            engine.startCountIn(
              { bpm: bpmVal, beatsPerBar: metroBeats, sound: metroSound, volume: metroVol },
              () => {},
              onDone
            )
          }
          onEnsureMic={async () => {
            if (!micActive) await handleToggleMic();
          }}
          onStatusMessage={setStatusMsg}
          statusMsg={statusMsg}
        />
      ) : (
        <>
          <HeaderBar
        t={t}
        uiMode={uiMode}
        onChangeUiMode={setUiMode}
        harpType={harpType}
        harpKey={harpKey}
        diatonicTuning={diatonicTuning}
        chromaticTuning={chromaticTuning}
        onChangeHarpType={(ht) => {
          setHarpType(ht);
          engine.setHarmonicaConfig(ht, harpKey, diatonicTuning, chromaticTuning);
        }}
        onChangeHarpKey={(k) => {
          setHarpKey(k);
          engine.setHarmonicaConfig(harpType, k, diatonicTuning, chromaticTuning);
        }}
        onChangeDiatonicTuning={(tn) => {
          setDiatonicTuning(tn);
          engine.setHarmonicaConfig(harpType, harpKey, tn, chromaticTuning);
        }}
        onChangeChromaticTuning={(ct) => {
          setChromaticTuning(ct);
          engine.setHarmonicaConfig(harpType, harpKey, diatonicTuning, ct);
        }}
        pluginTunings={pluginTunings}
        selectedPluginTuningId={selectedPluginTuningId}
        onSelectPluginTuning={setSelectedPluginTuningId}
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={handleSelectDevice}
        micActive={micActive}
        onToggleMic={handleToggleMic}
        meter={meter}
        monitorEnabled={monitorEnabled}
        onToggleMonitor={() => {
          const next = !monitorEnabled;
          setMonitorEnabled(next);
          engine.setMonitorEnabled(next);
        }}
        themePref={themePref}
        pluginThemes={pluginThemes}
        onChangeTheme={setThemePref}
        locale={locale}
        onChangeLocale={setLocale}
        onOpenPlugins={() => setShowPlugins(true)}
        onOpenPedal={() => setShowPedal(true)}
        midiDeviceCount={midiDevices.length}
        onSwitchToMobile={() => setLayoutMode('mobile')}
        onOpenHelp={() => setShowHelp(true)}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 p-6">
        <WaveformPanel
          t={t}
          compact={uiMode !== 'advanced'}
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
          onImportTrack={handleImportTrack}
          onTogglePlay={handleTogglePlay}
          onStop={handleStopPlay}
          onSeek={(sec) => {
            setCurrentTimeSec(sec);
            if (isPlaying) engine.startPlayback(sec, false);
          }}
          onTempoChange={(tp) => {
            setTempoRate(tp);
            engine.setTempoAndPitch(tp, pitchSemitones);
          }}
          onPitchChange={(p) => {
            setPitchSemitones(p);
            engine.setTempoAndPitch(tempoRate, p);
          }}
          onSetLoopA={() => {
            setLoopA(currentTimeSec);
            engine.setLoop(loopEnabled, currentTimeSec, loopB);
          }}
          onSetLoopB={() => {
            setLoopB(currentTimeSec);
            engine.setLoop(loopEnabled, loopA, currentTimeSec);
          }}
          onToggleLoop={() => {
            const next = !loopEnabled;
            setLoopEnabled(next);
            engine.setLoop(next, loopA, loopB);
          }}
          onOpenCircleOfFifths={() => setShowCircleOfFifths(true)}
        />

        {uiMode === 'advanced' && metronomePluginEnabled && (
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
            onApplyPreset={handleApplyMetronomePreset}
            onToggle={() => {
              const next = !metroEnabled;
              setMetroEnabled(next);
              engine.setMetronomeConfig({
                enabled: next,
                bpm: metroBpm,
                beatsPerBar: metroBeats,
                subdivision: metroSubdivision,
                sound: metroSound,
                volume: metroVol,
              });
            }}
            onChangeBpm={(b) => {
              setMetroBpm(b);
              engine.setMetronomeConfig({ bpm: b });
            }}
            onChangeBeatsPerBar={(beats) => {
              setMetroBeats(beats);
              engine.setMetronomeConfig({ beatsPerBar: beats });
            }}
            onChangeSubdivision={(sub) => {
              setMetroSubdivision(sub);
              engine.setMetronomeConfig({ subdivision: sub });
            }}
            onChangeSound={(s) => {
              setMetroSound(s);
              engine.setMetronomeConfig({ sound: s });
            }}
            onChangeVolume={(v) => {
              setMetroVol(v);
              engine.setMetronomeConfig({ volume: v });
            }}
          />
        )}

        <HarmonicaVisualizer
          t={t}
          type={harpType}
          harpKey={harpKey}
          diatonicTuning={diatonicTuning}
          chromaticTuning={chromaticTuning}
          customHolesC={activePluginTuning?.holesC}
          targetCue={followAlongTargetCue}
          pitchHz={meter.pitchHz}
          match={meter.match}
          tuner={meter.tuner}
          a4Hz={a4Hz}
          onChangeA4Hz={(hz) => {
            setA4Hz(hz);
            engine.setA4Reference(hz);
          }}
        />

        {pluginTabs.length > 0 && (
          <FollowAlongPanel
            tabs={pluginTabs}
            harmonicaType={harpType}
            harpKey={harpKey}
            diatonicTuning={diatonicTuning}
            chromaticTuning={chromaticTuning}
            customHolesC={activePluginTuning?.holesC}
            match={meter.match}
            micActive={micActive}
            onEnsureMic={async () => {
              if (!micActive) await handleToggleMic();
            }}
            onStartCountIn={(bpmVal, onDone) =>
              engine.startCountIn(
                { bpm: bpmVal, beatsPerBar: metroBeats, sound: metroSound, volume: metroVol },
                () => {},
                onDone
              )
            }
            onTargetCueChange={setFollowAlongTargetCue}
            onStatusMessage={setStatusMsg}
          />
        )}

        {uiMode === 'advanced' && multitrackRackPluginEnabled && (
          <TrackListPanel
            t={t}
            tracks={tracks}
            presets={allPresets}
            onImportTrack={handleImportTrackToRack}
            onUpdateTrack={(id, patch) => setTracks(engine.updateTrack(id, patch))}
            onDeleteTrack={(id) => setTracks(engine.deleteTrack(id))}
          />
        )}

        <section className="grid gap-5 lg:grid-cols-12">
          <PresetPanel
            t={t}
            compact={uiMode !== 'advanced'}
            presets={allPresets}
            selectedPresetId={presetId}
            editingParams={editingParams}
            onSelectPreset={handleSelectPreset}
            onChangeParams={handleChangeDspParams}
            onSaveCustomPreset={handleSaveCustomPreset}
            onDeleteCustomPreset={handleDeleteCustomPreset}
          />

          <div className="flex flex-col justify-between rounded-xl border border-[#283042] bg-[#141821] p-4 shadow-lg lg:col-span-5">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t.recExportTitle}
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={countInEnabled}
                      onChange={(e) => setCountInEnabled(e.target.checked)}
                      className="rounded"
                    />
                    {t.countInLabel}
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recordWithBacking}
                      onChange={(e) => setRecordWithBacking(e.target.checked)}
                      className="rounded"
                    />
                    {t.syncBackingLabel}
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#283042] bg-[#0c0e14] px-3 py-1.5 text-xs">
                <span className="text-slate-400">{t.latencyCalibrateLabel}:</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded border border-[#283042] bg-[#141821] px-1.5 py-0.5 font-mono text-[11px]">
                    <button
                      type="button"
                      onClick={() => setLatencyCompensationMs((v) => Math.max(-500, v - 5))}
                      className="rounded px-1 text-slate-400 hover:bg-slate-800 hover:text-sky-300"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => setLatencyCompensationMs(0)}
                      title="点击归零"
                      className="min-w-[44px] text-center text-sky-300"
                    >
                      {latencyCompensationMs}ms
                    </button>
                    <button
                      type="button"
                      onClick={() => setLatencyCompensationMs((v) => Math.min(500, v + 5))}
                      className="rounded px-1 text-slate-400 hover:bg-slate-800 hover:text-sky-300"
                    >
                      +5
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleCalibrateLatency}
                    disabled={isCalibrating || isRecording || countInBeat !== null}
                    className="rounded-md border border-sky-500/30 bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-medium text-sky-300 hover:bg-sky-500/25 disabled:opacity-40 transition"
                  >
                    {isCalibrating ? t.calibratingBtn : t.calibrateBtn}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#283042] bg-[#0c0e14] px-3 py-1.5 text-xs">
                <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noiseGateEnabled}
                    onChange={(e) => setNoiseGateEnabled(e.target.checked)}
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
                    onChange={(e) => setNoiseGateThresholdDb(Number(e.target.value))}
                    className="w-24 disabled:opacity-40"
                  />
                  <span className="min-w-[42px] text-right font-mono text-[11px] text-slate-400">
                    {noiseGateThresholdDb}dB
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleRecord}
                  className={`flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-bold transition ${
                    isRecording
                      ? 'bg-rose-600 text-white animate-pulse'
                      : countInBeat !== null
                        ? 'bg-amber-500 text-slate-950 animate-pulse'
                        : 'bg-rose-500 text-white hover:bg-rose-400'
                  }`}
                >
                  {isRecording || countInBeat !== null ? (
                    <Square className="h-4 w-4 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 fill-current" />
                  )}
                  {countInBeat !== null
                    ? `${t.countInBeatPrefix} ${countInBeat}/${metroBeats}`
                    : isRecording
                      ? t.stopRec
                      : tracks.length > 0
                        ? `${t.overdubPrefix} ${tracks.length + 1} ${t.overdubSuffix}`
                        : t.startRec}
                </button>

                <button
                  onClick={handlePreviewMix}
                  disabled={tracks.length === 0 && !track}
                  className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-[#283042] bg-[#1b202c] px-5 py-3 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-40 transition"
                >
                  <Play className="h-4 w-4 shrink-0" />
                  {t.previewMix}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <button
                  onClick={() => handleExport('wav')}
                  disabled={(tracks.length === 0 && !track) || videoExportProgress !== null}
                  className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-40 transition"
                >
                  <Download className="h-4 w-4 shrink-0" />
                  WAV
                </button>

                <button
                  onClick={() => handleExport('mp3')}
                  disabled={(tracks.length === 0 && !track) || videoExportProgress !== null}
                  className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-sky-500 px-3 py-2.5 text-xs font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-40 transition"
                >
                  <Download className="h-4 w-4 shrink-0" />
                  MP3
                </button>

                <button
                  onClick={handleExportVideo}
                  disabled={tracks.length === 0 && !track}
                  title="一键导出带动态口琴孔位动画的 720p WebM 视频（导出中点击可取消）"
                  className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-bold transition disabled:opacity-40 ${
                    videoExportProgress !== null
                      ? 'bg-amber-500 text-slate-950 animate-pulse'
                      : 'bg-violet-500 text-white hover:bg-violet-400'
                  }`}
                >
                  <Video className="h-4 w-4 shrink-0" />
                  {videoExportProgress !== null
                    ? `${Math.round(videoExportProgress * 100)}%`
                    : t.exportVideoBtn}
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#283042] pt-3">
              <div className="flex flex-1 min-w-[160px] items-center gap-2">
                <Volume2 className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs text-slate-400 whitespace-nowrap">{t.backingVol}</span>
                <input
                  type="range"
                  min={0}
                  max={1.2}
                  step={0.05}
                  value={backingVol}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setBackingVol(v);
                    engine.setBackingVolume(v);
                  }}
                  className="w-full"
                />
                <span className="w-10 text-right font-mono text-xs text-slate-400">
                  {Math.round(backingVol * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenProject}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#283042] bg-[#1b202c] px-2.5 py-1.5 text-xs text-slate-200 hover:border-slate-500 transition"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-sky-400" />
                  {t.openProject}
                </button>
                <button
                  onClick={handleSaveProject}
                  disabled={tracks.length === 0 && !track}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#283042] bg-[#1b202c] px-2.5 py-1.5 text-xs text-slate-200 hover:border-sky-400 disabled:opacity-40 transition"
                >
                  <Save className="h-3.5 w-3.5 text-emerald-400" />
                  {t.saveProject}
                </button>
              </div>
            </div>
          </div>
        </section>
        {/* 插件快捷工具条（当已启用插件提供动作按钮时显示） */}
        {pluginActions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#283042] bg-[#141821] px-4 py-2 text-xs">
            <span className="font-semibold text-slate-400">{t.pluginsBtn}:</span>
            {pluginActions.map(({ pluginId, action }) => (
              <button
                key={`${pluginId}-${action.id}`}
                onClick={() => action.onTrigger(pluginHostContext)}
                className="rounded-lg border border-[#283042] bg-[#1b202c] px-2.5 py-1 text-xs text-sky-300 hover:border-sky-400 transition"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

      </main>

      <footer className="grid grid-cols-1 items-center gap-2 border-t border-[#283042] bg-[#141821] px-5 py-2 text-xs text-slate-400 md:grid-cols-3">
        <span className="truncate">{statusMsg}</span>
        <span className="text-center font-mono text-[11px] font-semibold text-slate-400">
          HarpStudio {APP_VERSION}
        </span>
        <div className="flex md:justify-end">
          <ScrollingTipsTicker locale={locale} />
        </div>
      </footer>
        </>
      )}

      {showOnboarding && (
        <OnboardingModal
          locale={locale}
          onClose={() => {
            setShowOnboarding(false);
            try {
              localStorage.setItem(ONBOARDED_STORAGE_KEY, '1');
            } catch {
              // ignore
            }
          }}
        />
      )}

      {showHelp && (
        <HelpModal
          locale={locale}
          onClose={() => setShowHelp(false)}
          onReplayTour={() => setShowOnboarding(true)}
        />
      )}

      {showCircleOfFifths && (
        <CircleOfFifthsModal
          locale={locale}
          harpKey={harpKey}
          onClose={() => setShowCircleOfFifths(false)}
        />
      )}

      {showPlugins && (
        <PluginManagerModal
          locale={locale}
          entries={pluginEntries}
          onTogglePlugin={(id, en) => {
            pluginManager.setEnabled(id, en);
            persistUserPlugins();
          }}
          onInstallScript={handleInstallPluginScript}
          onImportJsonPlugin={handleImportJsonPlugin}
          onExportJsonPlugin={handleExportJsonPlugin}
          onUninstallPlugin={handleUninstallPlugin}
          onClose={() => setShowPlugins(false)}
        />
      )}

      <PedalConfigModal
        open={showPedal}
        onClose={() => setShowPedal(false)}
        bindings={pedalBindings}
        learningAction={learningPedalAction}
        onStartLearn={setLearningPedalAction}
        onChangeBindings={updatePedalBindings}
        midiSupported={midiSupported}
        midiDevices={midiDevices}
      />
    </div>
  );
}
