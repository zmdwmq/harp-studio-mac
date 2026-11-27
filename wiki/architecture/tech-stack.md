# 技术栈选型与环境评估

## 1. 本机开发环境现状（2026-11-26 实测）

| 工具 | 状态 | 说明 |
| :--- | :--- | :--- |
| `node` / `npm` | ✅ 已安装 | `D:\Program Files\nodejs\`，可直接用于桌面端与前端构建 |
| `git` | ✅ 已安装 | `d:\Program Files\Git\cmd\git.exe` |
| `python` | ⚠️ 仅系统路径占位 | 需确认或按需安装 |
| `rustc` / `cargo` / `cl` / `cmake` | ❌ 未安装 | 暂无本地原生 C++/Rust 编译工具链 |
| `ffmpeg` | ❌ 未安装 | 后续视频合成或格式扩展可按需引入静态二进制 |

## 2. 核心技术栈

- **桌面容器**：**Electron**（稳定、Windows 打包成熟，原生支持 Web Audio API 与本地文件系统读写）
- **前端界面**：**React + TypeScript + Vite + Tailwind CSS**（快速构建波形图、电平表、动态口琴琴格 UI）
- **音频处理核心**：**Web Audio API + `AudioWorklet` + WebAssembly**
  - 实时低延迟 DSP（滤波、压缩、限幅、过载、混响）运行在独立音频线程（`AudioWorkletProcessor`）。
  - 伴奏移调/变速采用开源 **SoundTouchJS** 或 **Rubberband WASM**。
  - 实时音高识别采用 **YIN 算法**（纯 TS/WASM 实现，零外部依赖）。
- **音频编解码与导出**：浏览器原生 `AudioContext.decodeAudioData` 解码常见格式（MP3/WAV/OGG/FLAC）；WAV 编码直出（零依赖），MP3 编码使用 `lamejs` 或随包附带轻量编码器。

## 3. 规划中的代码目录结构（跨平台解耦）

> 遵循 [ADR-002](../decisions/adr-002-cross-platform-decoupling.md)：`src/core/` 与 `src/components/` 严禁直接调用 Node.js 或 Electron API，所有系统能力通过 `src/adapters/` 注入，以便未来平滑迁移至 Android / iOS / HarmonyOS。

```text
harp-studio/
├── AGENTS.md
├── raw/
├── wiki/
├── package.json
├── electron/               # Windows 桌面壳（主进程、preload、本地文件与导出实现）
├── src/
│   ├── core/               # 【100% 跨平台纯 TS】零平台依赖
│   │   ├── harmonicaMap.ts # 十孔 / 半音阶 / 复音口琴孔位与频率映射
│   │   ├── pitchYin.ts     # YIN 音高与压音音分计算
│   │   ├── dspPresets.ts   # 口琴专属预设参数模型
│   │   └── wavEncoder.ts   # 纯 TS WAV 编码器
│   ├── adapters/           # 平台抽象接口 + Electron 实现（未来可扩展 Capacitor/ArkWeb 实现）
│   ├── audio/              # Web Audio / AudioWorklet 运行时引擎
│   ├── components/         # 纯 React + Canvas UI（波形、VU 表、琴格可视化、预设面板）
│   └── store/              # 状态管理
```
