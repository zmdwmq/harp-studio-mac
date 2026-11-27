# 项目变更日志 (Log)

## [2026-11-26] init | 项目立项、规划与 LLM-Wiki 初始化
- 完成 Windows 平台口琴录音软件可行性评估与本机开发环境检测（已具备 Node.js / npm / Git；暂无 Rust / MSVC / CMake / FFmpeg）。
- 创建项目根目录 `harp-studio`，建立 `AGENTS.md` 维护规范与 `raw/`、`wiki/` 三层知识库结构。
- 输出核心规划文档：项目章程、M0-M3 路线图、音频引擎与数据流设计、口琴声学与压音映射领域文档，以及 ADR-001 技术栈决策。
- 当前状态：**M0（规划与建库）已完成，准备进入 M1（MVP 工程初始化）**。

## [2026-11-26] update | 扩展口琴类型支持（十孔 + 半音阶 + 复音口琴）
- 更新 `domain/harmonica-acoustics.md`：补充复音口琴双簧片拍频震音的声学特性与录音/音高检测注意事项。
- 更新 `domain/pitch-and-bending.md`：新增半音阶（12/16 孔 Solo Tuning + Slide 推杆指示）与复音口琴（24 孔东方标准排列 + 帧间平滑）映射方案。
- 更新 `domain/dsp-presets.md` 与 `overview/roadmap.md`：将三类口琴纳入 M2 预设与音高可视化范围。

## [2026-11-26] update | 增加面向移动端（Android / iOS / 鸿蒙）的跨平台解耦架构
- 新增 `decisions/adr-002-cross-platform-decoupling.md`：确立 `src/core/`（零平台依赖纯 TS）+ `src/adapters/`（平台能力抽象）的分层规范，明确未来向 Capacitor（Android/iOS）与 ArkWeb/OHAudio（HarmonyOS）的迁移路径。
- 同步更新 `architecture/tech-stack.md`、`overview/roadmap.md` 与 `index.md`。

## [2026-11-26] update | 纳入 macOS 桌面端支持
- 更新 `decisions/adr-002-cross-platform-decoupling.md` 与 `overview/project-charter.md`：明确 Electron + Web Audio 架构可直接覆盖 macOS（CoreAudio 低延迟优势，需配置麦克风权限描述），与 Windows 同步支持。

## [2026-11-26] update | 纳入 Linux 桌面端支持
- 更新 `decisions/adr-002-cross-platform-decoupling.md`、`overview/project-charter.md` 与 `index.md`：将 Linux（PipeWire / PulseAudio，`.AppImage` / `.deb` 打包）纳入桌面端全平台覆盖范围。

## [2026-11-26] update | 确认 UI 风格与硬件工作流规格，启动 M1
- 新增 `overview/ui-spec.md`：确定暗色专业工作站风、一体化工作台布局、桌面声卡（如 AG06mk2）硬件监听优先策略（软件耳返默认关闭）。
- M1 优先交付：伴奏导入与升降调/变速/AB循环 + 防爆音录音与音色预设 + 导出 WAV/MP3。

## [2026-11-26] build | 完成 M1+M2 核心原型工程搭建与首次编译通过
- 初始化 Electron + Vite + React + TypeScript + Tailwind 工程骨架。
- 实现零平台依赖纯 TS 核心层（`src/core/`）：十孔/半音阶/复音口琴孔位映射、YIN 音高与音分检测、4 套口琴专属 DSP 预设、16-bit WAV 编码器。
- 实现 `AudioEngine` 与暗色一体化工作台 UI：支持伴奏波形、AB 循环、移调/变速、干声录制、实时孔位高亮、离线混音导出 WAV。

## [2026-11-26] update | 补全 14/16 孔半音阶与 10 孔全 12 调性支持
- 更新 `src/core/harmonicaMap.ts`、`src/components/HarmonicaVisualizer.tsx`、`src/App.tsx`：新增 14 孔（G3 起音）与 16 孔（C3 起音）半音阶口琴映射，以及全部 12 个调性（G/Ab/A/Bb/B/C/Db/D/Eb/E/F/F#）。
- 同步更新 `wiki/domain/pitch-and-bending.md`。

## [2026-11-26] fix | 修正 24 孔复音口琴标准音高排列
- 修复 `src/core/harmonicaMap.ts` 中 `TREMOLO_24_C` 的音高序列：改为东方标准 24 孔复音排列（1 孔 G3 起音，奇吹 `G3/C4/E4/G4...`、偶吸 `B3/D4/F4/A4/B4...`）。
- 修复 `buildChromaticC` 最高音孔吸气音高：12/14/16 孔半音阶最后一孔吸气改为 `D7`（推杆 `D#7`），匹配标准 C4–D7 / C3–D7 音域。
- 更新 `HarmonicaVisualizer.tsx`：半音阶琴格图谱补全推杆升半音音名显示（推杆吹/推杆吸），并在检测到推杆音时实时高亮对应音名。

