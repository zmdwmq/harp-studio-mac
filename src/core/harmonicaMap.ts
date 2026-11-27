/**
 * 口琴类型、调性与孔位音高映射（纯 TypeScript，零平台依赖）
 */

export type HarmonicaType =
  | 'diatonic10'
  | 'chromatic12'
  | 'chromatic14'
  | 'chromatic16'
  | 'tremolo24';

export type DiatonicTuning = 'richter' | 'paddy' | 'country' | 'melody_maker' | 'natural_minor';
export type ChromaticTuning = 'solo' | 'c6';

export type HarmonicaKey =
  | 'Low C'
  | 'Low D'
  | 'Low Eb'
  | 'Low F'
  | 'G'
  | 'Ab'
  | 'A'
  | 'Bb'
  | 'B'
  | 'C'
  | 'Db'
  | 'D'
  | 'Eb'
  | 'E'
  | 'F'
  | 'F#';

export type BreathAction =
  | 'blow'
  | 'draw'
  | 'draw_bend'
  | 'blow_bend'
  | 'overblow'
  | 'overdraw'
  | 'slide_blow'
  | 'slide_draw';

export interface HarmonicaHole {
  hole: number;
  holeLabel: string;
  isBassExtension?: boolean;
  blowMidi: number;
  drawMidi: number;
  drawBendMidis?: number[];
  blowBendMidis?: number[];
  overblowMidi?: number;
  overdrawMidi?: number;
  slideBlowMidi?: number;
  slideDrawMidi?: number;
}

export interface PitchMatchResult {
  hole: number;
  holeLabel: string;
  action: BreathAction;
  noteName: string;
  targetMidi: number;
  targetHz: number;
  centsOffset: number;
}

export interface ChromaticTunerResult {
  freqHz: number;
  targetMidi: number;
  noteName: string;
  targetHz: number;
  centsOffset: number;
}

export const HARMONICA_KEYS: { key: HarmonicaKey; label: string; semitoneOffset: number }[] = [
  { key: 'Low C', label: 'Low C 调（超低音）', semitoneOffset: -12 },
  { key: 'Low D', label: 'Low D 调（低音）', semitoneOffset: -10 },
  { key: 'Low Eb', label: 'Low Eb 调（低音）', semitoneOffset: -9 },
  { key: 'Low F', label: 'Low F 调（低音）', semitoneOffset: -7 },
  { key: 'C', label: 'C 调（标准）', semitoneOffset: 0 },
  { key: 'G', label: 'G 调', semitoneOffset: -5 },
  { key: 'Ab', label: '降A 调 (Ab)', semitoneOffset: -4 },
  { key: 'A', label: 'A 调', semitoneOffset: -3 },
  { key: 'Bb', label: '降B 调 (Bb)', semitoneOffset: -2 },
  { key: 'B', label: 'B 调', semitoneOffset: -1 },
  { key: 'Db', label: '降D 调 (Db)', semitoneOffset: 1 },
  { key: 'D', label: 'D 调', semitoneOffset: 2 },
  { key: 'Eb', label: '降E 调 (Eb)', semitoneOffset: 3 },
  { key: 'E', label: 'E 调', semitoneOffset: 4 },
  { key: 'F', label: 'F 调', semitoneOffset: 5 },
  { key: 'F#', label: '升F 调 (F#)', semitoneOffset: 6 },
];

export const SONG_KEYS: { index: number; name: string }[] = [
  { index: 0, name: 'C 调' },
  { index: 1, name: 'C#/Db 调' },
  { index: 2, name: 'D 调' },
  { index: 3, name: 'Eb 调' },
  { index: 4, name: 'E 调' },
  { index: 5, name: 'F 调' },
  { index: 6, name: 'F#/Gb 调' },
  { index: 7, name: 'G 调' },
  { index: 8, name: 'Ab 调' },
  { index: 9, name: 'A 调' },
  { index: 10, name: 'Bb 调' },
  { index: 11, name: 'B 调' },
];

