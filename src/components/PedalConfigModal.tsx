import React from 'react';
import { Footprints, X, RotateCcw, Trash2 } from 'lucide-react';
import {
  DEFAULT_PEDAL_BINDINGS,
  PEDAL_ACTION_META,
  PedalActionId,
  PedalBindings,
  formatPedalTrigger,
} from '../core/pedalController';

interface PedalConfigModalProps {
  open: boolean;
  onClose: () => void;
  bindings: PedalBindings;
  learningAction: PedalActionId | null;
  onStartLearn: (action: PedalActionId | null) => void;
  onChangeBindings: (next: PedalBindings) => void;
  midiSupported: boolean;
  midiDevices: string[];
}

export const PedalConfigModal: React.FC<PedalConfigModalProps> = ({
  open,
  onClose,
  bindings,
  learningAction,
  onStartLearn,
  onChangeBindings,
  midiSupported,
  midiDevices,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-[#283042] bg-[#141821] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Footprints className="h-5 w-5 text-sky-400" />
            <h2 className="text-base font-bold text-slate-100">
              MIDI / 蓝牙脚踏开关设置
            </h2>
          </div>
          <button
            onClick={() => {
              onStartLearn(null);
              onClose();
            }}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-[#283042] bg-[#0c0e14] p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300">Web MIDI 状态</span>
            <span className={midiSupported ? 'text-emerald-400' : 'text-amber-400'}>
              {midiSupported
                ? midiDevices.length > 0
                  ? `已连接 ${midiDevices.length} 个 MIDI 设备`
                  : '已就绪（未检测到 MIDI 踏板，可用蓝牙/键盘踏板）'
                : '当前环境不支持 Web MIDI（仍可使用蓝牙翻谱踏板/快捷键）'}
            </span>
          </div>
          {midiDevices.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {midiDevices.map((d, i) => (
                <span
                  key={i}
                  className="rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300 border border-emerald-500/30"
                >
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          {PEDAL_ACTION_META.map((item) => {
            const isLearning = learningAction === item.id;
            const current = bindings[item.id];
            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#283042] bg-[#1b202c] px-3.5 py-2.5"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-100">{item.label}</span>
                  <span className="text-[11px] text-slate-400">{item.desc}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onStartLearn(isLearning ? null : item.id)}
                    className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-medium transition ${
                      isLearning
                        ? 'bg-amber-500 text-slate-950 animate-pulse'
                        : 'border border-sky-500/30 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25'
                    }`}
                  >
                    {isLearning ? '请踩踏板或按键...' : formatPedalTrigger(current)}
                  </button>
                  {current && (
                    <button
                      type="button"
                      title="清除绑定"
                      onClick={() =>
                        onChangeBindings({ ...bindings, [item.id]: null })
                      }
                      className="rounded p-1 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
          <span>支持蓝牙翻谱踏板（PageUp/PageDown/空格等）与标准 MIDI CC/Note 踏板</span>
          <button
            type="button"
            onClick={() => onChangeBindings({ ...DEFAULT_PEDAL_BINDINGS })}
            className="inline-flex items-center gap-1 rounded-lg border border-[#283042] bg-[#0c0e14] px-2.5 py-1 text-slate-300 hover:text-sky-300"
          >
            <RotateCcw className="h-3 w-3" />
            恢复默认
          </button>
        </div>
      </div>
    </div>
  );
};