## [2026-11-26] feat | 图谱新增「简谱 / 音名」一键切换开关
- `src/core/harmonicaMap.ts` 新增 `midiToJianpuParts`：按口琴首调简谱规则转换（十孔第4孔吹为中音1，半音阶与复音以基准C4为中音1），支持高低音点与半音阶升降号。
- `src/components/HarmonicaVisualizer.tsx` 新增 `简谱 / 音名` 切换按钮（默认简谱，更贴合国内业余爱好者读谱习惯）。

## [2026-11-26] update | 规范 14/16 孔半音阶口琴倍低音区孔号表示
- 14 孔半音阶孔号改为 `•3, •4` + `1–12`；16 孔半音阶孔号改为 `•1, •2, •3, •4` + `1–12`，与真琴琴身刻字及主流半音阶谱面一致。

## [2026-11-26] feat | 新增多轨叠录（Overdubbing）与独立分轨混音
- 升级 `src/audio/AudioEngine.ts`：由单轨改为 `HarpTrack[]` 多轨管理，支持在播放伴奏与已有未静音音轨的同时叠录新轨；支持每轨独立音色预设、音量、静音（M）、独奏（S）、删除与离线多轨混音导出 WAV。
- 新增 `src/components/TrackListPanel.tsx` 并集成至 `src/App.tsx`。

## [2026-11-26] feat | 导出新增 320kbps MP3 格式支持
- 引入 `@breezystack/lamejs`，新增纯 TS `src/core/mp3Encoder.ts`（跨平台零原生依赖）。
- 抽离 `AudioEngine.renderMixToAudioBuffer()` 共用离线混音渲染逻辑，新增 `exportMixMp3()`；主界面与桌面端保存对话框支持 WAV 与 MP3 一键导出。

## [2026-11-26] feat | 新增音色自定义调音台与专属模版保存
- 扩展 `src/core/dspPresets.ts` 与 `src/audio/AudioEngine.ts`：支持自定义预设注册、实时无爆音参数调节（低切/高切/三段EQ/压缩比/电子管过载/空间混响）。
- 新增 `src/components/PresetPanel.tsx`，并在 `App.tsx` 与 `TrackListPanel.tsx` 中打通自定义模版的持久化保存、删除与多轨独立选用。

## [2026-11-26] feat | 追加调琴专用高精度频率监测模式
- `src/core/harmonicaMap.ts` 支持 `A4` 基准频率配置（440/442/443/444 Hz），新增 `detectChromaticNote` 十二平均律高精度音分计算。
- `src/components/HarmonicaVisualizer.tsx` 新增「练琴孔位 / 调琴频率监测」切换：提供实测/目标频率（精确到 0.01 Hz）、`±0.1 cents` 标尺与簧片锉修方向提示。

## [2026-11-26] feat | 新增多主题切换（跟随系统 / 暗色 / 亮色 / 复古电子管）
- `src/index.css` 与 `src/App.tsx` 引入 CSS 变量主题系统：默认「跟随系统」，支持一键切换「暗色工作站」「极简亮色」「复古电子管」并持久化保存。

## [2026-11-26] feat | 新增高精度 Web Audio 练琴节拍器
- `src/audio/AudioEngine.ts` 新增基于 `AudioContext.currentTime` 前瞻调度的节拍器引擎（强弱拍音色区分，独立输出不混入导出成品）。
- 新增 `src/components/MetronomeBar.tsx`：支持 40–220 BPM、Tap 测速、`4/4, 3/4, 2/4, 6/8` 拍号、拍点指示灯与独立音量。

## [2026-11-26] feat | 丰富节拍器拍号、节奏细分与 4 种合成音色
- 扩展 `AudioEngine.ts` 与 `MetronomeBar.tsx`：拍号扩充至 `4/4, 3/4, 2/4, 6/8, 12/8(布鲁斯), 5/4, 7/8`，新增 5 种节奏型（四分/八分/三连音/十六分/摇摆 Shuffle），以及 4 种音色（木鱼敲击、电子滴答、架子鼓踩镲、金属牛铃）。

## [2026-11-26] feat | 优化 UI 空间留白并新增「简洁模式 / 高级模式」切换
- `src/App.tsx`、`WaveformPanel.tsx`、`PresetPanel.tsx` 支持 `simple / advanced` 双模式持久化切换：简洁模式聚焦伴奏播放、琴格显示、一键预设与录音导出，留白更舒展；高级模式展开 AB 循环、移调变速、节拍器、多轨叠录与 8 参数调音台。

