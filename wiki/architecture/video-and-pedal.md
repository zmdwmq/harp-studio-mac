# 一键出片视频导出与脚踏控制架构

## 1. 一键出片 720p 视频导出 (`VideoExporter`)

> 对应源码：[src/audio/VideoExporter.ts](../../src/audio/VideoExporter.ts)、[src/audio/AudioEngine.ts](../../src/audio/AudioEngine.ts)、[src/adapters/platformAdapter.ts](../../src/adapters/platformAdapter.ts)

### 1.1 合成管线（零外置 FFmpeg 依赖）
1. **双轨离线预渲染**：`AudioEngine.renderMixAndHarpBuffers()` 同时生成完整混音 `mixBuffer`（伴奏 + 全部可听口琴轨 + DSP + `offsetMs`）与纯口琴轨 `harpBuffer`。
2. **无干扰音高追踪**：`startVideoExport()` 优先对 `harpBuffer` 做 YIN 音高检测与孔位匹配，避免伴奏乐器干扰口琴孔位高亮动画。
3. **720p Canvas + WebAudio 录制**：将 `canvas.captureStream(30)`（1280×720 30fps）与 `AudioContext.createMediaStreamDestination()` 合流交由 `MediaRecorder`（VP9/VP8 + Opus）编码为 `.webm`；画面配色与提示文案同步跟随当前主题与多语言设置。
4. **跨端保存**：导出后通过 `platformAdapter.saveAudioFile(..., 'webm')` 保存——Electron 端弹出系统原生保存框，Web 端自动触发浏览器下载。

---

## 2. MIDI 与蓝牙脚踏开关控制 (`Pedal Controller`)

> 对应源码：[src/core/pedalController.ts](../../src/core/pedalController.ts)、[src/hooks/usePedalController.ts](../../src/hooks/usePedalController.ts)、[src/components/PedalConfigModal.tsx](../../src/components/PedalConfigModal.tsx)

### 2.1 双协议统一抽象
- **Web MIDI 踏板**：通过 `navigator.requestMIDIAccess()` 监听所有 MIDI 输入端口，解析 `CC`（值 ≥ 64 视为踩下，忽略松开 0）、`NoteOn`（velocity > 0）与 `Program Change`。
- **蓝牙 / USB HID 翻谱踏板**：监听全局 `keydown` 事件（如 `PageUp` / `PageDown` / `Space` / `F9`–`F12`），在文本输入框聚焦时自动屏蔽误触发。

### 2.2 一键学习与防抖
- 支持绑定 4 项高频动作：`toggleRecord`（开始/停止录音）、`togglePlay`（播放/暂停）、`toggleLoop`（AB 循环开关）、`nextPreset`（切换音色预设）。
- `usePedalController` 内置 `260ms` 防抖，绑定配置持久化至 `localStorage`（`harpstudio_pedal_bindings_v1`）。