export const HARMONICA_POSITIONS: { pos: number; label: string }[] = [
  { pos: 1, label: '1把位（直吹/大调）' },
  { pos: 2, label: '2把位（布鲁斯常用）' },
  { pos: 3, label: '3把位（小调常用）' },
  { pos: 4, label: '4把位（自然小调）' },
  { pos: 5, label: '5把位（小调）' },
  { pos: 6, label: '6把位' },
  { pos: 7, label: '7把位' },
  { pos: 8, label: '8把位' },
  { pos: 9, label: '9把位' },
  { pos: 10, label: '10把位' },
  { pos: 11, label: '11把位' },
  { pos: 12, label: '12把位（下属大调）' },
];

/**
 * 计算初学者伴奏移调半音数（最短半音距离 -6 ~ +6）
 * position = 1~12：按五度圈顺时针递增（每升高1把位 +7 半音 mod 12）
 */
export function calculateBackingTransposeSemitones(
  songKeyIndex: number,
  harpKey: HarmonicaKey,
  position: number
): { semitones: number; targetKeyName: string } {
  const harpOffset = HARMONICA_KEYS.find((k) => k.key === harpKey)?.semitoneOffset ?? 0;
  const harpPitchClass = ((harpOffset % 12) + 12) % 12;
  const posOffset = (((position - 1) * 7) % 12 + 12) % 12;
  const targetPitchClass = (harpPitchClass + posOffset) % 12;
  let diff = targetPitchClass - songKeyIndex;
  while (diff > 6) diff -= 12;
  while (diff < -6) diff += 12;
  const targetKeyName = SONG_KEYS[targetPitchClass]?.name ?? 'C 调';
  return { semitones: diff, targetKeyName };
}

const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export function midiToHz(midi: number, a4Hz = 440): number {
  return a4Hz * Math.pow(2, (midi - 69) / 12);
}

export function hzToMidiFloat(hz: number, a4Hz = 440): number {
  return 69 + 12 * Math.log2(hz / a4Hz);
}

/** 调琴用高精度十二平均律频率检测 */
export function detectChromaticNote(freqHz: number, a4Hz = 440): ChromaticTunerResult | null {
  if (freqHz < 60 || freqHz > 4500) return null;
  const midiFloat = hzToMidiFloat(freqHz, a4Hz);
  const targetMidi = Math.round(midiFloat);
  const centsOffset = (midiFloat - targetMidi) * 100;
  return {
    freqHz,
    targetMidi,
    noteName: midiToNoteName(targetMidi),
    targetHz: midiToHz(targetMidi, a4Hz),
    centsOffset,
  };
}

export function midiToNoteName(midi: number): string {
  const rounded = Math.round(midi);
  const octave = Math.floor(rounded / 12) - 1;
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
  return `${name}${octave}`;
}

export interface JianpuParts {
  label: string;
  octaveDiff: number; // <0 低音点数, 0 中音, >0 高音点数
}

const JIANPU_SCALE = ['1', '#1', '2', 'b3', '3', '4', '#4', '5', '#5', '6', 'b7', '7'];

/**
 * 将 MIDI 音高转换为口琴首调简谱表示
 * - 10孔口琴以第4孔吹音(C5相对音)为中音1
 * - 半音阶与24孔复音以 C4相对音为中音1
 */
export function midiToJianpuParts(
  midi: number,
  key: HarmonicaKey,
  type: HarmonicaType
): JianpuParts {
  const offset = HARMONICA_KEYS.find((k) => k.key === key)?.semitoneOffset ?? 0;
  const relMidi = Math.round(midi) - offset;
  const baseC = type === 'diatonic10' ? 72 : 60;
  const diffFromBase = relMidi - baseC;
  const octaveDiff = Math.floor(diffFromBase / 12);
  const degree = ((diffFromBase % 12) + 12) % 12;
  return {
    label: JIANPU_SCALE[degree],
    octaveDiff,
  };
}

const MAJOR_SCALE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

/** 将首调简谱音符（1-7、升降号、八度偏移）转换为目标 MIDI 音高 */
export function jianpuToMidi(
  degree: number,
  accidentalSemitones: number,
  octaveDiff: number,
  key: HarmonicaKey,
  type: HarmonicaType
): number {
  const offset = HARMONICA_KEYS.find((k) => k.key === key)?.semitoneOffset ?? 0;
  const baseC = type === 'diatonic10' ? 72 : 60;
  const step = MAJOR_SCALE_SEMITONES[Math.max(0, Math.min(6, degree - 1))] ?? 0;
  return baseC + offset + step + accidentalSemitones + octaveDiff * 12;
}