## [2026-11-26] feat | 新增初学者伴奏移调调性换算助手
- `src/core/harmonicaMap.ts` 新增 `calculateBackingTransposeSemitones`：根据伴奏原调、手里口琴调性与把位（1把位直吹 / 十孔2把位布鲁斯）自动计算最短半音移调数（`-6 ~ +6`）。
- `src/components/WaveformPanel.tsx` 新增一键调性换算栏。

## [2026-11-26] update | 十孔口琴把位换算扩展至全 12 把位
- `src/core/harmonicaMap.ts` 与 `src/components/WaveformPanel.tsx` 支持十孔口琴 1~12 全把位（按五度圈 `+7*(pos-1) mod 12` 换算）。

## [2026-11-26] feat | 多轨叠录机架支持导入本地音频文件
- `AudioEngine.ts` 新增 `importTrackFromFile()`，支持将本地 MP3/WAV/FLAC/OGG/M4A 等音频文件解码并直接加入多轨机架（默认 `dry` 预设，可独立调音色、音量、M/S 与混音导出）。
- `TrackListPanel.tsx` 与 `App.tsx` 新增「导入音轨文件」入口。

## [2026-11-26] feat | 新增多语言支持（简体中文 / English / 日本語）
- 新增纯 TS 词典 `src/core/i18n.ts`，覆盖主界面、波形伴奏区、节拍器、练琴/调琴舞台、多轨机架与自定义音色调音台。
- 顶部工作栏新增语言切换下拉框，自动持久化保存。

## [2026-11-26] feat | 新增长辈大字模式（针对老花眼与中老年用户优化）
- `src/index.css`、`HarmonicaVisualizer.tsx` 与 `App.tsx` 新增长辈大字模式（`简洁 | 长辈大字 | 高级`）：全局放大字号（19px 基准）、加粗按钮与滑块热区、多排折行展示 16/24 孔大字号琴格。

## [2026-11-26] revert | 移除长辈大字模式，恢复「简洁 / 高级」双模式
- 按用户反馈移除 `elder` 模式相关样式与布局切换，恢复上一版简洁/高级双模式。

## [2026-11-26] feat | 新增 .harpproj 工程文件保存与还原打开
- 新增 `src/core/projectSerializer.ts`：自包含打包伴奏音频、多轨干声、移调/变速/AB循环参数、口琴配置与自定义音色模版。
- 扩展 `electron/main.ts`、`platformAdapter.ts`、`AudioEngine.ts` 与 `App.tsx`，支持保存与重新打开 `.harpproj` 工程继续编辑与叠录。

## [2026-11-26] feat | 新增帮助文档、初次使用引导与底部滚动小提示
- 新增 `src/components/HelpAndOnboarding.tsx`：包含中/英/日三语「新手 4 步引导弹窗（首次启动自动弹出，可从帮助重播）」、「使用帮助与常见问题弹窗」以及底部状态栏「定时滚动小提示」。

## [2026-11-26] build | 配置 electron-builder 并打包 Windows 绿色版
- 在 `package.json` 新增 `dist:win` 脚本与 `portable` / `dir` 目标配置，输出免安装单文件 `HarpStudio-Portable-0.1.0.exe` 与 `release/win-unpacked` 绿色目录。

## [2026-11-26] fix | 修复代码审查高优先级问题（独立移调变速、播放结束同步、麦克风切换重连）
- 新增 `src/audio/pitchShifterWorklet.ts`：实现立体声颗粒移调 `AudioWorklet`，将伴奏 `playbackRate`（变速）与 `pitchFactor`（移调）彻底解耦，实时播放与离线 WAV/MP3 导出均生效。
- 修复 `AudioEngine.ts` 与 `App.tsx`：新增 `onPlaybackEndedCallback` 同步自然播放结束后的按钮状态；在麦克风开启状态下切换输入设备时自动重连。

## [2026-11-26] refactor | 第二轮修复：模块拆分、AudioWorklet 录音与全量状态多语言
- 拆分 `src/audio/DspChain.ts`、`src/audio/Metronome.ts`（含 UI 定时器统一清理）与 `src/components/HeaderBar.tsx`，大幅降低 `AudioEngine.ts` 与 `App.tsx` 复杂度。
- 新增 `src/audio/recorderWorklet.ts`：优先使用 `AudioWorkletNode` 采集干声 PCM，替代已废弃的 `ScriptProcessorNode`。
- 补全 `src/core/i18n.ts` 状态栏消息的中/英/日三语翻译。

