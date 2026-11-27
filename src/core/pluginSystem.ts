import { DspPreset } from './dspPresets';
import { HarmonicaHole, HarmonicaKey, HarmonicaType, PitchMatchResult } from './harmonicaMap';

export interface PluginTuningExtension {
  id: string;
  name: string;
  targetType: HarmonicaType;
  /** 基于 C 调的孔位排列（系统会自动按当前调性做半音偏移） */
  holesC: HarmonicaHole[];
}

export interface PluginTheme {
  id: string;
  name: string;
  vars: {
    bg: string;
    panel: string;
    card: string;
    border: string;
    text: string;
    textSub: string;
    muted: string;
    accent: string;
  };
}

export interface PluginTabSong {
  id: string;
  title: string;
  bpm: number;
  harmonicaType: HarmonicaType;
  notation: string;
  author?: string;
}

export interface PluginMetronomePreset {
  id: string;
  name: string;
  bpm: number;
  beatsPerBar: number;
  subdivision: 'quarter' | 'eighth' | 'triplet' | 'sixteenth' | 'swing';
  sound?: 'electronic' | 'woodblock' | 'drumkit' | 'cowbell';
}

export interface PluginAction {
  id: string;
  label: string;
  onTrigger: (host: PluginHostContext) => void;
}

export interface PluginHostContext {
  getHarpType: () => HarmonicaType;
  getHarpKey: () => HarmonicaKey;
  setStatusMessage: (msg: string) => void;
  selectPresetById: (id: string) => void;
}

export interface HarpStudioPlugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  isBuiltin?: boolean;
  /** 插件注入的专属音色预设 */
  presets?: DspPreset[];
  /** 插件注入的自定义口琴调弦 */
  tunings?: PluginTuningExtension[];
  /** 插件注入的界面主题 */
  themes?: PluginTheme[];
  /** 插件注入的动态跟吹练习曲谱 */
  tabs?: PluginTabSong[];
  /** 插件注入的节拍器节奏型预设 */
  metronomePresets?: PluginMetronomePreset[];
  /** 插件注入的快捷动作按钮 */
  actions?: PluginAction[];
  /** 实时音高识别钩子 */
  onPitchDetected?: (match: PitchMatchResult | null, freqHz: number | null) => void;
  /** 录音完成钩子 */
  onRecordingComplete?: (durationSec: number, trackName: string) => void;
}

export interface PluginRegistryEntry {
  plugin: HarpStudioPlugin;
  enabled: boolean;
}

export class PluginManager {
  private entries: Map<string, PluginRegistryEntry> = new Map();
  private listeners: Set<() => void> = new Set();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  register(plugin: HarpStudioPlugin, enabled = true): void {
    this.entries.set(plugin.id, { plugin, enabled });
    this.notify();
  }

  unregister(id: string): void {
    if (this.entries.delete(id)) {
      this.notify();
    }
  }

  setEnabled(id: string, enabled: boolean): void {
    const entry = this.entries.get(id);
    if (entry && entry.enabled !== enabled) {
      entry.enabled = enabled;
      this.notify();
    }
  }

  getAll(): PluginRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  getEnabledPlugins(): HarpStudioPlugin[] {
    return Array.from(this.entries.values())
      .filter((e) => e.enabled)
      .map((e) => e.plugin);
  }

  getEnabledPresets(): DspPreset[] {
    return this.getEnabledPlugins().flatMap((p) => p.presets ?? []);
  }

  getEnabledTunings(targetType?: HarmonicaType): PluginTuningExtension[] {
    const all = this.getEnabledPlugins().flatMap((p) => p.tunings ?? []);
    return targetType ? all.filter((t) => t.targetType === targetType) : all;
  }

  getEnabledThemes(): PluginTheme[] {
    return this.getEnabledPlugins().flatMap((p) => p.themes ?? []);
  }

  getEnabledTabs(): PluginTabSong[] {
    return this.getEnabledPlugins().flatMap((p) => p.tabs ?? []);
  }

  getEnabledMetronomePresets(): PluginMetronomePreset[] {
    return this.getEnabledPlugins().flatMap((p) => p.metronomePresets ?? []);
  }

