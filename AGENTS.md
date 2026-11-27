# AGENTS.md — HarpStudio LLM-Wiki 维护与开发规范

本文件定义了 AI 助手与开发者在本项目中维护 **LLM-Wiki** 的标准操作流程（Schema）。

## 1. 三层架构原则

1. **`raw/`（原始资料层 — 只读）**：存放初始需求、设备说明书笔记、用户反馈、参考文章摘录。**不要直接修改历史原始记录**，新资料以追加新文件方式放入。
2. **`wiki/`（编译型知识层 — 核心维护区）**：由 AI 根据 `raw/` 和代码演进编译、提炼、交叉链接而成的结构化 Markdown 文档。
   - `wiki/index.md`：全局导航与页面摘要，每次新增/删除 wiki 页面必须同步更新。
   - `wiki/log.md`：只增不减（Append-only）的时序日志，格式 `## [YYYY-MM-DD] <类型> | <简述>`。
3. **代码层（待建 `src/` / `app/`）**：实际源码。每次完成一个 Milestone 或重大架构变更后，必须反向更新 `wiki/` 中对应的架构与决策文档。

## 2. Wiki 编写与更新规范

- **交叉链接**：文档间使用相对路径 Markdown 链接（如 `[audio-engine.md](../architecture/audio-engine.md)`），避免孤岛页面。
- **决策留痕**：凡涉及技术选型、DSP 算法替换、文件格式变更，必须在 `wiki/decisions/` 下新增 `adr-XXX-<topic>.md`。
- **事实核查**：`wiki/` 中记录的依赖版本、API 能力、测试结果必须与当前代码和本地环境一致，禁止臆测未验证的功能。
- **定期 Lint**：阶段性检查 `wiki/index.md` 是否存在断链、过时描述或未归档的新模块。
- **回复规范**：每次完成功能开发或代码修改后，必须在回复末尾附上可直接复制的启动命令（`cd f:\google\harp-studio` 与 `npm run dev`）。
- **版本迭代规范**：
  - 桌面端主程序功能迭代或修复后，将 `src/core/version.ts`（`APP_VERSION`）与 `package.json` 中的版本号递增 `0.01`（如 `v0.33 → v0.34`）。
  - 安卓端采用独立版本号（从 `v0.10` 起步），更新 `src/core/version.ts`（`ANDROID_APP_VERSION`）、`harp-studio-android/package.json` 与 `android/app/build.gradle`。
  - **插件更新例外**：若本次迭代**仅更新内置插件功能**（如 `src/core/pluginSystem.ts` 中的内置插件包或插件自身能力），**只更新对应内置插件的 `version` 字段**，不递增主程序版本号。
