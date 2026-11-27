# HarpStudio 插件开发规范与指南

HarpStudio 采用面向扩展的插件架构，所有插件通过 [src/core/pluginSystem.ts](../src/core/pluginSystem.ts) 中定义的 `HarpStudioPlugin` 接口接入 `PluginManager`。

## 1. 核心规范

### 1.1 唯一 ID 命名规范
`PluginManager` 使用 `plugin.id` 作为唯一键存储插件，重复的 `id` 会覆盖已注册插件。
- **格式要求**：`<github用户名>.<插件名>`（全小写字母、数字和连字符 `-`）
- **示例**：`alice.cyber-theme`、`bob.country-tuning`
- **禁止使用**：`test`、`theme`、`custom`、`plugin1` 等通用短名称

### 1.2 扩展点规范
1. **界面主题（`themes?: PluginTheme[]`）**
   - `id` 建议以 `plugin_` 开头（如 `plugin_ocean_breeze`）。
   - `vars` 必须完整提供 8 个颜色字段：`bg`、`panel`、`card`、`border`、`text`、`textSub`、`muted`、`accent`。
   - 需保证 `text` / `textSub` 与 `bg` / `panel` / `card` 之间具备良好可读对比度。
2. **自定义调弦（`tunings?: PluginTuningExtension[]`）**
   - `holesC` **必须基于 C 调编写**（MIDI 音高，例如中央 C = `60`）；系统会自动根据用户当前选择的 `HarmonicaKey` 计算半音偏移。
   - `targetType` 需为合法的 `HarmonicaType`（`'diatonic10' | 'chromatic12' | 'chromatic14' | 'chromatic16' | 'tremolo24'`）。
3. **音色预设（`presets?: DspPreset[]`）**
   - `id` 不可与内置预设（`dry`、`bright_folk`、`warm_chromatic`、`chicago_blues`）冲突，建议带插件前缀（如 `alice_vintage_mic`）。
4. **快捷动作与钩子（`actions` / `onPitchDetected` / `onRecordingComplete`）**
   - **性能红线**：`onPitchDetected` 在实时音频检测期间高频触发，**禁止**在其中执行耗时同步计算、频繁写入 `localStorage` 或阻塞主线程。
   - **安全红线**：禁止在未声明的情况下发起外部网络请求、修改全局原型或篡改非本插件的状态。

---

## 2. 插件代码模板

以下示例展示如何编写一个完整的 `HarpStudioPlugin` 对象（可按需裁剪不需要的字段）：

```ts
import type { HarpStudioPlugin } from '../core/pluginSystem';

export const MY_EXAMPLE_PLUGIN: HarpStudioPlugin = {
  id: 'yourname.example-pack',
  name: '示例扩展包',
  version: '1.0.0',
  author: 'yourname',
  description: '包含主题、音色预设与快捷动作的最小插件示例',

  // 1. 注入主题（可选）
  themes: [
    {
      id: 'plugin_midnight_amber',
      name: '[插件] 午夜琥珀',
      vars: {
        bg: '#0c0a09',
        panel: '#1c1917',
        card: '#292524',
        border: '#44403c',
        text: '#fafaf9',
        textSub: '#d6d3d1',
        muted: '#a8a29e',
        accent: '#f59e0b',
      },
    },
  ],

  // 2. 注入 DSP 音色预设（可选）
  presets: [
    {
      id: 'yourname_warm_tube',
      name: '暖管布鲁斯',
      subtitle: '适合十孔低音区压音',
      highPassHz: 85,
      lowPassHz: 5200,
      eqLowDb: 2.5,
      eqMidFreq: 900,
      eqMidDb: 1.5,
      eqHighDb: -1.5,
      compThresholdDb: -16,
      compRatio: 3.5,
      overdriveAmount: 0.35,
      reverbWet: 0.18,
      reverbDecaySec: 1.1,
      delayMs: 0,
      delayFeedback: 0,
    },
  ],

  // 3. 注入自定义调弦（可选，基于 C 调编写）
  tunings: [
    {
      id: 'yourname_custom_10',
      name: '示例自定义十孔',
      targetType: 'diatonic10',
      holesC: [
        { hole: 1, holeLabel: '1', blowMidi: 60, drawMidi: 62 },
        { hole: 2, holeLabel: '2', blowMidi: 64, drawMidi: 67 },
        // ... 按需补全其余孔位
      ],
    },
  ],

  // 4. 注入快捷动作（可选）
  actions: [
    {
      id: 'yourname_apply_preset',
      label: '一键切换暖管音色',
      onTrigger: (host) => {
        host.selectPresetById('yourname_warm_tube');
        host.setStatusMessage(`当前 ${host.getHarpKey()} 调，已切换为暖管布鲁斯音色`);
      },
    },
  ],
};
```

---

## 3. 提交 PR 前自检清单

在向 GitHub 提交 Pull Request 前，请确保：
1. 插件 `id` 符合 `<github用户名>.<插件名>` 规范且不与现有插件冲突。
2. 本地运行通过类型检查、单元测试与生产构建：
   ```bash
   npm run typecheck
   npm test
   npm run build
   ```
3. 如包含自定义主题或 UI 改动，请在 PR 描述中附上实际运行截图。
