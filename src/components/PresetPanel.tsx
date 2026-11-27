import React from 'react';
import { Sparkles, Sliders, Save, Trash2 } from 'lucide-react';
import { BuiltInPresetId, DspPreset, DspPresetId } from '../core/dspPresets';
import { I18nDict } from '../core/i18n';

interface PresetPanelProps {
  t: I18nDict;
  compact?: boolean;
  presets: DspPreset[];
  selectedPresetId: DspPresetId;
  editingParams: DspPreset;
  onSelectPreset: (preset: DspPreset) => void;
  onChangeParams: (next: DspPreset) => void;
  onSaveCustomPreset: (name: string) => void;
  onDeleteCustomPreset: (id: DspPresetId) => void;
}

export const PresetPanel: React.FC<PresetPanelProps> = ({
  t,
  compact = false,
  presets,
  selectedPresetId,
  editingParams,
  onSelectPreset,
  onChangeParams,
  onSaveCustomPreset,
  onDeleteCustomPreset,
}) => {
  const [showTuner, setShowTuner] = React.useState(false);
  const [customName, setCustomName] = React.useState('');

  const updateField = <K extends keyof DspPreset>(key: K, val: DspPreset[K]) => {
    onChangeParams({ ...editingParams, [key]: val });
  };

  const handleSave = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    onSaveCustomPreset(trimmed);
    setCustomName('');
  };

  return (
    <div className="rounded-xl border border-[#283042] bg-[#141821] p-4 shadow-lg lg:col-span-7">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-sky-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t.presetsTitle}
          </span>
        </div>

        {!compact && (
          <button
            onClick={() => setShowTuner((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
              showTuner
                ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                : 'border-[#283042] bg-[#1b202c] text-slate-300 hover:border-slate-500'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            {showTuner ? t.collapseTuner : t.toggleTuner}
          </button>
        )}
      </div>

      {/* 预设与自定义模版网格 */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {presets.map((p) => {
          const active = selectedPresetId === p.id;
          const builtinLoc = !p.isCustom
            ? t.builtinPresets[p.id as BuiltInPresetId]
            : undefined;
          const displayName = builtinLoc?.name ?? p.name;
          const displaySub = builtinLoc?.subtitle ?? p.subtitle;
          return (
            <div
              key={p.id}
              onClick={() => onSelectPreset(p)}
              className={`group relative cursor-pointer rounded-lg border p-3 text-left transition ${
                active
                  ? 'border-sky-400 bg-sky-500/15 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : 'border-[#283042] bg-[#1b202c] hover:border-slate-500'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-100">{displayName}</span>
                  {p.isCustom && (
                    <span className="rounded bg-indigo-500/25 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300">
                      {t.customBadge}
                    </span>
                  )}
                </div>
                {p.isCustom && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCustomPreset(p.id);
                    }}
                    className="rounded p-1 text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-400 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">{displaySub}</div>
            </div>
          );
        })}
      </div>

      {/* 可展开的自定义调音台（高级模式） */}
      {!compact && showTuner && (
        <div className="mt-3 rounded-lg border border-[#283042] bg-[#0c0e14] p-3">
          <div className="mb-3 grid gap-x-5 gap-y-2.5 sm:grid-cols-2">
            <SliderRow
              label={t.sliderLabels.highPass}
              valueText={`${editingParams.highPassHz} Hz`}
              min={40}
              max={200}
              step={5}
              value={editingParams.highPassHz}
              onChange={(v) => updateField('highPassHz', v)}
            />
            <SliderRow
              label={t.sliderLabels.lowPass}
              valueText={`${(editingParams.lowPassHz / 1000).toFixed(1)} kHz`}
              min={3000}
              max={18000}
              step={500}
              value={editingParams.lowPassHz}
              onChange={(v) => updateField('lowPassHz', v)}
            />
            <SliderRow
              label={t.sliderLabels.eqLow}
              valueText={`${editingParams.eqLowDb >= 0 ? '+' : ''}${editingParams.eqLowDb.toFixed(1)} dB`}
              min={-6}
              max={6}
              step={0.5}
              value={editingParams.eqLowDb}
              onChange={(v) => updateField('eqLowDb', v)}
            />
            <SliderRow
              label={t.sliderLabels.eqMid}
              valueText={`${editingParams.eqMidDb >= 0 ? '+' : ''}${editingParams.eqMidDb.toFixed(1)} dB`}
              min={-6}
              max={6}
              step={0.5}
              value={editingParams.eqMidDb}
              onChange={(v) => updateField('eqMidDb', v)}
            />
            <SliderRow
              label={t.sliderLabels.eqHigh}
              valueText={`${editingParams.eqHighDb >= 0 ? '+' : ''}${editingParams.eqHighDb.toFixed(1)} dB`}
              min={-6}
              max={6}
              step={0.5}
              value={editingParams.eqHighDb}
              onChange={(v) => updateField('eqHighDb', v)}
            />
            <SliderRow
              label={t.sliderLabels.compRatio}
              valueText={`${editingParams.compRatio.toFixed(1)}:1`}
              min={1}
              max={8}
              step={0.5}
              value={editingParams.compRatio}
              onChange={(v) => updateField('compRatio', v)}
            />
            <SliderRow
              label={t.sliderLabels.overdrive}
              valueText={`${Math.round(editingParams.overdriveAmount * 100)}%`}
              min={0}
              max={1}
              step={0.05}
              value={editingParams.overdriveAmount}
              onChange={(v) => updateField('overdriveAmount', v)}
            />
            <SliderRow
              label={t.sliderLabels.reverb}
              valueText={`${Math.round(editingParams.reverbWet * 100)}%`}
              min={0}
              max={0.5}
              step={0.02}
              value={editingParams.reverbWet}
              onChange={(v) => updateField('reverbWet', v)}
            />
          </div>

          {/* 保存为专属模版 */}
          <div className="flex flex-wrap items-center gap-2 border-t border-[#283042] pt-2.5">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={t.templatePlaceholder}
              className="flex-1 min-w-[180px] rounded-lg border border-[#283042] bg-[#141821] px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-400"
            />
            <button
              onClick={handleSave}
              disabled={!customName.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-40 transition"
            >
              <Save className="h-3.5 w-3.5" />
              {t.saveTemplate}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SliderRow: React.FC<{
  label: string;
  valueText: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}> = ({ label, valueText, min, max, step, value, onChange }) => (
  <div className="flex items-center gap-2">
    <span className="w-20 text-[11px] text-slate-400">{label}</span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="flex-1"
    />
    <span className="w-14 text-right font-mono text-[11px] text-sky-300">{valueText}</span>
  </div>
);