## [2026-11-26] test | 完成低优先级改进：.harpproj Gzip 压缩与核心算法单元测试
- `src/core/projectSerializer.ts`、`electron/main.ts`、`platformAdapter.ts`、`App.tsx`：接入零依赖原生 `CompressionStream('gzip')` 压缩工程文件，并自动兼容读取旧版明文 JSON 工程。
- 引入 `vitest` 并新增 `src/core/__tests__/core.test.ts`，覆盖口琴孔位映射、12 把位换算、YIN 音高检测、WAV 编码与工程压缩往返校验。

## [2026-11-26] feat | 吸收竞品 HarpMaster 3 项特色功能
- 扩展 `harmonicaMap.ts`、`HeaderBar.tsx`、`HarmonicaVisualizer.tsx`：新增十孔特殊调弦（Paddy Richter / Country / Natural Minor）、4 个低音调（Low C/D/Eb/F）与超吹/超吸（Overblow/Overdraw）识别。
- 新增 `BluesJamEngine.ts` 与 `BluesJamBar.tsx`：内置 Web Audio 12 小节布鲁斯即兴伴奏器（Walking 贝斯 + 属七和弦 + Shuffle 鼓点 + 实时小节格子高亮）。
- 新增 `CircleOfFifthsModal.tsx`：交互式五度圈 12 把位速查圆盘。

## [2026-11-26] remove | 移除 12 小节布鲁斯即兴伴奏器
- 按用户反馈删除 `BluesJamEngine.ts` 与 `BluesJamBar.tsx`，保持高级模式界面精简聚焦。

## [2026-11-26] feat | 十孔口琴新增 Melody Maker (MM) 调音
- `harmonicaMap.ts`、`HeaderBar.tsx` 与 `core.test.ts` 新增 `melody_maker` 调音支持（3孔吹升高大二度，5孔与9孔吸升高半音）。

## [2026-11-26] feat | 半音阶口琴新增 C6 调音
- `harmonicaMap.ts`、`AudioEngine.ts`、`HeaderBar.tsx`、`HarmonicaVisualizer.tsx` 与 `core.test.ts` 新增半音阶 `C6` 调音（吹气 C-E-G-A，吸气 D-F-G-B，支持 12/14/16 孔）。

## [2026-11-26] fix | 按龙登杰 C6 官方音阶图修正半音阶 C6 排列
- 修正 `harmonicaMap.ts` 与 `core.test.ts`：吹气 `1 3 5 6`（C-E-G-A），吸气 `2 4 6 7`（D-F-A-B），第 12 孔吹高八度 `1`（C7）、吸 `7`（B6）/ 推杆 `2`（D7）。

## [2026-11-26] fix | 修复半音阶推杆音识别时标题栏转行跳动问题
- 优化 `HarmonicaVisualizer.tsx` 头部音高读数与音分条的固定宽度与 `whitespace-nowrap` 布局，并固定推杆子标签的 `px-1` 占位，消除推杆音高亮时的布局抖动。

## [2026-11-26] feat | 新增「标准音高 / 口琴音高 (-8va)」显示切换开关
- `HarmonicaVisualizer.tsx` 与 `i18n.ts` 新增 `标准音高 | 口琴音高` 切换：保留底层真实声学频率识别不变，支持将图谱音名与简谱八度按口琴记谱习惯降低一个八度（-12 半音）显示。

## [2026-11-26] chore | 底部状态栏居中显示版本号（v0.11）并确立迭代递增规范
- 新增 `src/core/version.ts`（`v0.11`），同步更新 `package.json`（`0.11.0`）与 `AGENTS.md`（每迭代一次加 `0.01`）。
- 更新 `src/App.tsx` 底部状态栏为三栏布局，居中显示 `HarpStudio v0.11`。

## [2026-11-26] ui | 替换为标准简谱音符排版（v0.12）
- 升级 `HarmonicaVisualizer.tsx` 中的 `NoteOrJianpu`：采用标准简谱排版（`#` / `♭` 上标靠左，高/低音点纵向叠加并精准居中于数字 `1–7` 正上方/正下方）。
- 版本号递增至 `v0.12`（`0.12.0`）。

## [2026-11-26] fix | 修复口琴琴格孔位上下不对齐问题（v0.13）
- 将 `HarmonicaVisualizer.tsx` 单孔卡片改为三行等高网格（`grid-rows-[1fr_auto_1fr]`），确保所有孔号方框绝对水平对齐，不再因高低音点数量不同而上下错位。
- 版本号递增至 `v0.13`（`0.13.0`）。

