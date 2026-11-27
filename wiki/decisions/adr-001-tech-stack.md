# ADR-001：MVP 技术栈选型（Electron + React/TS + Web Audio API）

- **状态**：已采纳 (Accepted)
- **日期**：2026-11-26

## 背景
我们需要在 Windows 平台上快速启动一个专为口琴设计的录音与练琴软件。本机目前已安装 `Node.js`、`npm` 与 `Git`，尚未安装 `Rust`、`MSVC (cl.exe)`、`CMake` 等原生编译工具链。

## 备选方案
1. **C++ + JUCE**：行业级音频标准，原生支持 ASIO/WASAPI Exclusive，但需要安装 Visual Studio + CMake，且原生 UI 制作现代动画（如动态口琴孔位与波形）开发周期长。
2. **Tauri (Rust + Web)**：安装包小，Rust `cpal` 可接原生音频，但当前环境缺乏 Rust 与 MSVC 工具链，且跨线程音频状态同步复杂度较高。
3. **Electron + React/TS + Web Audio API (`AudioWorklet` + WASM)**：利用现有 Node.js 环境零阻力启动；`AudioWorklet` 运行在独立高优先级音频线程，可完整实现口琴 DSP 效果链、YIN 音高检测与伴奏移调；UI 层用 React + Canvas 可高效开发现代化音频工作站界面。

## 决策
**MVP（M1–M2）采用方案 3：Electron + React + TypeScript + Web Audio API。**

## 影响与演进路径
- **正面影响**：今天即可初始化工程并跑通录音/移调/压音检测原型，开发迭代速度最快。
- **已知局限**：Chromium 默认使用 Windows WASAPI 共享模式，软件耳返存在约 15–30ms 延迟（可通过“硬件监听优先 + 录音延迟补偿滑块”规避）。
- **未来演进（M3）**：若后续确实需要原生 ASIO 或 WASAPI 独占模式，可通过 Electron 的 **Node N-API 原生扩展**（引入 Rust `cpal` 或 C++ `RtAudio`）平滑替换底层音频 I/O，上层 React UI、口琴映射逻辑与工程格式无需重写。
