import React from 'react';
import { Puzzle, X, Plus, Trash2, CheckCircle2, Code2, Upload, Download } from 'lucide-react';
import { PluginRegistryEntry } from '../core/pluginSystem';
import { AppLocale } from '../core/i18n';

interface PluginManagerModalProps {
  locale: AppLocale;
  entries: PluginRegistryEntry[];
  onTogglePlugin: (id: string, enabled: boolean) => void;
  onInstallScript: (code: string) => void;
  onImportJsonPlugin: (jsonText: string) => void;
  onExportJsonPlugin: (id: string) => void;
  onUninstallPlugin: (id: string) => void;
  onClose: () => void;
}

const SAMPLE_PLUGIN_SCRIPT = `return {
  id: "custom.my-echo-preset",
  name: "我的空灵山谷预设",
  version: "1.0.0",
  author: "Me",
  description: "通过脚本插件注入一套自定义混响预设与快捷按钮",
  presets: [{
    id: "plugin_valley_echo",
    name: "空灵山谷",
    subtitle: "[自定义脚本插件] 超长混响空间感",
    highPassHz: 80,
    lowPassHz: 15000,
    eqLowDb: 0,
    eqMidFreq: 2000,
    eqMidDb: 1.0,
    eqHighDb: 2.0,
    compThresholdDb: -18,
    compRatio: 3.0,
    overdriveAmount: 0,
    reverbWet: 0.42,
    reverbDecaySec: 2.8,
    delayMs: 0,
    delayFeedback: 0
  }],
  actions: [{
    id: "apply-valley",
    label: "一键切到空灵山谷",
    onTrigger(host) {
      host.selectPresetById("plugin_valley_echo");
      host.setStatusMessage("已通过自定义插件切换到「空灵山谷」音色！");
    }
  }]
};`;

export const PluginManagerModal: React.FC<PluginManagerModalProps> = ({
  locale,
  entries,
  onTogglePlugin,
  onInstallScript,
  onImportJsonPlugin,
  onExportJsonPlugin,
  onUninstallPlugin,
  onClose,
}) => {
  const [showEditor, setShowEditor] = React.useState(false);
  const [scriptText, setScriptText] = React.useState(SAMPLE_PLUGIN_SCRIPT);
  const [errorMsg, setErrorMsg] = React.useState('');
  const jsonFileRef = React.useRef<HTMLInputElement | null>(null);

  const handleJsonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setErrorMsg('');
      const text = await file.text();
      onImportJsonPlugin(text);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleInstall = () => {
    try {
      setErrorMsg('');
      onInstallScript(scriptText);
      setShowEditor(false);
    } catch (err) {
      setErrorMsg(String(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border border-[#283042] bg-[#141821] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#283042] px-6 py-4">
          <div className="flex items-center gap-2">
            <Puzzle className="h-5 w-5 text-sky-400" />
            <h2 className="text-base font-bold text-slate-100">
              {locale === 'en'
                ? 'Plugin Center (Extensible Architecture)'
                : locale === 'ja'
                  ? 'プラグイン管理センター'
                  : '插件中心（一切皆插件 · 能力扩展）'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              {locale === 'en'
                ? 'Plugins can register custom DSP presets, pitch hooks, and toolbar actions.'
                : locale === 'ja'
                  ? 'プラグインはDSP音色・ピッチ検出フック・操作ボタンを追加できます。'
                  : '插件可向软件注入新音色预设、实时音高钩子与快捷工具按钮。'}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={jsonFileRef}
                type="file"
                accept=".json,.harp-plugin.json,application/json"
                onChange={handleJsonFileChange}
                className="hidden"
              />
              <button
                onClick={() => jsonFileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition"
              >
                <Upload className="h-3.5 w-3.5" />
                导入 JSON 插件
              </button>
              <button
                onClick={() => setShowEditor((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/25 transition"
              >
                <Code2 className="h-3.5 w-3.5" />
                {showEditor ? '收起脚本编辑器' : '加载自定义 JS 插件'}
              </button>
            </div>
          </div>

          {!showEditor && errorMsg && (
            <p className="text-xs text-rose-400">{errorMsg}</p>
          )}

          {showEditor && (
            <div className="rounded-xl border border-[#283042] bg-[#0c0e14] p-3">
              <div className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200">
                安全提示：JS 脚本将直接在应用上下文中运行，请勿粘贴来源不明的脚本；若只需扩展主题、调弦或音色预设，推荐优先使用零代码「导入 JSON 插件」。
              </div>
              <textarea
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                rows={10}
                className="w-full rounded-lg border border-[#283042] bg-[#141821] p-2.5 font-mono text-[11px] text-slate-200 outline-none focus:border-sky-400"
              />
              {errorMsg && <p className="mt-1.5 text-xs text-rose-400">{errorMsg}</p>}
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleInstall}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                >
                  <Plus className="h-3.5 w-3.5" />
                  安装并启用插件
                </button>
              </div>
            </div>
          )}

          {/* 已注册插件列表 */}
          <div className="space-y-2.5">
            {entries.map(({ plugin, enabled }) => (
              <div
                key={plugin.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-[#283042] bg-[#0c0e14] p-3.5"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-100">{plugin.name}</span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                      v{plugin.version}
                    </span>
                    <span className="text-[11px] text-slate-500">by {plugin.author}</span>
                    {enabled && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> 已启用
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{plugin.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(plugin.presets?.length || plugin.tunings?.length || plugin.themes?.length) && (
                    <button
                      onClick={() => onExportJsonPlugin(plugin.id)}
                      title="导出为 .harp-plugin.json 分享给他人"
                      className="inline-flex items-center gap-1 rounded-lg border border-[#283042] bg-[#1b202c] px-2 py-1 text-[11px] text-slate-300 hover:border-sky-400 hover:text-sky-300 transition"
                    >
                      <Download className="h-3 w-3" />
                      JSON
                    </button>
                  )}
                  <button
                    onClick={() => onTogglePlugin(plugin.id, !enabled)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      enabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-[#1b202c] text-slate-400 border border-[#283042]'
                    }`}
                  >
                    {enabled ? '禁用' : '启用'}
                  </button>
                  {!plugin.isBuiltin && (
                    <button
                      onClick={() => onUninstallPlugin(plugin.id)}
                      title="卸载插件"
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
