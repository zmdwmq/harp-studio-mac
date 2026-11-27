# 插件扩展架构 (`Plugin System`)

> 对应源码：[src/core/pluginSystem.ts](../../src/core/pluginSystem.ts)、[src/hooks/usePluginSystem.ts](../../src/hooks/usePluginSystem.ts)、[src/plugins/index.ts](../../src/plugins/index.ts)、[src/components/PluginManagerModal.tsx](../../src/components/PluginManagerModal.tsx)
> 外部开发者指南：[docs/PLUGIN_GUIDE.md](../../docs/PLUGIN_GUIDE.md)

## 1. 核心设计目标

HarpStudio 遵循「核心能力可扩展」原则，通过 `HarpStudioPlugin` 接口开放五类扩展点，支持**内置插件**、**社区目录自动扫描插件**、**零代码 `.harp-plugin.json` 导入/导出**与**用户自定义 JS 脚本插件**。

## 2. 扩展点一览

| 扩展字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `presets` | `DspPreset[]` | 注入口琴专属 DSP 音色预设 |
| `tunings` | `PluginTuningExtension[]` | 注入自定义口琴调弦（`holesC` 基于 C 调编写，系统自动按当前口琴调性半音移调） |
| `themes` | `PluginTheme[]` | 注入界面主题（8 个 `--hs-*` CSS 变量，切换时动态注入/清理） |
| `actions` | `PluginAction[]` | 注入底部工具条快捷按钮，通过 `PluginHostContext` 与宿主交互 |
| `onPitchDetected` / `onRecordingComplete` | 生命周期钩子 | 实时音高帧回调与录音完成事件回调 |

## 3. 安全边界与异常隔离

1. **钩子异常隔离**：`PluginManager.emitPitch()` 与 `emitRecordingComplete()` 对每个插件回调均使用 `try / catch` 隔离，防止单个第三方插件抛错打断 `requestAnimationFrame` 实时音频检测主循环或影响后续插件。
2. **零代码 JSON 插件优先**：`parseJsonPlugin()` 与 `serializePluginToJson()` 校验并序列化纯配置字段（`presets`、`tunings`、`themes`），无需执行任意 JS 即可分享主题、调弦与预设。
3. **JS 脚本风险提示**：`evaluatePluginScript()` 在渲染进程上下文运行；插件中心编辑器明确提示用户勿加载来源不明的脚本。

## 4. 社区插件自动发现

- 社区 PR 提交的 `.ts` 插件统一置于 `src/plugins/community/` 目录。
- `loadCommunityPlugins()` 使用 Vite `import.meta.glob('./community/*.ts', { eager: true })` 自动扫描并注册，无需修改 `App.tsx`。
