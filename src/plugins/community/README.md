# Community Plugins

将你的插件文件直接放到本目录下（例如 `alice.cyber-theme.ts`），导出 `HarpStudioPlugin` 对象（支持 `export default` 或命名导出）。
应用会自动扫描并注册本目录下的所有 `.ts` 插件，无需修改 `App.tsx`。

详细规范请参考 [docs/PLUGIN_GUIDE.md](../../../docs/PLUGIN_GUIDE.md)。
