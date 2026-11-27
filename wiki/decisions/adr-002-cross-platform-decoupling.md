# ADR-002：面向全平台（Windows / macOS / Linux / Android / iOS / 鸿蒙）的跨平台解耦架构

- **状态**：已采纳 (Accepted)
- **日期**：2026-11-26

## 背景
项目初期在 Windows 桌面端落地 MVP，但需要支持 **macOS、Linux 桌面端**，并在未来迁移至移动端（**Android、iOS、鸿蒙 HarmonyOS**）。若初期将口琴业务逻辑、DSP 参数或 UI 直接耦合到单一平台 API，后续跨端迁移将面临大规模重写。

## 备选方案
1. **初期即用 Flutter / KMP / C++ 全原生重写**：开发成本高，且当前 Windows 环境无 C++/Rust/Xcode/Android/HarmonyOS 全套构建环境，会严重拖慢 MVP 验证。
2. **分层解耦架构（Electron 桌面壳 + 纯 TS 核心层 + 平台适配器接口）**：
   - **领域与算法层 (`src/core/`)**：口琴孔位映射（十孔/半音阶/复音）、YIN 音高识别、DSP 预设模型、工程文件 Schema 等，**严禁依赖 Node.js (`fs`/`path`) 或 Electron API**，保持纯标准 TypeScript。
   - **UI 表现层 (`src/ui/` / `src/components/`)**：纯 React + TypeScript + Canvas，仅通过抽象接口与底层交互。
   - **平台适配层 (`src/adapters/`)**：定义 `IFileSystemAdapter`、`IAudioDeviceAdapter`、`IExportAdapter` 接口。桌面端实现 `ElectronAdapter`（同时覆盖 Windows、macOS 与 Linux）。

## 决策
**采用方案 2：从 M1 起严格执行“核心层与平台层解耦”。**

## 各平台演进路径
1. **macOS 与 Linux 桌面端（近乎零成本同步支持）**：
   - 由于采用 Electron + Web Audio API，代码无需重写即可同步打包三大桌面平台：
     - **macOS**（Apple Silicon / Intel，`.dmg` / `.app`）：底层基于 **CoreAudio**，原生低延迟；需配置 `NSMicrophoneUsageDescription` 麦克风权限描述。
     - **Linux**（`x64` / `arm64`，`.AppImage` / `.deb`）：底层通过 **PipeWire / PulseAudio** 接入音频设备，现代发行版默认 PipeWire 可兼顾低延迟与专业声卡路由。
2. **移动端 UI 与核心逻辑复用**：
   - Android / iOS 可通过 **Capacitor** 或 **WebView 容器**直接复用 React UI 与 `src/core/`；
   - 鸿蒙（HarmonyOS NEXT）可通过 **ArkWeb** 加载前端页面与 `src/core/`，或直接复用纯 TS/ArkTS 映射与算法逻辑。
3. **移动端原生音频引擎演进**：
   - 移动端 WebView 内的 `AudioWorklet` 在后台保活与超低延迟耳返上存在系统限制，届时可将 DSP 与音频 I/O 下沉为原生音频桥接（Android **Oboe/AAudio**、iOS/macOS **AVAudioEngine**、HarmonyOS **OHAudio**），通过 JSBridge 对接同一套 `src/adapters/` 接口，实现平滑迁移。