export interface MappedHoleTarget {
  hole: number;
  holeLabel: string;
  action: BreathAction;
  bendDepth: number;
}

/** 将目标 MIDI 音高映射到当前口琴布局的最佳孔位与吹吸动作（优先自然吹吸，其次推杆/压音/超吹） */
export function mapMidiToHarmonicaTarget(
  targetMidi: number,
  layout: HarmonicaHole[]
): MappedHoleTarget | null {
  for (const h of layout) {
    if (h.blowMidi === targetMidi) return { hole: h.hole, holeLabel: h.holeLabel, action: 'blow', bendDepth: 0 };
    if (h.drawMidi === targetMidi) return { hole: h.hole, holeLabel: h.holeLabel, action: 'draw', bendDepth: 0 };
  }
  for (const h of layout) {
    if (h.slideBlowMidi === targetMidi) {
      return { hole: h.hole, holeLabel: h.holeLabel, action: 'slide_blow', bendDepth: 0 };
    }
    if (h.slideDrawMidi === targetMidi) {
      return { hole: h.hole, holeLabel: h.holeLabel, action: 'slide_draw', bendDepth: 0 };
    }
  }
  for (const h of layout) {
    const dbIdx = h.drawBendMidis?.indexOf(targetMidi) ?? -1;
    if (dbIdx >= 0) {
      return { hole: h.hole, holeLabel: h.holeLabel, action: 'draw_bend', bendDepth: dbIdx + 1 };
    }
    const bbIdx = h.blowBendMidis?.indexOf(targetMidi) ?? -1;
    if (bbIdx >= 0) {
      return { hole: h.hole, holeLabel: h.holeLabel, action: 'blow_bend', bendDepth: bbIdx + 1 };
    }
  }
  for (const h of layout) {
    if (h.overblowMidi === targetMidi) {
      return { hole: h.hole, holeLabel: h.holeLabel, action: 'overblow', bendDepth: 0 };
    }
    if (h.overdrawMidi === targetMidi) {
      return { hole: h.hole, holeLabel: h.holeLabel, action: 'overdraw', bendDepth: 0 };
    }
  }
  return null;
}

/** C 调标准十孔布鲁斯口琴 (Richter Tuning + 常见超吹/超吸音位, C4 = MIDI 60) */
const DIATONIC_10_C: HarmonicaHole[] = [
  { hole: 1, holeLabel: '1', blowMidi: 60, drawMidi: 62, drawBendMidis: [61], overblowMidi: 63 },
  { hole: 2, holeLabel: '2', blowMidi: 64, drawMidi: 67, drawBendMidis: [66, 65] },
  { hole: 3, holeLabel: '3', blowMidi: 67, drawMidi: 71, drawBendMidis: [70, 69, 68] },
  { hole: 4, holeLabel: '4', blowMidi: 72, drawMidi: 74, drawBendMidis: [73], overblowMidi: 75 },
  { hole: 5, holeLabel: '5', blowMidi: 76, drawMidi: 77, overblowMidi: 78 },
  { hole: 6, holeLabel: '6', blowMidi: 79, drawMidi: 81, drawBendMidis: [80], overblowMidi: 82 },
  { hole: 7, holeLabel: '7', blowMidi: 84, drawMidi: 83, overdrawMidi: 85 },
  { hole: 8, holeLabel: '8', blowMidi: 88, drawMidi: 86, blowBendMidis: [87] },
  { hole: 9, holeLabel: '9', blowMidi: 91, drawMidi: 89, blowBendMidis: [90], overdrawMidi: 92 },
  { hole: 10, holeLabel: '10', blowMidi: 96, drawMidi: 93, blowBendMidis: [95, 94], overdrawMidi: 97 },
];

