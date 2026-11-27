import React from 'react';
import {
  BUILTIN_FOLLOW_ALONG_PLUGIN,
  BUILTIN_METRONOME_PLUGIN,
  BUILTIN_MULTITRACK_RACK_PLUGIN,
  BUILTIN_THEME_PACK_PLUGIN,
  BUILTIN_TONE_PACK_PLUGIN,
  PluginManager,
  PluginRegistryEntry,
  createAccuracyTrackerPlugin,
  evaluatePluginScript,
  parseJsonPlugin,
  serializePluginToJson,
} from '../core/pluginSystem';
import { loadCommunityPlugins } from '../plugins';

const USER_PLUGINS_STORAGE_KEY = 'harpstudio_user_plugins_v1';
const USER_JSON_PLUGINS_STORAGE_KEY = 'harpstudio_json_plugins_v1';

export function usePluginSystem(setStatusMsg: (msg: string) => void) {
  const pluginManagerRef = React.useRef<PluginManager | null>(null);
  const userPluginScriptsRef = React.useRef<{ id: string; code: string }[]>([]);
  const userJsonPluginsRef = React.useRef<{ id: string; json: string }[]>([]);

  if (!pluginManagerRef.current) {
    const pm = new PluginManager();
    pm.register(BUILTIN_TONE_PACK_PLUGIN, true);
    pm.register(BUILTIN_THEME_PACK_PLUGIN, true);
    pm.register(BUILTIN_FOLLOW_ALONG_PLUGIN, true);
    pm.register(BUILTIN_METRONOME_PLUGIN, true);
    pm.register(BUILTIN_MULTITRACK_RACK_PLUGIN, true);
    pm.register(createAccuracyTrackerPlugin().plugin, true);
    for (const cp of loadCommunityPlugins()) {
      pm.register(cp, true);
    }
    try {
      const raw = localStorage.getItem(USER_PLUGINS_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { id: string; code: string; enabled: boolean }[];
        if (Array.isArray(saved)) {
          for (const item of saved) {
            try {
              const p = evaluatePluginScript(item.code);
              pm.register(p, item.enabled);
              userPluginScriptsRef.current.push({ id: p.id, code: item.code });
            } catch {
              // ignore broken user script
            }
          }
        }
      }
      const rawJson = localStorage.getItem(USER_JSON_PLUGINS_STORAGE_KEY);
      if (rawJson) {
        const savedJson = JSON.parse(rawJson) as { id: string; json: string; enabled: boolean }[];
        if (Array.isArray(savedJson)) {
          for (const item of savedJson) {
            try {
              const p = parseJsonPlugin(item.json);
              pm.register(p, item.enabled);
              userJsonPluginsRef.current.push({ id: p.id, json: item.json });
            } catch {
              // ignore broken user json
            }
          }
        }
      }
    } catch {
      // ignore
    }
    pluginManagerRef.current = pm;
  }

  const pluginManager = pluginManagerRef.current;
  const [pluginEntries, setPluginEntries] = React.useState<PluginRegistryEntry[]>(() =>
    pluginManager.getAll()
  );

  React.useEffect(() => {
    return pluginManager.subscribe(() => {
      setPluginEntries(pluginManager.getAll());
    });
  }, [pluginManager]);

  const pluginPresets = React.useMemo(
    () => pluginManager.getEnabledPresets(),
    [pluginManager, pluginEntries]
  );
  const pluginThemes = React.useMemo(
    () => pluginManager.getEnabledThemes(),
    [pluginManager, pluginEntries]
  );
  const pluginTunings = React.useMemo(
    () => pluginManager.getEnabledTunings(),
    [pluginManager, pluginEntries]
  );
  const pluginTabs = React.useMemo(
    () => pluginManager.getEnabledTabs(),
    [pluginManager, pluginEntries]
  );
  const pluginMetronomePresets = React.useMemo(
    () => pluginManager.getEnabledMetronomePresets(),
    [pluginManager, pluginEntries]
  );
  const metronomePluginEnabled = React.useMemo(
    () =>
      pluginEntries.some((e) => e.plugin.id === BUILTIN_METRONOME_PLUGIN.id && e.enabled),
    [pluginEntries]
  );
  const multitrackRackPluginEnabled = React.useMemo(
    () =>
      pluginEntries.some((e) => e.plugin.id === BUILTIN_MULTITRACK_RACK_PLUGIN.id && e.enabled),
    [pluginEntries]
  );
  const pluginActions = React.useMemo(
    () => pluginManager.getEnabledActions(),
    [pluginManager, pluginEntries]
  );

  const persistUserPlugins = React.useCallback(() => {
    try {
      const entries = pluginManager.getAll();
      const toSave = userPluginScriptsRef.current.map((item) => ({
        ...item,
        enabled: entries.find((e) => e.plugin.id === item.id)?.enabled ?? true,
      }));
      localStorage.setItem(USER_PLUGINS_STORAGE_KEY, JSON.stringify(toSave));

      const toSaveJson = userJsonPluginsRef.current.map((item) => ({
        ...item,
        enabled: entries.find((e) => e.plugin.id === item.id)?.enabled ?? true,
      }));
      localStorage.setItem(USER_JSON_PLUGINS_STORAGE_KEY, JSON.stringify(toSaveJson));
    } catch {
      // ignore
    }
  }, [pluginManager]);

  const handleInstallPluginScript = React.useCallback(
    (code: string) => {
      const plugin = evaluatePluginScript(code);
      pluginManager.register(plugin, true);
      userPluginScriptsRef.current = [
        ...userPluginScriptsRef.current.filter((u) => u.id !== plugin.id),
        { id: plugin.id, code },
      ];
      persistUserPlugins();
      setStatusMsg(`已安装并启用插件：${plugin.name}`);
    },
    [pluginManager, persistUserPlugins, setStatusMsg]
  );

  const handleImportJsonPlugin = React.useCallback(
    (jsonText: string) => {
      const plugin = parseJsonPlugin(jsonText);
      pluginManager.register(plugin, true);
      userJsonPluginsRef.current = [
        ...userJsonPluginsRef.current.filter((u) => u.id !== plugin.id),
        { id: plugin.id, json: jsonText },
      ];
      persistUserPlugins();
      setStatusMsg(`已导入并启用 JSON 插件：${plugin.name}`);
    },
    [pluginManager, persistUserPlugins, setStatusMsg]
  );

  const handleExportJsonPlugin = React.useCallback(
    (id: string) => {
      const entry = pluginManager.getAll().find((e) => e.plugin.id === id);
      if (!entry) return;
      const json = serializePluginToJson(entry.plugin);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entry.plugin.id}.harp-plugin.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatusMsg(`已导出插件配置：${entry.plugin.id}.harp-plugin.json`);
    },
    [pluginManager, setStatusMsg]
  );

  const handleUninstallPlugin = React.useCallback(
    (id: string) => {
      pluginManager.unregister(id);
      userPluginScriptsRef.current = userPluginScriptsRef.current.filter((u) => u.id !== id);
      userJsonPluginsRef.current = userJsonPluginsRef.current.filter((u) => u.id !== id);
      persistUserPlugins();
      setStatusMsg(`已卸载插件：${id}`);
    },
    [pluginManager, persistUserPlugins, setStatusMsg]
  );

  return {
    pluginManager,
    pluginEntries,
    pluginPresets,
    pluginThemes,
    pluginTunings,
    pluginTabs,
    pluginMetronomePresets,
    metronomePluginEnabled,
    multitrackRackPluginEnabled,
    pluginActions,
    persistUserPlugins,
    handleInstallPluginScript,
    handleImportJsonPlugin,
    handleExportJsonPlugin,
    handleUninstallPlugin,
  };
}
