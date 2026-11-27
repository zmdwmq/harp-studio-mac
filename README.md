**中文** | [English](README.en.md) | [日本語](README.ja.md)

# HarpStudio · 口琴录音工坊

> 专为口琴玩家打造的现代练琴、伴奏移调与多轨录音工作站（Web / Electron 桌面端）。

- **直接下载（Windows 便携版）**：不懂开发的用户可直接前往 [GitHub Releases](https://github.com/zmdwmq/harp-studio/releases/latest) 下载 `.exe` 双击运行，无需配置环境。

## 核心功能

- **防爆音与口琴专属音色**：内置压缩/限幅、混响及清亮民谣、半音阶、布鲁斯电子管过载等一键 DSP 预设。
- **实时音准与孔位舞台（可折叠）**：支持十孔布鲁斯与半音阶口琴孔位映射、标准音高 / 口琴高八度切换、简谱显示与压音可视化。
- **伴奏练琴工具**：伴奏导入、升降调移调、变速不变调与 AB 段循环练习。
- **多轨叠录机架（可折叠）**：支持多轨录制、音量/声像调节与 WAV/MP3 导出。
- **插件扩展体系**：支持通过 `HarpStudioPlugin`（[src/core/pluginSystem.ts](src/core/pluginSystem.ts)）扩展 DSP 音色预设、自定义调弦、界面主题（`PluginTheme`）、快捷动作及音高/录音钩子。

## 快速开始

```bash
# 安装依赖
npm install

# 启动 Web 开发服务器
npm run dev

# 启动 Electron 桌面端开发环境
npm run electron:dev

# 运行单元测试
npm test

# 构建生产包
npm run build

# 打包 Windows 便携版 (.exe)
npm run dist:win
```

## 参与插件开发

项目插件接口定义在 [src/core/pluginSystem.ts](src/core/pluginSystem.ts) 中的 `HarpStudioPlugin`，目前支持扩展：
- `presets`：自定义 DSP 音色预设
- `tunings`：自定义口琴调弦排列
- `themes`：自定义界面配色主题（`--hs-*` 变量）
- `actions`：快捷工具动作
- `onPitchDetected` / `onRecordingComplete`：实时音高与录音完成钩子

详细规范与最小代码模板请阅读 **[插件开发规范与指南](docs/PLUGIN_GUIDE.md)**。欢迎通过 Issue 或 Pull Request 提交你的插件与改进！

## 项目管理与文档（LLM-Wiki）

- 知识库入口：[wiki/index.md](wiki/index.md)
- 变更日志：[wiki/log.md](wiki/log.md)
- 协同与维护规范：[AGENTS.md](AGENTS.md)
- 原始资料归档：[raw/](raw/)

## License

[MIT](LICENSE)