## [2026-11-26] fix | 固定简谱高低音点占位高度，实现所有音符数字水平对齐（v0.14）
- 更新 `HarmonicaVisualizer.tsx` 中的 `NoteOrJianpu`：为数字上下方统一预留 `8px` 固定高度点位槽，使所有吹气/吸气音符数字严格保持在同一水平基线上。
- 版本号递增至 `v0.14`（`0.14.0`）。

## [2026-11-26] feat | 实时音准与孔位舞台支持折叠收起（v0.15）
- `HarmonicaVisualizer.tsx` 与 `i18n.ts` 新增舞台折叠开关（状态持久化至本地），收起后仍保留顶部实时音高与音分条，方便专注录音。
- 版本号递增至 `v0.15`（`0.15.0`）。

## [2026-11-26] feat | 开放「一切皆插件」扩展架构与插件管理中心（v0.16）
- 新增 `src/core/pluginSystem.ts`：定义 `HarpStudioPlugin` 接口、`PluginManager` 注册中心、音高/录音钩子、音色/调弦/动作扩展点与动态 JS 插件加载器；内置「爵士抒情音色扩展包」与「练琴准音率统计器」两款示例插件。
- 新增 `src/components/PluginManagerModal.tsx` 并集成至 `HeaderBar.tsx` / `App.tsx`，支持启用/禁用、查看详情及编写/安装自定义 JS 插件。
- 补充 `pluginSystem` 单元测试，版本号递增至 `v0.16`（`0.16.0`）。

## [2026-11-26] feat | 多轨叠录机架支持折叠收起（v0.17）
- 更新 `TrackListPanel.tsx`：标题栏新增折叠开关（状态持久化至本地），收起后仍保留轨道数统计与「导入音轨文件」按钮。
- 版本号递增至 `v0.17`（`0.17.0`）。

## [2026-11-26] feat | 开放插件主题扩展接口并内置「赛博 / 森林」主题包（v0.18）
- `pluginSystem.ts`、`index.css`、`HeaderBar.tsx` 与 `App.tsx` 新增 `themes?: PluginTheme[]` 扩展点，支持动态注入 CSS 变量主题并实时切换。
- 内置 `BUILTIN_THEME_PACK_PLUGIN`（赛博霓虹 & 森林墨绿），补充单元测试，版本号递增至 `v0.18`（`0.18.0`）。

## [2026-11-27] feat | 录音延迟一键校准、预备拍与单轨时间偏移微调（v0.19）
- `AudioEngine.ts`、`Metronome.ts` 与 `projectSerializer.ts`：新增单轨时间偏移 `offsetMs`（实时播放、离线混音与 `.harpproj` 存档同步支持）、声卡往返延迟脉冲测算 `measureLoopbackLatencyMs()`（叠录自动补偿）及 1 小节预备拍 `scheduleCountIn()`。
- `TrackListPanel.tsx`、`App.tsx` 与 `i18n.ts`：多轨机架新增 `-5ms / +5ms` 偏移微调与归零按钮；录音面板新增「预备拍 (1小节)」开关与「延迟补偿 + 一键校准」向导。
- 版本号递增至 `v0.19`（`0.19.0`），并更新 `wiki/overview/roadmap.md`。

## [2026-11-27] ui | 绘制矢量应用图标并配置 Electron / Windows exe 图标（v0.20）
- 新增矢量图标 `build/icon.svg`、`public/icon.svg` 及多尺寸 Windows 图标 `build/icon.ico` / `build/icon.png`。
- 配置 `package.json`（`build.win.icon`）、`electron/main.ts`（窗口图标）与 `index.html`（网页 Favicon）。
- 版本号递增至 `v0.20`（`0.20.0`）。

## [2026-11-27] feat | 一键出片：导出带动态口琴孔位动画的 720p 视频（v0.21）
- 新增 `src/audio/VideoExporter.ts`：基于 Canvas 720p + WebAudio + `MediaRecorder`（VP9/VP8 + Opus）合成 `.webm` 视频，渲染曲名/调性标题、44 段动态音频波形、口琴实时音高孔位高亮动画与进度水印。
- `AudioEngine.ts` 新增 `renderMixAndHarpBuffers()`，分离口琴纯轨用于无伴奏干扰的精准音高追踪。
- `App.tsx` 与 `i18n.ts` 新增「视频」导出按钮、实时进度百分比与一键取消支持；版本号递增至 `v0.21`（`0.21.0`）。