function applyDiatonicTuningC(tuning: DiatonicTuning): HarmonicaHole[] {
  if (tuning === 'richter') return DIATONIC_10_C;
  return DIATONIC_10_C.map((h) => {
    if (tuning === 'paddy' && h.hole === 3) {
      // Paddy Richter：3孔吹音升高大二度 (G4 -> A4)，方便民谣/流行直接吹中音6
      return { ...h, blowMidi: 69, drawBendMidis: [70] };
    }
    if (tuning === 'country' && h.hole === 5) {
      // Country 调弦：5孔吸音升高半音 (F5 -> F#5)
      return { ...h, drawMidi: 78, overblowMidi: undefined };
    }
    if (tuning === 'melody_maker') {
      // Melody Maker (MM)：3孔吹升高大二度(G4->A4)，5孔与9孔吸升高半音(F->F#)
      if (h.hole === 3) return { ...h, blowMidi: 69, drawBendMidis: [70] };
      if (h.hole === 5) return { ...h, drawMidi: 78, overblowMidi: undefined };
      if (h.hole === 9) return { ...h, drawMidi: 90, blowBendMidis: undefined };
    }
    if (tuning === 'natural_minor') {
      // 自然小调：降3级、降6级、降7级（以C自然小调2把位或直吹常用排列近似）
      if (h.hole === 2 || h.hole === 5 || h.hole === 8) {
        return { ...h, blowMidi: h.blowMidi - 1 };
      }
      if (h.hole === 3 || h.hole === 7 || h.hole === 10) {
        return { ...h, drawMidi: h.drawMidi - 1 };
      }
    }
    return h;
  });
}

/** 生成 C 调半音阶口琴（支持 Solo 标准 / 龙登杰 C6 调弦，12 / 14 / 16 孔，14/16 孔倍低音区采用 •3•4 / •1•2•3•4 + 1~12 孔编号） */
function buildChromaticC(
  holeCount: 12 | 14 | 16,
  tuning: ChromaticTuning = 'solo'
): HarmonicaHole[] {
  // 以 16 孔（C3 起音）为基准，14 孔从 •3(G3)起，12 孔从 1(C4)起
  const startIndex = holeCount === 16 ? 0 : holeCount === 14 ? 2 : 4;
  // 龙登杰 C6：吹气 1 3 5 6 (C E G A)，吸气 2 4 6 7 (D F A B)；第12孔吹音为高八度1(C7)，吸音为7(B6)/推杆2(D7)
  const blowPattern = tuning === 'c6' ? [48, 52, 55, 57] : [48, 52, 55, 60];
  const drawPattern = [50, 53, 57, 59];
  return Array.from({ length: holeCount }, (_, idx) => {
    const absIdx = startIndex + idx;
    const octaveOffset = Math.floor(absIdx / 4) * 12;
    const pos = absIdx % 4;
    const isTopHole = idx === holeCount - 1;

    const blowBase =
      tuning === 'c6' && isTopHole ? 96 : blowPattern[pos] + octaveOffset;
    const drawBase =
      tuning === 'solo' && isTopHole ? 98 : drawPattern[pos] + octaveOffset;
    const slideDrawBase =
      tuning === 'c6' && isTopHole ? 98 : drawBase + 1;

    const isBassExtension = absIdx < 4;
    const holeLabel = isBassExtension ? `•${absIdx + 1}` : `${absIdx - 3}`;
    return {
      hole: idx + 1,
      holeLabel,
      isBassExtension,
      blowMidi: blowBase,
      drawMidi: drawBase,
      slideBlowMidi: blowBase + 1,
      slideDrawMidi: slideDrawBase,
    };
  });
}

const CHROMATIC_12_C = buildChromaticC(12, 'solo');
const CHROMATIC_14_C = buildChromaticC(14, 'solo');
const CHROMATIC_16_C = buildChromaticC(16, 'solo');
const CHROMATIC_12_C6 = buildChromaticC(12, 'c6');
const CHROMATIC_14_C6 = buildChromaticC(14, 'c6');
const CHROMATIC_16_C6 = buildChromaticC(16, 'c6');

