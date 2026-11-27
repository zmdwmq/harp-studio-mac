import { describe, it, expect } from 'vitest';
import {
  HARMONICA_KEYS,
  calculateBackingTransposeSemitones,
  calculatePositionFromSongKey,
  detectChromaticNote,
  getHarmonicaLayout,
  getHoleScaleMatches,
  matchFrequencyToHarmonica,
  midiToHz,
  midiToJianpuParts,
} from '../harmonicaMap';
import { detectPitchYin } from '../pitchYin';
import { encodeWav } from '../wavEncoder';
import { compressProjectJson, decompressProjectBytes } from '../projectSerializer';
import {
  PluginManager,
  evaluatePluginScript,
  parseJsonPlugin,
  serializePluginToJson,
} from '../pluginSystem';
import {
  DEFAULT_PEDAL_BINDINGS,
  formatPedalTrigger,
  matchTriggerToAction,
  parseMidiMessageToTrigger,
} from '../pedalController';
import { NoiseGateProcessor } from '../noiseGate';
import { PracticeScorer, parseJianpuTab } from '../tabParser';

describe('harmonicaMap', () => {
  it('supports all 12 standard 10-hole keys plus low keys, Paddy Richter & overblow', () => {
    expect(HARMONICA_KEYS.length).toBeGreaterThanOrEqual(16);
    const cLayout = getHarmonicaLayout('diatonic10', 'C');
    expect(cLayout).toHaveLength(10);
    expect(cLayout[0].blowMidi).toBe(60); // C4
    expect(cLayout[1].drawBendMidis).toEqual([66, 65]); // 2-hole draw bends Gb4, F4

    // Paddy Richter 3孔吹音升高为 A4 (69)
    const paddy = getHarmonicaLayout('diatonic10', 'C', 'paddy');
    expect(paddy[2].blowMidi).toBe(69);

    // Melody Maker (MM) 3孔吹 A4(69)、5孔吸 F#5(78)、9孔吸 F#6(90)
    const mm = getHarmonicaLayout('diatonic10', 'C', 'melody_maker');
    expect(mm[2].blowMidi).toBe(69);
    expect(mm[4].drawMidi).toBe(78);
    expect(mm[8].drawMidi).toBe(90);

    // Low F 调1孔吹音为 F3 (53)
    const lowF = getHarmonicaLayout('diatonic10', 'Low F');
    expect(lowF[0].blowMidi).toBe(53);

    // 4孔超吹 Eb5 (75)
    const eb5 = matchFrequencyToHarmonica(midiToHz(75), 'diatonic10', 'C');
    expect(eb5?.hole).toBe(4);
    expect(eb5?.action).toBe('overblow');
  });

  it('formats 12/14/16-hole chromatic layouts with bass extensions and D7 top', () => {
    const c12 = getHarmonicaLayout('chromatic12', 'C');
    expect(c12).toHaveLength(12);
    expect(c12[0].holeLabel).toBe('1');
    expect(c12[0].blowMidi).toBe(60); // C4
    expect(c12[11].drawMidi).toBe(98); // D7

    const c14 = getHarmonicaLayout('chromatic14', 'C');
    expect(c14).toHaveLength(14);
    expect(c14[0].holeLabel).toBe('•3');
    expect(c14[1].holeLabel).toBe('•4');
    expect(c14[2].holeLabel).toBe('1');
    expect(c14[13].drawMidi).toBe(98); // D7

    const c16 = getHarmonicaLayout('chromatic16', 'C');
    expect(c16).toHaveLength(16);
    expect(c16[0].holeLabel).toBe('•1');
    expect(c16[3].holeLabel).toBe('•4');
    expect(c16[4].holeLabel).toBe('1');
    expect(c16[15].drawMidi).toBe(98); // D7

    // 龙登杰 C6 调音：1-4孔吹 C E G A (60,64,67,69)，吸 D F A B (62,65,69,71)，12孔吹 C7(96) 吸 B6(95)/推杆 D7(98)
    const c6 = getHarmonicaLayout('chromatic12', 'C', 'richter', 'c6');
    expect(c6.slice(0, 4).map((h) => h.blowMidi)).toEqual([60, 64, 67, 69]);
    expect(c6.slice(0, 4).map((h) => h.drawMidi)).toEqual([62, 65, 69, 71]);
    expect(c6[11].blowMidi).toBe(96);
    expect(c6[11].drawMidi).toBe(95);
    expect(c6[11].slideDrawMidi).toBe(98);
  });

  it('uses standard 24-hole oriental tremolo tuning starting at G3', () => {
    const t24 = getHarmonicaLayout('tremolo24', 'C');
    expect(t24).toHaveLength(24);
    expect(t24[0].blowMidi).toBe(55); // Hole 1 Blow = G3
    expect(t24[1].drawMidi).toBe(59); // Hole 2 Draw = B3
    expect(t24[2].blowMidi).toBe(60); // Hole 3 Blow = C4
    expect(t24[8].blowMidi).toBe(72); // Hole 9 Blow = C5
    expect(t24[9].drawMidi).toBe(71); // Hole 10 Draw = B4 (cross)
  });

  it('matches chromatic slide notes accurately', () => {
    const cSharp4Hz = midiToHz(61);
    const match = matchFrequencyToHarmonica(cSharp4Hz, 'chromatic12', 'C');
    expect(match).not.toBeNull();
    expect(match?.holeLabel).toBe('1');
    expect(match?.action).toBe('slide_blow');
  });

  it('calculates shortest semitone shift for all 12 positions', () => {
    // D song (2) -> C harp (0) 1st position => -2 semitones
    const pos1 = calculateBackingTransposeSemitones(2, 'C', 1);
    expect(pos1.semitones).toBe(-2);
    expect(pos1.targetKeyName).toBe('C 调');

    // A song (9) -> C harp 2nd position (G = 7) => -2 semitones
    const pos2 = calculateBackingTransposeSemitones(9, 'C', 2);
    expect(pos2.semitones).toBe(-2);
    expect(pos2.targetKeyName).toBe('G 调');
  });

  it('respects A4 reference in reed tuner mode', () => {
    const res442 = detectChromaticNote(442, 442);
    expect(res442?.noteName).toBe('A4');
    expect(Math.abs(res442?.centsOffset ?? 99)).toBeLessThan(0.05);
  });

  it('computes movable-do Jianpu parts', () => {
    const hole4 = midiToJianpuParts(72, 'C', 'diatonic10');
    expect(hole4).toEqual({ label: '1', octaveDiff: 0 });
    const gHarpHole4 = midiToJianpuParts(67, 'G', 'diatonic10');
    expect(gHarpHole4).toEqual({ label: '1', octaveDiff: 0 });
  });
});