## [2026-11-27] feat | 实时音高轨迹图与把位/布鲁斯音阶高亮（v0.22）
- `harmonicaMap.ts`：新增 `calculatePositionFromSongKey()`（五度圈把位计算）、`getScalePitchClasses()` 与 `getHoleScaleMatches()`（支持布鲁斯音阶、大调五声与自然小调）。
- `HarmonicaVisualizer.tsx`：舞台新增曲目调性与把位自动计算、孔位音阶高亮（含主音标点与压音音阶 `压` 徽标），以及 140 帧实时滚动音高轨迹图（方便练压音与颤音稳定性）。
- 补充 `core.test.ts` 把位与音阶单元测试，版本号递增至 `v0.22`（`0.22.0`）。

## [2026-11-27] ui | 优化录音与混音导出面板按钮两行布局（v0.23）
- 调整 `App.tsx` 中录音与导出按钮组为两行：第一行放置「开始录音」与「试听成品」（`whitespace-nowrap` 防折行），第二行以 `grid-cols-3` 等宽排列 `WAV`、`MP3`、`视频` 三个导出按钮。
- 版本号递增至 `v0.23`（`0.23.0`）。

## [2026-11-27] feat | MIDI 与蓝牙脚踏开关支持（v0.24）
- 新增 `src/core/pedalController.ts` 与 `src/components/PedalConfigModal.tsx`：同时支持 Web MIDI 踏板（CC / NoteOn / ProgramChange）与蓝牙/USB 翻谱脚踏板（模拟按键），支持一键学习绑定「开始/停止录音」「播放/暂停」「AB 循环」「切换音色预设」四项高频操作。
- `HeaderBar.tsx` 与 `App.tsx`：新增「脚踏」入口（连接 MIDI 设备时亮绿点）、全局快捷键与 Web MIDI 监听（带 260ms 防抖与输入框保护）。
- 补充 `core.test.ts` 脚踏解析与匹配单元测试，版本号递增至 `v0.24`（`0.24.0`）。

## [2026-11-27] feat | 零代码 JSON 插件导入导出、社区插件自动扫描与 CI（v0.25）
- `pluginSystem.ts`、`PluginManagerModal.tsx` 与 `App.tsx`：新增 `parseJsonPlugin()` 与 `serializePluginToJson()`，插件中心支持直接导入/导出 `.harp-plugin.json`（含主题、调弦、音色预设）并持久化至本地。
- 新增 `src/plugins/index.ts` 与 `src/plugins/community/`：通过 `import.meta.glob` 自动扫描注册社区插件，无需修改 `App.tsx`。
- 新增 `.github/workflows/ci.yml`（自动校验 `typecheck` / `test` / `build`）与 `.github/PULL_REQUEST_TEMPLATE.md`。
- 补充 `core.test.ts` JSON 插件解析/序列化单元测试，版本号递增至 `v0.25`（`0.25.0`）。

## [2026-11-27] fix | 修复 P1 代码审查项：接通插件自定义调弦与补充脚本安全提示（v0.26）
- `harmonicaMap.ts`、`AudioEngine.ts`、`VideoExporter.ts`、`HeaderBar.tsx`、`HarmonicaVisualizer.tsx` 与 `App.tsx`：全链路接通 `PluginTuningExtension`（`customHolesC`），支持在顶部调弦下拉框直接选用插件提供的自定义调弦，并自动按当前口琴调性移调及参与实时音高匹配与视频导出。
- `PluginManagerModal.tsx`：在自定义 JS 脚本编辑器上方补充安全风险提示，引导普通用户优先使用零代码 JSON 插件。
- 补充 `core.test.ts` 自定义调弦移调与匹配测试，版本号递增至 `v0.26`（`0.26.0`）。

## [2026-11-27] refactor | 修复 P2 代码审查项：插件钩子异常隔离与自定义 Hook 拆分（v0.27）
- `pluginSystem.ts`：`emitPitch()` 与 `emitRecordingComplete()` 为每个插件回调添加 `try/catch` 异常隔离，防止单个插件报错中断实时音频检测循环。
- 新增 `src/hooks/usePluginSystem.ts` 与 `src/hooks/usePedalController.ts`，将插件注册/持久化与 MIDI/蓝牙脚踏监听逻辑从 `App.tsx` 抽离，显著降低主组件复杂度。
- 补充 `core.test.ts` 插件钩子异常隔离单元测试，版本号递增至 `v0.27`（`0.27.0`）。

## [2026-11-27] polish | 修复 P3 代码审查项：视频导出跟随主题/多语言并接入原生保存框（v0.28）
- `VideoExporter.ts` 与 `App.tsx`：导出 720p 视频画面支持跟随当前主题配色（内置深/浅/复古与插件主题）及中/英/日多语言提示。
- `electron/main.ts`、`electron/preload.ts`、`platformAdapter.ts` 与 `App.tsx`：`saveAudioFile` 扩展支持 `'webm'` 格式，Electron 桌面端导出视频可直接使用系统原生保存对话框选择目录。
- 版本号递增至 `v0.28`（`0.28.0`）。

