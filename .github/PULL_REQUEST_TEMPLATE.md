## 变更说明
<!-- 简要描述本次 PR 的功能或修复内容 -->

## 如果是插件贡献（Plugin Contribution）
- [ ] 插件放在 `src/plugins/community/<github用户名>.<插件名>.ts`（无需修改 `App.tsx`）
- [ ] `plugin.id` 符合 `<github用户名>.<插件名>` 唯一命名规范
- [ ] 如包含 `themes`，已补全 `vars` 的全部 8 个颜色字段并检查对比度
- [ ] 如包含 `tunings`，`holesC` 已基于 C 调编写
- [ ] 未在 `onPitchDetected` 中引入阻塞主线程的重计算或未声明的外网请求

## 本地校验
- [ ] `npm run typecheck` 通过
- [ ] `npm test` 通过
- [ ] `npm run build` 通过