describe('pitchYin', () => {
  it('detects 440Hz sine wave accurately and rejects silence', () => {
    const sampleRate = 48000;
    const buf = new Float32Array(2048);
    for (let i = 0; i < buf.length; i++) {
      buf[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
    }
    const res = detectPitchYin(buf, sampleRate);
    expect(res).not.toBeNull();
    expect(Math.abs((res?.frequency ?? 0) - 440)).toBeLessThan(1.0);
    expect(res?.confidence).toBeGreaterThan(0.95);

    const silence = new Float32Array(2048);
    expect(detectPitchYin(silence, sampleRate)).toBeNull();
  });
});

describe('wavEncoder & projectSerializer', () => {
  it('encodes valid 16-bit PCM RIFF/WAVE header', () => {
    const ch = new Float32Array([0, 0.5, -0.5, 0]);
    const wav = encodeWav([ch, ch], 48000);
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...wav.slice(8, 12))).toBe('WAVE');
    expect(wav.length).toBe(44 + 4 * 2 * 2);
  });

  it('round-trips compressed and plain project payloads', async () => {
    const sample = JSON.stringify({ version: 1, hello: 'harpstudio', data: 'abc'.repeat(200) });
    const gz = await compressProjectJson(sample);
    expect(gz.length).toBeLessThan(sample.length);
    const restored = await decompressProjectBytes(gz);
    expect(restored).toBe(sample);

    // 兼容旧版明文 JSON
    const plainBytes = new TextEncoder().encode(sample);
    expect(await decompressProjectBytes(plainBytes)).toBe(sample);
  });
});

