# HarpStudio LLM-Wiki 全局索引

> 本知识库用于管理 **HarpStudio（口琴录音工坊）** 的需求规划、架构设计、口琴声学领域知识与开发决策。

## 📋 项目总览 (`overview/`)
- [project-charter.md](overview/project-charter.md) — 项目定位、目标用户、核心价值主张与非目标边界
- [ui-spec.md](overview/ui-spec.md) — 暗色一体化工作台 UI 规格与声卡硬件监听默认策略
- [roadmap.md](overview/roadmap.md) — 分阶段里程碑（M0 规划 → M1 录音与伴奏 MVP → M2 DSP 预设与压音可视化 → M3 导出与原生扩展）

## 🏗️ 系统架构 (`architecture/`)
- [tech-stack.md](architecture/tech-stack.md) — 本机环境评估、技术栈选型与目录结构规划
- [audio-engine.md](architecture/audio-engine.md) — 音频采集、监听路由、AudioWorklet 实时 DSP 效果链设计
- [data-flow.md](architecture/data-flow.md) — 伴奏移调变速、干湿双轨同步录制与成品混音导出数据流
- [plugin-system.md](architecture/plugin-system.md) — 插件扩展架构、零代码 JSON 插件、社区自动扫描与钩子异常隔离
- [video-and-pedal.md](architecture/video-and-pedal.md) — 一键出片 720p 视频导出管线与 MIDI / 蓝牙脚踏开关控制

## 🎵 口琴领域知识 (`domain/`)
- [harmonica-acoustics.md](domain/harmonica-acoustics.md) — 十孔布鲁斯口琴与半音阶口琴的声学特性及录音痛点
- [pitch-and-bending.md](domain/pitch-and-bending.md) — 实时音高检测算法（YIN）与十孔口琴吹/吸/压音孔位映射
- [dsp-presets.md](domain/dsp-presets.md) — 口琴专属音效预设参数设计（清亮独奏 / 温暖半音阶 / 布鲁斯电子管）

## 🧭 架构决策记录 (`decisions/`)
- [adr-001-tech-stack.md](decisions/adr-001-tech-stack.md) — 为何 MVP 采用 Electron + React/TS + Web Audio API（AudioWorklet/WASM）
- [adr-002-cross-platform-decoupling.md](decisions/adr-002-cross-platform-decoupling.md) — 面向 Windows / macOS / Linux / Android / iOS / 鸿蒙的分层解耦架构设计

## 📜 日志 (`log.md`)
- [log.md](log.md) — 项目全生命周期变更日志（只增不减）