  getEnabledActions(): { pluginId: string; action: PluginAction }[] {
    const list: { pluginId: string; action: PluginAction }[] = [];
    for (const p of this.getEnabledPlugins()) {
      for (const act of p.actions ?? []) {
        list.push({ pluginId: p.id, action: act });
      }
    }
    return list;
  }

  emitPitch(match: PitchMatchResult | null, freqHz: number | null): void {
    for (const p of this.getEnabledPlugins()) {
      try {
        p.onPitchDetected?.(match, freqHz);
      } catch {
        // 隔离单个插件异常，避免中断实时音频检测循环
      }
    }
  }

  emitRecordingComplete(durationSec: number, trackName: string): void {
    for (const p of this.getEnabledPlugins()) {
      try {
        p.onRecordingComplete?.(durationSec, trackName);
      } catch {
        // 隔离单个插件异常，避免影响后续插件与主流程
      }
    }
  }
}

/** 从用户脚本字符串安全加载插件对象（支持 export / return 形式） */
export function evaluatePluginScript(code: string): HarpStudioPlugin {
  const fn = new Function(`"use strict"; ${code}`);
  const result = fn();
  if (!result || typeof result !== 'object' || !result.id || !result.name) {
    throw new Error('插件必须返回包含 id 和 name 的对象');
  }
  return result as HarpStudioPlugin;
}

/** 内置示例插件 1：进阶口琴音色与和声小调扩展包 */
export const BUILTIN_TONE_PACK_PLUGIN: HarpStudioPlugin = {
  id: 'builtin.jazz-ballad-pack',
  name: '爵士抒情音色扩展包',
  version: '1.0.0',
  author: 'HarpStudio Official',
  description: '新增「午夜爵士大厅」与「复古唱片机」两套高阶 DSP 音色预设',
  isBuiltin: true,
  presets: [
    {
      id: 'plugin_midnight_jazz',
      name: '午夜爵士大厅',
      subtitle: '[插件] 丝滑中低频 + 2.4s 宽广厅堂混响',
      highPassHz: 70,
      lowPassHz: 9500,
      eqLowDb: 2.0,
      eqMidFreq: 650,
      eqMidDb: 1.5,
      eqHighDb: -2.5,
      compThresholdDb: -21,
      compRatio: 3.5,
      overdriveAmount: 0.08,
      reverbWet: 0.34,
      reverbDecaySec: 2.4,
      delayMs: 0,
      delayFeedback: 0,
    },
    {
      id: 'plugin_lofi_vinyl',
      name: '复古 Lo-Fi 唱片',
      subtitle: '[插件] 窄频带复古滤波 + 轻微电子管饱和',
      highPassHz: 220,
      lowPassHz: 3600,
      eqLowDb: -2.5,
      eqMidFreq: 1100,
      eqMidDb: 4.0,
      eqHighDb: -4.5,
      compThresholdDb: -20,
      compRatio: 4.0,
      overdriveAmount: 0.35,
      reverbWet: 0.16,
      reverbDecaySec: 1.0,
      delayMs: 0,
      delayFeedback: 0,
    },
  ],
};

/** 内置示例插件 3：主题扩展包（赛博霓虹 & 森林墨绿） */
export const BUILTIN_THEME_PACK_PLUGIN: HarpStudioPlugin = {
  id: 'builtin.theme-pack',
  name: '主题扩展包（赛博 / 森林）',
  version: '1.0.0',
  author: 'HarpStudio Official',
  description: '通过插件 themes 接口注入「赛博霓虹」与「森林墨绿」两套界面主题',
  isBuiltin: true,
  themes: [
    {
      id: 'plugin_cyber_neon',
      name: '[插件] 赛博霓虹',
      vars: {
        bg: '#090614',
        panel: '#120c24',
        card: '#1b1336',
        border: '#3b246b',
        text: '#f5f3ff',
        textSub: '#ddd6fe',
        muted: '#a78bfa',
        accent: '#e879f9',
      },
    },
    {
      id: 'plugin_forest_ink',
      name: '[插件] 森林墨绿',
      vars: {
        bg: '#09120e',
        panel: '#101d17',
        card: '#162820',
        border: '#254436',
        text: '#ecfdf5',
        textSub: '#a7f3d0',
        muted: '#6ee7b7',
        accent: '#10b981',
      },
    },
  ],
};

