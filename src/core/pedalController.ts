/**
 * MIDI 与蓝牙/USB 翻谱脚踏开关控制模块（纯 TypeScript）
 * 同时支持 Web MIDI (CC / NoteOn / ProgramChange) 与键盘模拟踏板（如 AirTurn / PageTurner）
 */

export type PedalActionId = 'toggleRecord' | 'togglePlay' | 'toggleLoop' | 'nextPreset';

export type PedalTrigger =
  | { kind: 'midi_cc'; channel: number; cc: number }
  | { kind: 'midi_note'; channel: number; note: number }
  | { kind: 'midi_pc'; channel: number; program: number }
  | { kind: 'key'; code: string };

export type PedalBindings = Record<PedalActionId, PedalTrigger | null>;

export const PEDAL_STORAGE_KEY = 'harpstudio_pedal_bindings_v1';

export const DEFAULT_PEDAL_BINDINGS: PedalBindings = {
  toggleRecord: { kind: 'key', code: 'F9' },
  togglePlay: { kind: 'key', code: 'F10' },
  toggleLoop: { kind: 'key', code: 'F11' },
  nextPreset: { kind: 'key', code: 'F12' },
};

export const PEDAL_ACTION_META: { id: PedalActionId; label: string; desc: string }[] = [
  { id: 'toggleRecord', label: '开始 / 停止录音', desc: '踩下开始录音或结束叠录（支持预备拍）' },
  { id: 'togglePlay', label: '播放 / 暂停伴奏', desc: '控制伴奏播放或试听成品' },
  { id: 'toggleLoop', label: '开启 / 关闭 AB 循环', desc: '练琴时快速开关片段循环' },
  { id: 'nextPreset', label: '切换下一音色预设', desc: '在当前可用 DSP 音色预设间循环切换' },
];

export function loadPedalBindings(): PedalBindings {
  try {
    const raw = localStorage.getItem(PEDAL_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PEDAL_BINDINGS };
    const parsed = JSON.parse(raw) as Partial<PedalBindings>;
    return {
      toggleRecord: parsed.toggleRecord ?? DEFAULT_PEDAL_BINDINGS.toggleRecord,
      togglePlay: parsed.togglePlay ?? DEFAULT_PEDAL_BINDINGS.togglePlay,
      toggleLoop: parsed.toggleLoop ?? DEFAULT_PEDAL_BINDINGS.toggleLoop,
      nextPreset: parsed.nextPreset ?? DEFAULT_PEDAL_BINDINGS.nextPreset,
    };
  } catch {
    return { ...DEFAULT_PEDAL_BINDINGS };
  }
}

export function savePedalBindings(bindings: PedalBindings): void {
  try {
    localStorage.setItem(PEDAL_STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // ignore
  }
}

export function formatPedalTrigger(trigger: PedalTrigger | null): string {
  if (!trigger) return '未绑定';
  switch (trigger.kind) {
    case 'midi_cc':
      return `MIDI CC#${trigger.cc} (Ch.${trigger.channel + 1})`;
    case 'midi_note':
      return `MIDI Note ${trigger.note} (Ch.${trigger.channel + 1})`;
    case 'midi_pc':
      return `MIDI PC#${trigger.program} (Ch.${trigger.channel + 1})`;
    case 'key':
      return `按键 [${trigger.code}]`;
  }
}

/** 将原始 MIDI 三字节消息解析为 PedalTrigger（仅在踩下/有效触发时返回，松开返回 null） */
export function parseMidiMessageToTrigger(data: Uint8Array | number[]): PedalTrigger | null {
  if (!data || data.length < 2) return null;
  const status = data[0];
  const type = status & 0xf0;
  const channel = status & 0x0f;
  const d1 = data[1];
  const d2 = data.length >= 3 ? data[2] : 0;

  if (type === 0xb0) {
    // Control Change: 仅值 >= 64 视为踩下触发，避免松开(0)重复触发
    if (d2 >= 64) {
      return { kind: 'midi_cc', channel, cc: d1 };
    }
    return null;
  }
  if (type === 0x90) {
    if (d2 > 0) {
      return { kind: 'midi_note', channel, note: d1 };
    }
    return null;
  }
  if (type === 0xc0) {
    return { kind: 'midi_pc', channel, program: d1 };
  }
  return null;
}

export function isSameTrigger(a: PedalTrigger | null, b: PedalTrigger | null): boolean {
  if (!a || !b || a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'midi_cc':
      return b.kind === 'midi_cc' && a.channel === b.channel && a.cc === b.cc;
    case 'midi_note':
      return b.kind === 'midi_note' && a.channel === b.channel && a.note === b.note;
    case 'midi_pc':
      return b.kind === 'midi_pc' && a.channel === b.channel && a.program === b.program;
    case 'key':
      return b.kind === 'key' && a.code === b.code;
  }
}

export function matchTriggerToAction(
  bindings: PedalBindings,
  incoming: PedalTrigger
): PedalActionId | null {
  for (const meta of PEDAL_ACTION_META) {
    if (isSameTrigger(bindings[meta.id], incoming)) {
      return meta.id;
    }
  }
  return null;
}