## [2026-11-27] docs | 补全 wiki 专题架构与领域文档
- 新增 `wiki/architecture/plugin-system.md` 与 `wiki/architecture/video-and-pedal.md`，完整归档插件扩展架构（v0.16/v0.18/v0.25–v0.27）、720p 一键出片视频导出（v0.21/v0.28）与 MIDI/蓝牙脚踏控制（v0.24）。
- 更新 `wiki/domain/pitch-and-bending.md`（补充把位计算、音阶高亮与实时音高轨迹图）及 `wiki/index.md` 全局索引。

## [2026-11-27] docs | 补全程序内置新手引导、帮助弹窗与底部小贴士（v0.29）
- 更新 `src/components/HelpAndOnboarding.tsx`（中/英/日三语）：补全「标准/口琴高八度切换、把位与布鲁斯音阶高亮、实时音高轨迹图、可折叠舞台/多轨机架、预备拍与延迟校准、单轨 ±5ms 微调、720p 一键出片视频导出、MIDI/蓝牙脚踏控制与零代码 JSON 插件」等全部新功能说明。
- 版本号递增至 `v0.29`（`0.29.0`）。

## [2026-11-27] feat | 录音降噪与音频精修：前端噪声门与单轨淡入淡出（v0.30）
- 新增 `src/core/noiseGate.ts`（`NoiseGateProcessor`）：在录音前端平滑过滤呼吸、风扇与环境底噪，支持开关与 `-60dB ~ -25dB` 阈值调节。
- `AudioEngine.ts`、`projectSerializer.ts` 与 `TrackListPanel.tsx`：新增单轨 `fadeInMs` / `fadeOutMs` 淡入淡出包络（新录轨默认 `15ms / 30ms` 消除起音/收尾咔哒声，机架支持一键循环切换 `0~300ms`），实时试听、离线 WAV/MP3/视频导出及 `.harpproj` 存档全链路生效。
- 补充 `core.test.ts` 噪声门阈值衰减与放行单元测试，版本号递增至 `v0.30`（`0.30.0`）。

## [2026-11-27] feat | 安卓移动端 4-Tab 工作台与 Capacitor Android 工程初始化（v0.31）
- 初始化 Capacitor Android 原生工程（`capacitor.config.ts`、`android/`、`AndroidManifest.xml` 补充 `RECORD_AUDIO` 与 `MODIFY_AUDIO_SETTINGS` 权限），并新增 `.github/workflows/android-apk.yml` 实现云端自动构建 Debug APK。
- 新增 `src/components/MobileLayout.tsx`：提供顶部精简栏（口琴/调性底部选择器、电平条、开麦、桌面端切换）、底部 4-Tab 导航（舞台 / 录音 / 音色 / 更多）、大号圆形拇指录音键及全屏预备拍大字倒计时浮层。
- 更新 `HarmonicaVisualizer.tsx`、`HeaderBar.tsx` 与 `App.tsx`：窄屏或原生安卓端自动切换移动布局（支持手动切换桌面/移动视图），超过 10 孔口琴自动启用横向滑动视口并居中跟随高亮当前吹奏孔位。
- 版本号递增至 `v0.31`（`0.31.0`）。

## [2026-11-27] chore | 确立安卓版独立版本号规范（从 v0.10 起步）
- `src/core/version.ts` 新增 `ANDROID_APP_VERSION = 'v0.10'`，与桌面/Web 端 `APP_VERSION`（`v0.31`）独立迭代。
- `android/app/build.gradle` 设置 `versionCode 10`、`versionName "0.10"`；`MobileLayout.tsx` 底部显示 `HarpStudio Android v0.10`。

## [2026-11-27] ui | 强化浅色/深色全主题下口琴孔位吹奏高亮提示（桌面 v0.32 / 安卓 v0.11）
- 修复 `HarmonicaVisualizer.tsx` 在浅色/复古/插件主题下因 `bg-[#181d28]` 与 `bg-[#0c0e14]` 被 `index.css` 的 `!important` 覆盖导致孔位高亮背景失效的问题。
- 吹奏高亮时为当前孔位添加 2px 醒目边框、外发光、微放大（`scale-[1.04]`）、实心孔号底色、实心吹/吸音符胶囊与顶部方向徽标（`↑ 吹` / `↓ 吸` / `⤵ 压` / `⚡ 超` / `⇄ 推`），同步更新至桌面端（`v0.32`）与安卓端（`v0.11`）。