/** C 调 24 孔复音口琴（东方标准排列，1-24 孔奇吹偶吸，G3 起音） */
const TREMOLO_24_C: HarmonicaHole[] = (() => {
  // 奇数孔吹音 (1,3,5,...,23): G3, C4, E4, G4, C5, E5, G5, C6, E6, G6, C7, E7
  // 偶数孔吸音 (2,4,6,...,24): B3, D4, F4, A4, B4, D5, F5, A5, B5, D6, F6, A6
  const blowSeq = [55, 60, 64, 67, 72, 76, 79, 84, 88, 91, 96, 100];
  const drawSeq = [59, 62, 65, 69, 71, 74, 77, 81, 83, 86, 89, 93];
  const holes: HarmonicaHole[] = [];
  for (let i = 0; i < 24; i++) {
    const pairIdx = Math.floor(i / 2);
    const isBlow = i % 2 === 0;
    holes.push({
      hole: i + 1,
      holeLabel: `${i + 1}`,
      blowMidi: isBlow ? blowSeq[pairIdx] : -1,
      drawMidi: !isBlow ? drawSeq[pairIdx] : -1,
    });
  }
  return holes;
})();

export function getHarmonicaLayout(
  type: HarmonicaType,
  key: HarmonicaKey,
  tuning: DiatonicTuning = 'richter',
  chromaticTuning: ChromaticTuning = 'solo',
  customHolesC?: HarmonicaHole[]
): HarmonicaHole[] {
  const offset = HARMONICA_KEYS.find((k) => k.key === key)?.semitoneOffset ?? 0;
  const base =
    customHolesC && customHolesC.length > 0
      ? customHolesC
      : type === 'diatonic10'
      ? applyDiatonicTuningC(tuning)
      : type === 'chromatic12'
        ? chromaticTuning === 'c6'
          ? CHROMATIC_12_C6
          : CHROMATIC_12_C
        : type === 'chromatic14'
          ? chromaticTuning === 'c6'
            ? CHROMATIC_14_C6
            : CHROMATIC_14_C
          : type === 'chromatic16'
            ? chromaticTuning === 'c6'
              ? CHROMATIC_16_C6
              : CHROMATIC_16_C
            : TREMOLO_24_C;

  return base.map((h) => ({
    hole: h.hole,
    holeLabel: h.holeLabel,
    isBassExtension: h.isBassExtension,
    blowMidi: h.blowMidi >= 0 ? h.blowMidi + offset : -1,
    drawMidi: h.drawMidi >= 0 ? h.drawMidi + offset : -1,
    drawBendMidis: h.drawBendMidis?.map((m) => m + offset),
    blowBendMidis: h.blowBendMidis?.map((m) => m + offset),
    overblowMidi: h.overblowMidi !== undefined ? h.overblowMidi + offset : undefined,
    overdrawMidi: h.overdrawMidi !== undefined ? h.overdrawMidi + offset : undefined,
    slideBlowMidi: h.slideBlowMidi !== undefined ? h.slideBlowMidi + offset : undefined,
    slideDrawMidi: h.slideDrawMidi !== undefined ? h.slideDrawMidi + offset : undefined,
  }));
}

/** 将检测到的频率匹配到当前口琴最接近的孔位与吹吸动作 */
export function matchFrequencyToHarmonica(
  freqHz: number,
  type: HarmonicaType,
  key: HarmonicaKey,
  a4Hz = 440,
  tuning: DiatonicTuning = 'richter',
  chromaticTuning: ChromaticTuning = 'solo',
  customHolesC?: HarmonicaHole[]
): PitchMatchResult | null {
  if (freqHz < 65 || freqHz > 4200) return null;

  const midiFloat = hzToMidiFloat(freqHz, a4Hz);
  const layout = getHarmonicaLayout(type, key, tuning, chromaticTuning, customHolesC);

  let best: PitchMatchResult | null = null;
  let minAbsCents = Infinity;

  const consider = (
    hole: number,
    holeLabel: string,
    action: BreathAction,
    targetMidi: number
  ) => {
    if (targetMidi < 0) return;
    const centsOffset = (midiFloat - targetMidi) * 100;
    const absCents = Math.abs(centsOffset);
    if (absCents < minAbsCents) {
      minAbsCents = absCents;
      best = {
        hole,
        holeLabel,
        action,
        noteName: midiToNoteName(targetMidi),
        targetMidi,
        targetHz: midiToHz(targetMidi, a4Hz),
        centsOffset,
      };
    }
  };

  for (const h of layout) {
    consider(h.hole, h.holeLabel, 'blow', h.blowMidi);
    consider(h.hole, h.holeLabel, 'draw', h.drawMidi);
    h.drawBendMidis?.forEach((m) => consider(h.hole, h.holeLabel, 'draw_bend', m));
    h.blowBendMidis?.forEach((m) => consider(h.hole, h.holeLabel, 'blow_bend', m));
    if (h.overblowMidi !== undefined) consider(h.hole, h.holeLabel, 'overblow', h.overblowMidi);
    if (h.overdrawMidi !== undefined) consider(h.hole, h.holeLabel, 'overdraw', h.overdrawMidi);
    if (h.slideBlowMidi !== undefined) consider(h.hole, h.holeLabel, 'slide_blow', h.slideBlowMidi);
    if (h.slideDrawMidi !== undefined) consider(h.hole, h.holeLabel, 'slide_draw', h.slideDrawMidi);
  }

  return minAbsCents <= 65 ? best : null;
}