/** 内置示例插件 2：练琴准音率实时统计插件 */
export function createAccuracyTrackerPlugin(): {
  plugin: HarpStudioPlugin;
  getStats: () => { totalFrames: number; inTuneFrames: number; accuracyPct: number };
  reset: () => void;
} {
  let totalFrames = 0;
  let inTuneFrames = 0;

  const plugin: HarpStudioPlugin = {
    id: 'builtin.pitch-accuracy-tracker',
    name: '练琴准音率统计器',
    version: '1.0.0',
    author: 'HarpStudio Official',
    description: '通过 onPitchDetected 钩子实时统计本次吹奏的准音命中率（±10¢ 以内）',
    isBuiltin: true,
    onPitchDetected(match) {
      if (!match) return;
      totalFrames++;
      if (Math.abs(match.centsOffset) <= 10) {
        inTuneFrames++;
      }
    },
    actions: [
      {
        id: 'report',
        label: '查看本次准音率',
        onTrigger(host) {
          const pct = totalFrames > 0 ? Math.round((inTuneFrames / totalFrames) * 100) : 0;
          host.setStatusMessage(
            `[准音统计插件] 有效检测 ${totalFrames} 次，准音率：${pct}%（±10¢ 内）`
          );
        },
      },
      {
        id: 'reset',
        label: '重置准音统计',
        onTrigger(host) {
          totalFrames = 0;
          inTuneFrames = 0;
          host.setStatusMessage('[准音统计插件] 已清零重新统计');
        },
      },
    ],
  };

  return {
    plugin,
    getStats: () => ({
      totalFrames,
      inTuneFrames,
      accuracyPct: totalFrames > 0 ? Math.round((inTuneFrames / totalFrames) * 100) : 0,
    }),
    reset: () => {
      totalFrames = 0;
      inTuneFrames = 0;
    },
  };
}

/** 内置示例插件 3：动态简谱跟吹与练琴打分模块（可开关） */
export const BUILTIN_FOLLOW_ALONG_PLUGIN: HarpStudioPlugin = {
  id: 'builtin.follow-along-practice',
  name: '动态简谱跟吹与练琴打分',
  version: '1.0.0',
  author: 'HarpStudio Official',
  description: '启用后支持动态简谱滚动、自动映射当前口琴孔位、舞台引导与练琴得分报告（支持导入简谱）',
  isBuiltin: true,
  tabs: [
    {
      id: 'tab_ode_to_joy',
      title: '欢乐颂（标准简谱）',
      bpm: 88,
      harmonicaType: 'diatonic10',
      author: 'HarpStudio',
      notation:
        '3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 3(1.5) 2(0.5) 2(2) | 3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2(1.5) 1(0.5) 1(2)',
    },
    {
      id: 'tab_twinkle_star',
      title: '小星星（标准简谱）',
      bpm: 84,
      harmonicaType: 'diatonic10',
      author: 'HarpStudio',
      notation:
        '1 1 5 5 | 6 6 5(2) | 4 4 3 3 | 2 2 1(2) | 5 5 4 4 | 3 3 2(2)',
    },
    {
      id: 'tab_blues_scale_drill',
      title: '2把位布鲁斯音阶（含b3/b7）',
      bpm: 76,
      harmonicaType: 'diatonic10',
      author: 'HarpStudio',
      notation:
        '5,(2) b7,(1) 1(1) | #1(1) 2(1) b3(1) 2(1) | 1(1) b7,(1) 5,(2)',
    },
  ],
};

