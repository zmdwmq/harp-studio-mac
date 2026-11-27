/**
 * 口琴专属 DSP 预设参数模型与自定义模版支持（纯 TypeScript，零平台依赖）
 */

export type BuiltInPresetId = 'dry' | 'bright_folk' | 'warm_chromatic' | 'chicago_blues';
export type DspPresetId = BuiltInPresetId | (string & {});

export interface DspPreset {
  id: DspPresetId;
  name: string;
  subtitle: string;
  isCustom?: boolean;
  highPassHz: number;
  lowPassHz: number;
  eqLowDb: number;
  eqMidFreq: number;
  eqMidDb: number;
  eqHighDb: number;
  compThresholdDb: number;
  compRatio: number;
  overdriveAmount: number; // 0 ~ 1
  reverbWet: number; // 0 ~ 1
  reverbDecaySec: number;
  delayMs: number;
  delayFeedback: number;
}

export const BUILTIN_DSP_PRESETS: Record<BuiltInPresetId, DspPreset> = {
  dry: {
    id: 'dry',
    name: '干声无损',
    subtitle: '仅防喷高通与防爆音保护，适合练琴与后期',
    highPassHz: 60,
    lowPassHz: 18000,
    eqLowDb: 0,
    eqMidFreq: 1000,
    eqMidDb: 0,
    eqHighDb: 0,
    compThresholdDb: -6,
    compRatio: 1.5,
    overdriveAmount: 0,
    reverbWet: 0,
    reverbDecaySec: 0.5,
    delayMs: 0,
    delayFeedback: 0,
  },
  bright_folk: {
    id: 'bright_folk',
    name: '清亮独奏',
    subtitle: '流行/民谣十孔 & 24孔复音专属，通透防刺耳',
    highPassHz: 85,
    lowPassHz: 16000,
    eqLowDb: -2,
    eqMidFreq: 3800,
    eqMidDb: -1.5,
    eqHighDb: 2.2,
    compThresholdDb: -18,
    compRatio: 3.0,
    overdriveAmount: 0,
    reverbWet: 0.18,
    reverbDecaySec: 1.4,
    delayMs: 0,
    delayFeedback: 0,
  },
  warm_chromatic: {
    id: 'warm_chromatic',
    name: '温暖半音阶',
    subtitle: '爵士/抒情半音阶，保留弱奏细节与丝滑质感',
    highPassHz: 75,
    lowPassHz: 11000,
    eqLowDb: 1.5,
    eqMidFreq: 400,
    eqMidDb: 1.5,
    eqHighDb: -2.0,
    compThresholdDb: -20,
    compRatio: 3.5,
    overdriveAmount: 0,
    reverbWet: 0.24,
    reverbDecaySec: 1.8,
    delayMs: 0,
    delayFeedback: 0,
  },
  chicago_blues: {
    id: 'chicago_blues',
    name: '芝加哥布鲁斯',
    subtitle: '子弹头麦 + 电子管音箱过载 + 短延迟空间感',
    highPassHz: 120,
    lowPassHz: 4500,
    eqLowDb: -3,
    eqMidFreq: 950,
    eqMidDb: 5.0,
    eqHighDb: -4.0,
    compThresholdDb: -22,
    compRatio: 4.5,
    overdriveAmount: 0.65,
    reverbWet: 0.14,
    reverbDecaySec: 1.1,
    delayMs: 95,
    delayFeedback: 0.16,
  },
};

export const BUILTIN_PRESET_LIST: DspPreset[] = Object.values(BUILTIN_DSP_PRESETS);

/** 兼容旧引用 */
export const DSP_PRESETS = BUILTIN_DSP_PRESETS;
