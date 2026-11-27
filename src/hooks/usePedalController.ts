import React from 'react';
import {
  PedalActionId,
  PedalBindings,
  PedalTrigger,
  formatPedalTrigger,
  loadPedalBindings,
  matchTriggerToAction,
  parseMidiMessageToTrigger,
  savePedalBindings,
} from '../core/pedalController';

export function usePedalController(
  onAction: (action: PedalActionId) => void,
  setStatusMsg: (msg: string) => void
) {
  const [pedalBindings, setPedalBindings] = React.useState<PedalBindings>(() =>
    loadPedalBindings()
  );
  const [learningPedalAction, setLearningPedalAction] = React.useState<PedalActionId | null>(null);
  const [midiSupported, setMidiSupported] = React.useState<boolean>(
    () =>
      typeof navigator !== 'undefined' &&
      typeof (navigator as Navigator & { requestMIDIAccess?: unknown }).requestMIDIAccess ===
        'function'
  );
  const [midiDevices, setMidiDevices] = React.useState<string[]>([]);
  const lastPedalTriggerAtRef = React.useRef<number>(0);

  const dispatchRef = React.useRef<(trigger: PedalTrigger) => void>(() => {});
  dispatchRef.current = (trigger: PedalTrigger) => {
    const now = performance.now();
    if (learningPedalAction) {
      const next = { ...pedalBindings, [learningPedalAction]: trigger };
      setPedalBindings(next);
      savePedalBindings(next);
      setLearningPedalAction(null);
      setStatusMsg(`已绑定脚踏信号：${formatPedalTrigger(trigger)}`);
      lastPedalTriggerAtRef.current = now;
      return;
    }

    if (now - lastPedalTriggerAtRef.current < 260) return;
    const action = matchTriggerToAction(pedalBindings, trigger);
    if (!action) return;
    lastPedalTriggerAtRef.current = now;
    onAction(action);
  };

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditingText =
        tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
      if (isEditingText && !learningPedalAction) return;

      if (learningPedalAction) {
        e.preventDefault();
      }
      const trigger: PedalTrigger = { kind: 'key', code: e.code };
      if (!learningPedalAction && matchTriggerToAction(pedalBindings, trigger)) {
        e.preventDefault();
      }
      dispatchRef.current(trigger);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [learningPedalAction, pedalBindings]);

  React.useEffect(() => {
    const nav = navigator as Navigator & {
      requestMIDIAccess?: () => Promise<MIDIAccess>;
    };
    if (typeof nav.requestMIDIAccess !== 'function') {
      setMidiSupported(false);
      return;
    }

    let cancelled = false;
    let accessRef: MIDIAccess | null = null;

    const bindInputs = () => {
      if (!accessRef || cancelled) return;
      const names: string[] = [];
      accessRef.inputs.forEach((input) => {
        names.push(input.name || 'MIDI Pedal');
        input.onmidimessage = (ev) => {
          if (!ev.data) return;
          const trigger = parseMidiMessageToTrigger(ev.data);
          if (trigger) dispatchRef.current(trigger);
        };
      });
      setMidiDevices(names);
    };

    nav
      .requestMIDIAccess()
      .then((access) => {
        if (cancelled) return;
        setMidiSupported(true);
        accessRef = access;
        bindInputs();
        access.onstatechange = bindInputs;
      })
      .catch(() => {
        if (!cancelled) setMidiSupported(false);
      });

    return () => {
      cancelled = true;
      if (accessRef) {
        accessRef.onstatechange = null;
        accessRef.inputs.forEach((input) => {
          input.onmidimessage = null;
        });
      }
    };
  }, []);

  const updateBindings = React.useCallback((next: PedalBindings) => {
    setPedalBindings(next);
    savePedalBindings(next);
  }, []);

  return {
    pedalBindings,
    updateBindings,
    learningPedalAction,
    setLearningPedalAction,
    midiSupported,
    midiDevices,
  };
}