export type ScaleOverlayMode = 'off' | 'blues' | 'major_pentatonic' | 'natural_minor';

const SCALE_INTERVALS: Record<Exclude<ScaleOverlayMode, 'off'>, number[]> = {
  blues: [0, 3, 5, 6, 7, 10],
  major_pentatonic: [0, 2, 4, 7, 9],
  natural_minor: [0, 2, 3, 5, 7, 8, 10],
};

/** 获取口琴调性对应的音级（0=C, 1=Db, ..., 11=B） */
export function getKeyPitchClass(key: HarmonicaKey): number {
  const found = HARMONICA_KEYS.find((k) => k.key === key);
  const offset = found ? found.semitoneOffset : 0;
  return ((offset % 12) + 12) % 12;
}

/** 根据口琴调性与曲目/伴奏调性（0=C..11=B），按五度圈计算把位（1~12） */
export function calculatePositionFromSongKey(
  harpKey: HarmonicaKey,
  songKeyIndex: number
): number {
  const harpPc = getKeyPitchClass(harpKey);
  const steps = (((songKeyIndex - harpPc) * 7) % 12 + 12) % 12;
  return steps + 1;
}

/** 获取指定主音与音阶模式的 12 平均律音级集合 */
export function getScalePitchClasses(
  rootPitchClass: number,
  mode: Exclude<ScaleOverlayMode, 'off'>
): Set<number> {
  const root = ((rootPitchClass % 12) + 12) % 12;
  return new Set(SCALE_INTERVALS[mode].map((iv) => (root + iv) % 12));
}

export interface HoleScaleMatchInfo {
  blowInScale: boolean;
  drawInScale: boolean;
  bendInScale: boolean;
  slideInScale: boolean;
  blowIsRoot: boolean;
  drawIsRoot: boolean;
}

/** 检查单个孔位的吹/吸/压音/推杆音是否落在目标音阶内 */
export function getHoleScaleMatches(
  hole: HarmonicaHole,
  rootPitchClass: number,
  mode: Exclude<ScaleOverlayMode, 'off'>
): HoleScaleMatchInfo {
  const root = ((rootPitchClass % 12) + 12) % 12;
  const scaleSet = getScalePitchClasses(root, mode);
  const inScale = (midi: number | undefined) =>
    midi !== undefined && midi >= 0 && scaleSet.has(((midi % 12) + 12) % 12);
  const isRoot = (midi: number | undefined) =>
    midi !== undefined && midi >= 0 && ((midi % 12) + 12) % 12 === root;

  const bendInScale =
    (hole.drawBendMidis?.some((m) => inScale(m)) ?? false) ||
    (hole.blowBendMidis?.some((m) => inScale(m)) ?? false);
  const slideInScale = inScale(hole.slideBlowMidi) || inScale(hole.slideDrawMidi);

  return {
    blowInScale: inScale(hole.blowMidi),
    drawInScale: inScale(hole.drawMidi),
    bendInScale,
    slideInScale,
    blowIsRoot: isRoot(hole.blowMidi),
    drawIsRoot: isRoot(hole.drawMidi),
  };
}