## [2026-11-27] feat | 插件化动态跟吹曲谱与练琴得分报告（桌面 v0.33 / 安卓 v0.12）
- 新增 `src/core/tabParser.ts`：孔位简谱解析器（`4 -4 5(2) | -3'(1.5)`）与 `PracticeScorer` 实时命中判定及 S/A/B/C 打分引擎。
- `pluginSystem.ts` 与 `usePluginSystem.ts`：新增 `tabs?: PluginTabSong[]` 扩展点（同步支持 `.harp-plugin.json` 曲谱包导入导出），并内置可开关插件 `BUILTIN_FOLLOW_ALONG_PLUGIN`（含《欢乐颂》《小星星》《布鲁斯压音练习》）。
- 新增 `src/components/FollowAlongPanel.tsx` 并接入 `HarmonicaVisualizer.tsx`、`App.tsx` 与 `MobileLayout.tsx`：支持选曲/自定义编谱、BPM 与预备拍、滚动谱面、舞台目标孔位虚线引导、练琴得分报告与一键导出 PNG 打卡图。
- 补充 `core.test.ts` 曲谱解析与评分单元测试，版本号更新为桌面 `v0.33` / 安卓 `v0.12`。

## [2026-11-27] feat | 升级为标准动态简谱跟吹，支持简谱导入与跨口琴自动孔位映射（桌面 v0.34 / 安卓 v0.13）
- `harmonicaMap.ts` 与 `tabParser.ts`：新增 `jianpuToMidi()`、`mapMidiToHarmonicaTarget()` 与 `parseJianpuTab()`，支持标准简谱（`1–7`、升降 `#/b`、低音 `,` / 高音 `'`、拍数 `(N)`、休止 `0`），按当前口琴类型、调性与调弦实时自动映射到对应孔位与吹/吸/推杆/压音动作。
- `FollowAlongPanel.tsx` 与 `pluginSystem.ts`：滚动谱面主显示标准简谱排版（带高低音点与升降号），下方显示实时映射孔位；新增「导入简谱（`.txt / .json`）」功能并持久化至本地。
- 更新 `core.test.ts` 十孔与半音阶简谱映射测试，版本号更新为桌面 `v0.34` / 安卓 `v0.13`。

## [2026-11-27] feat | 将节拍器模块插件化（builtin.metronome v1.0.0）
- `src/core/pluginSystem.ts` 与 `src/hooks/usePluginSystem.ts`：新增 `PluginMetronomePreset` 扩展点、`PluginManager.getEnabledMetronomePresets()` 及内置可开关插件 `BUILTIN_METRONOME_PLUGIN`（`builtin.metronome` v1.0.0，内置 12/8 布鲁斯 Shuffle、4/4 芝加哥摇摆、6/8 民谣摇曳三组节奏预设，同步支持 `.harp-plugin.json` 导入导出）。
- `src/components/MetronomeBar.tsx`、`src/App.tsx` 与 `src/components/MobileLayout.tsx`：桌面端（高级模式）与移动端均受 `metronomePluginEnabled` 控制显隐，关闭插件时自动停止节拍器发声，同时保留底层 `AudioEngine` 预备拍时钟以保障录音/跟吹预备拍正常运作。
- `src/core/__tests__/core.test.ts`：补充 `builtin.metronome` 开关与 `getEnabledMetronomePresets()` 单元测试；仅更新插件版本号，不递增主程序版本号。

## [2026-11-27] chore | 递增主程序版本号（桌面 v0.35 / 安卓 v0.14）
- 同步更新 `src/core/version.ts`、`package.json` 及 `harp-studio-android` 的 `package.json`、`android/app/build.gradle`（`versionCode 14`、`versionName "0.14"`）。

## [2026-11-27] feat | 新增 macOS 桌面版打包配置与 GitHub Actions 自动构建（v0.35）
- 新增 `build/entitlements.mac.plist`（启用 `com.apple.security.device.audio-input` 麦克风录音权限与 JIT/Hardened Runtime 支持）。
- `package.json` 新增 `dist:mac` 脚本及 `build.mac` / `build.dmg` 配置（支持 Apple Silicon `arm64` 与 Intel `x64`，输出 `HarpStudio-${version}-${arch}.dmg`，与桌面 Windows 版统一为 `v0.35` / `0.35.0`）。
- `electron/main.ts` 补充 macOS 首次启动麦克风权限请求（`systemPreferences.askForMediaAccess('microphone')`）。
- 新增 `.github/workflows/mac-dmg.yml`：支持手动触发或推送 `v*` 标签时在 `macos-latest` 自动构建 `.dmg` / `.zip` 并附带至 GitHub Release。