describe('pluginSystem', () => {
  it('registers, toggles, and evaluates custom JS plugins', () => {
    const pm = new PluginManager();
    const custom = evaluatePluginScript(
      `return { id: "test.p1", name: "Test Plugin", version: "1.0.0", author: "Tester", description: "demo", presets: [], themes: [{ id: "t1", name: "Neon", vars: { bg: "#000", panel: "#111", card: "#222", border: "#333", text: "#fff", textSub: "#eee", muted: "#999", accent: "#0ff" } }] };`
    );
    pm.register(custom, true);
    expect(pm.getEnabledPlugins()).toHaveLength(1);
    expect(pm.getEnabledThemes()).toHaveLength(1);
    pm.setEnabled('test.p1', false);
    expect(pm.getEnabledPlugins()).toHaveLength(0);
    expect(pm.getEnabledThemes()).toHaveLength(0);
  });

  it('computes harmonica position and blues scale hole matches', () => {
    expect(calculatePositionFromSongKey('C', 0)).toBe(1); // C on C harp -> 1st pos
    expect(calculatePositionFromSongKey('C', 7)).toBe(2); // G on C harp -> 2nd pos
    expect(calculatePositionFromSongKey('C', 2)).toBe(3); // D on C harp -> 3rd pos

    const layout = getHarmonicaLayout('diatonic10', 'C', 'richter');
    // 2nd pos G Blues (G=7): Hole 2 draw is G4 (root), Hole 3 draw bend includes Bb (10)
    const hole2 = layout[1];
    const m2 = getHoleScaleMatches(hole2, 7, 'blues');
    expect(m2.drawInScale).toBe(true);
    expect(m2.drawIsRoot).toBe(true);

    const hole3 = layout[2];
    const m3 = getHoleScaleMatches(hole3, 7, 'blues');
    expect(m3.bendInScale).toBe(true);
  });

  it('parses MIDI CC/Note/PC messages and matches pedal actions', () => {
    const ccPress = parseMidiMessageToTrigger([0xb0, 64, 127]);
    expect(ccPress).toEqual({ kind: 'midi_cc', channel: 0, cc: 64 });
    expect(parseMidiMessageToTrigger([0xb0, 64, 0])).toBeNull(); // release ignored

    const notePress = parseMidiMessageToTrigger([0x92, 60, 100]);
    expect(notePress).toEqual({ kind: 'midi_note', channel: 2, note: 60 });
    expect(parseMidiMessageToTrigger([0x92, 60, 0])).toBeNull();

    const bindings = { ...DEFAULT_PEDAL_BINDINGS, toggleRecord: ccPress };
    expect(matchTriggerToAction(bindings, { kind: 'midi_cc', channel: 0, cc: 64 })).toBe(
      'toggleRecord'
    );
    expect(formatPedalTrigger(ccPress)).toContain('CC#64');
  });

  it('parses and serializes zero-code JSON plugins', () => {
    const json = JSON.stringify({
      id: 'alice.ocean-theme',
      name: '海洋蓝',
      themes: [
        {
          id: 'plugin_ocean',
          name: '[插件] 海洋蓝',
          vars: {
            bg: '#050b14',
            panel: '#0b1526',
            card: '#112038',
            border: '#1e3a5f',
            text: '#f0f9ff',
            textSub: '#bae6fd',
            muted: '#7dd3fc',
            accent: '#38bdf8',
          },
        },
      ],
    });
    const parsed = parseJsonPlugin(json);
    expect(parsed.id).toBe('alice.ocean-theme');
    expect(parsed.themes).toHaveLength(1);

    const exported = serializePluginToJson(parsed);
    expect(exported).toContain('"plugin_ocean"');
    expect(() => parseJsonPlugin('{"id":"bad","name":"Bad","themes":[{}]}')).toThrow();
  });

  it('supports custom plugin tuning layouts and transposes by harmonica key', () => {
    const customC = [
      { hole: 1, holeLabel: '1', blowMidi: 60, drawMidi: 62 },
      { hole: 2, holeLabel: '2', blowMidi: 64, drawMidi: 65 },
    ];
    // Transpose to G (-5 semitones): Hole 1 blow becomes 55 (G3)
    const layoutG = getHarmonicaLayout('diatonic10', 'G', 'richter', 'solo', customC);
    expect(layoutG).toHaveLength(2);
    expect(layoutG[0].blowMidi).toBe(55);
    const matched = matchFrequencyToHarmonica(midiToHz(55, 440), 'diatonic10', 'G', 440, 'richter', 'solo', customC);
    expect(matched?.hole).toBe(1);
    expect(matched?.action).toBe('blow');
  });

  it('isolates exceptions thrown by plugin hooks so other plugins continue running', () => {
    const pm = new PluginManager();
    let secondCalled = false;
    pm.register({
      id: 'bad.thrower',
      name: 'Thrower',
      version: '1.0.0',
      author: 'Test',
      description: 'throws',
      onPitchDetected() {
        throw new Error('boom');
      },
      onRecordingComplete() {
        throw new Error('boom rec');
      },
    });
    pm.register({
      id: 'good.listener',
      name: 'Listener',
      version: '1.0.0',
      author: 'Test',
      description: 'ok',
      onPitchDetected() {
        secondCalled = true;
      },
      onRecordingComplete() {
        secondCalled = true;
      },
    });
    expect(() => pm.emitPitch(null, 440)).not.toThrow();
    expect(secondCalled).toBe(true);
    secondCalled = false;
    expect(() => pm.emitRecordingComplete(1.5, 'Track 1')).not.toThrow();
    expect(secondCalled).toBe(true);
  });

  it('attenuates quiet background noise below threshold in NoiseGateProcessor', () => {
    const gate = new NoiseGateProcessor();
    gate.configure(true, -30); // -30 dB ≈ 0.0316 linear
    gate.reset();

    // Quiet noise (0.002 << 0.0316) should stay muted after hold/release
    const quiet = new Float32Array(4800).fill(0.002);
    const quietOut = gate.process(quiet, 48000);
    expect(Math.abs(quietOut[quietOut.length - 1])).toBeLessThan(0.0002);

    // Loud harmonica signal (0.4 >> 0.0316) should open gate near 1.0
    const loud = new Float32Array(4800).fill(0.4);
    const loudOut = gate.process(loud, 48000);
    expect(Math.abs(loudOut[loudOut.length - 1])).toBeGreaterThan(0.35);
  });

  it('parses Jianpu notation, maps to harmonica holes, and scores practice', () => {
    // 10-hole C Richter: 1 -> Hole 4 blow (MIDI 72), 2 -> Hole 4 draw (MIDI 74), 3 -> Hole 5 blow (MIDI 76), 5, -> Hole 2 draw (MIDI 67)
    const notes10 = parseJianpuTab("1 2 3(2) | 5,(1.5) 0(0.5)", 'diatonic10', 'C', 'richter');
    expect(notes10).toHaveLength(4);
    expect(notes10[0].mapped).toMatchObject({ hole: 4, action: 'blow' });
    expect(notes10[1].mapped).toMatchObject({ hole: 4, action: 'draw' });
    expect(notes10[2].mapped).toMatchObject({ hole: 5, action: 'blow' });
    expect(notes10[3].mapped).toMatchObject({ hole: 2, action: 'draw' });

    // Chromatic 12-hole C Solo: middle 1 -> Hole 1 blow (MIDI 60), #1 -> Hole 1 slide blow
    const notesChr = parseJianpuTab('1 #1', 'chromatic12', 'C', 'richter', 'solo');
    expect(notesChr[0].mapped).toMatchObject({ hole: 1, action: 'blow' });
    expect(notesChr[1].mapped).toMatchObject({ hole: 1, action: 'slide_blow' });

    const scorer = new PracticeScorer();
    scorer.reset(notes10);
    scorer.recordFrame(0.5, {
      hole: 4,
      holeLabel: '4',
      action: 'blow',
      noteName: 'C5',
      targetMidi: 72,
      targetHz: 523.25,
      centsOffset: 4,
    });
    scorer.recordFrame(1.5, {
      hole: 4,
      holeLabel: '4',
      action: 'draw',
      noteName: 'D5',
      targetMidi: 74,
      targetHz: 587.33,
      centsOffset: -8,
    });
    const report = scorer.buildReport('Test Jianpu Song');
    expect(report.perfectCount).toBe(2);
    expect(report.missCount).toBe(2);
    expect(report.totalScore).toBeGreaterThan(40);
  });

  it('registers builtin.metronome and toggles getEnabledMetronomePresets', async () => {
    const { PluginManager, BUILTIN_METRONOME_PLUGIN } = await import('../pluginSystem');
    const pm = new PluginManager();
    pm.register(BUILTIN_METRONOME_PLUGIN, true);
    expect(pm.getEnabledPlugins().some((p) => p.id === BUILTIN_METRONOME_PLUGIN.id)).toBe(true);
    const presets = pm.getEnabledMetronomePresets();
    expect(presets.length).toBeGreaterThanOrEqual(3);
    expect(presets[0]).toHaveProperty('bpm');

    pm.setEnabled(BUILTIN_METRONOME_PLUGIN.id, false);
    expect(pm.getEnabledPlugins().some((p) => p.id === BUILTIN_METRONOME_PLUGIN.id)).toBe(false);
    expect(pm.getEnabledMetronomePresets()).toHaveLength(0);
  });

  it('registers and toggles builtin.multitrack-rack', async () => {
    const { PluginManager, BUILTIN_MULTITRACK_RACK_PLUGIN } = await import('../pluginSystem');
    const pm = new PluginManager();
    pm.register(BUILTIN_MULTITRACK_RACK_PLUGIN, true);
    expect(
      pm.getEnabledPlugins().some((p) => p.id === BUILTIN_MULTITRACK_RACK_PLUGIN.id)
    ).toBe(true);

    pm.setEnabled(BUILTIN_MULTITRACK_RACK_PLUGIN.id, false);
    expect(
      pm.getEnabledPlugins().some((p) => p.id === BUILTIN_MULTITRACK_RACK_PLUGIN.id)
    ).toBe(false);
  });
});
