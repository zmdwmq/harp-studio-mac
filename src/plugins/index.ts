/// <reference types="vite/client" />
import type { HarpStudioPlugin } from '../core/pluginSystem';

function isHarpStudioPlugin(val: unknown): val is HarpStudioPlugin {
  if (!val || typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.name === 'string';
}

/**
 * 自动扫描 src/plugins/community/*.ts 中的社区插件导出，无需修改 App.tsx。
 */
export function loadCommunityPlugins(): HarpStudioPlugin[] {
  const modules = import.meta.glob('./community/*.ts', { eager: true }) as Record<
    string,
    Record<string, unknown>
  >;
  const plugins: HarpStudioPlugin[] = [];
  for (const mod of Object.values(modules)) {
    for (const exported of Object.values(mod)) {
      if (isHarpStudioPlugin(exported)) {
        plugins.push(exported);
      }
    }
  }
  return plugins;
}