/** 内置示例插件 4：可开关节拍器与布鲁斯节奏型扩展包 */
export const BUILTIN_METRONOME_PLUGIN: HarpStudioPlugin = {
  id: 'builtin.metronome',
  name: '节拍器与口琴节奏型扩展',
  version: '1.0.0',
  author: 'HarpStudio Official',
  description: '控制主界面与移动端节拍器面板显隐，并内置布鲁斯 Shuffle、民谣 6/8 等节奏型预设',
  isBuiltin: true,
  metronomePresets: [
    {
      id: 'metro_blues_shuffle_12_8',
      name: '12/8 布鲁斯 Shuffle',
      bpm: 76,
      beatsPerBar: 12,
      subdivision: 'swing',
      sound: 'drumkit',
    },
    {
      id: 'metro_chicago_4_4',
      name: '4/4 芝加哥摇摆',
      bpm: 92,
      beatsPerBar: 4,
      subdivision: 'swing',
      sound: 'woodblock',
    },
    {
      id: 'metro_folk_6_8',
      name: '6/8 民谣摇曳',
      bpm: 104,
      beatsPerBar: 6,
      subdivision: 'quarter',
      sound: 'woodblock',
    },
  ],
};

const REQUIRED_THEME_VARS: (keyof PluginTheme['vars'])[] = [
  'bg',
  'panel',
  'card',
  'border',
  'text',
  'textSub',
  'muted',
  'accent',
];

/** 解析并校验零代码 JSON 插件（.harp-plugin.json） */
export function parseJsonPlugin(jsonText: string): HarpStudioPlugin {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    throw new Error('JSON 格式无效，请检查语法');
  }
  if (!raw || typeof raw !== 'object') {
    throw new Error('插件 JSON 必须是一个对象');
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== 'string' || !obj.id.trim()) {
    throw new Error('插件 JSON 缺少有效的 id 字段');
  }
  if (typeof obj.name !== 'string' || !obj.name.trim()) {
    throw new Error('插件 JSON 缺少有效的 name 字段');
  }

  if (obj.themes !== undefined) {
    if (!Array.isArray(obj.themes)) {
      throw new Error('themes 字段必须为数组');
    }
    for (const th of obj.themes) {
      if (!th || typeof th !== 'object') throw new Error('theme 项格式无效');
      const tObj = th as Record<string, unknown>;
      if (typeof tObj.id !== 'string' || typeof tObj.name !== 'string') {
        throw new Error('theme 必须包含 id 与 name');
      }
      const vars = tObj.vars as Record<string, unknown> | undefined;
      if (!vars || typeof vars !== 'object') {
        throw new Error(`主题 ${tObj.name} 缺少 vars 对象`);
      }
      for (const k of REQUIRED_THEME_VARS) {
        if (typeof vars[k] !== 'string' || !vars[k]) {
          throw new Error(`主题 ${tObj.name} 缺少颜色变量 vars.${k}`);
        }
      }
    }
  }

  return {
    id: obj.id.trim(),
    name: obj.name.trim(),
    version: typeof obj.version === 'string' && obj.version.trim() ? obj.version.trim() : '1.0.0',
    author: typeof obj.author === 'string' && obj.author.trim() ? obj.author.trim() : 'Community',
    description: typeof obj.description === 'string' ? obj.description : 'JSON 配置扩展插件',
    presets: Array.isArray(obj.presets) ? (obj.presets as DspPreset[]) : undefined,
    tunings: Array.isArray(obj.tunings) ? (obj.tunings as PluginTuningExtension[]) : undefined,
    themes: Array.isArray(obj.themes) ? (obj.themes as PluginTheme[]) : undefined,
    tabs: Array.isArray(obj.tabs) ? (obj.tabs as PluginTabSong[]) : undefined,
    metronomePresets: Array.isArray(obj.metronomePresets)
      ? (obj.metronomePresets as PluginMetronomePreset[])
      : undefined,
  };
}

/** 将插件中的纯配置部分导出为可分享的 .harp-plugin.json 字符串 */
export function serializePluginToJson(plugin: HarpStudioPlugin): string {
  const payload: Record<string, unknown> = {
    id: plugin.id,
    name: plugin.name,
    version: plugin.version,
    author: plugin.author,
    description: plugin.description,
  };
  if (plugin.presets?.length) payload.presets = plugin.presets;
  if (plugin.tunings?.length) payload.tunings = plugin.tunings;
  if (plugin.themes?.length) payload.themes = plugin.themes;
  if (plugin.tabs?.length) payload.tabs = plugin.tabs;
  if (plugin.metronomePresets?.length) payload.metronomePresets = plugin.metronomePresets;
  return JSON.stringify(payload, null, 2);
}
