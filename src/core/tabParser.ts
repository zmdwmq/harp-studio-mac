import {
  ChromaticTuning,
  DiatonicTuning,
  HarmonicaHole,
  HarmonicaKey,
  HarmonicaType,
  MappedHoleTarget,
  PitchMatchResult,
  getHarmonicaLayout,
  jianpuToMidi,
  mapMidiToHarmonicaTarget,
} from './harmonicaMap';

export interface TabNoteEvent {
  id: string;
  degree: number; // 1..7
  accidental: '' | '#' | 'b';
  octaveDiff: number; // <0 低音点, 0 中音, >0 高音点
  targetMidi: number;
  mapped: MappedHoleTarget | null;
  startBeat: number;
  durationBeats: number;
  rawToken: string;
}

/**
 * 解析标准简谱文本并自动映射到当前口琴孔位：
 * - 中音：1 2 3 4 5 6 7
 * - 升降号：#1 #4 b3 b7（支持 ♯ / ♭）
 * - 低音点：5, 或 .5（两个低音点：5,, 或 ..5）
 * - 高音点：1' 或 ^1（两个高音点：1'' 或 ^^1）
 * - 拍数括号：1(2)、3(0.5)、4(1.5)（默认 1 拍）
 * - 休止符：0 或 R；小节线：|
 */
export function parseJianpuTab(
  notation: string,
  harmonicaType: HarmonicaType = 'diatonic10',
  harpKey: HarmonicaKey = 'C',
  diatonicTuning: DiatonicTuning = 'richter',
  chromaticTuning: ChromaticTuning = 'solo',
  customHolesC?: HarmonicaHole[]
): TabNoteEvent[] {
  const layout = getHarmonicaLayout(
    harmonicaType,
    harpKey,
    diatonicTuning,
    chromaticTuning,
    customHolesC
  );

  const tokens = notation
    .replace(/\|/g, ' ')
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const notes: TabNoteEvent[] = [];
  let cursorBeat = 0;

  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i];
    const m = raw.match(
      /^([.^]*)([#b♯♭]?)([0-7Rr])([,']*)(?:\(([0-9]+(?:\.[0-9]+)?)\))?$/
    );
    if (!m) continue;

    const leadOct = m[1] || '';
    const accRaw = m[2] || '';
    const body = m[3];
    const trailOct = m[4] || '';
    const dur = m[5] ? Math.max(0.25, Math.min(16, Number(m[5]))) : 1;

    if (body === '0' || body.toUpperCase() === 'R') {
      cursorBeat += dur;
      continue;
    }

    const degree = Number(body);
    if (!Number.isInteger(degree) || degree < 1 || degree > 7) continue;

    const accidental: '' | '#' | 'b' =
      accRaw === '#' || accRaw === '♯'
        ? '#'
        : accRaw === 'b' || accRaw === '♭'
          ? 'b'
          : '';
    const accSemi = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;

    let octaveDiff = 0;
    for (const ch of leadOct) {
      if (ch === '.') octaveDiff--;
      if (ch === '^') octaveDiff++;
    }
    for (const ch of trailOct) {
      if (ch === ',') octaveDiff--;
      if (ch === "'") octaveDiff++;
    }

    const targetMidi = jianpuToMidi(degree, accSemi, octaveDiff, harpKey, harmonicaType);
    const mapped = mapMidiToHarmonicaTarget(targetMidi, layout);

    notes.push({
      id: `j-${i}-${cursorBeat}`,
      degree,
      accidental,
      octaveDiff,
      targetMidi,
      mapped,
      startBeat: cursorBeat,
      durationBeats: dur,
      rawToken: raw,
    });

    cursorBeat += dur;
  }

  return notes;
}

export function getTabTotalBeats(notes: TabNoteEvent[]): number {
  if (notes.length === 0) return 0;
  const last = notes[notes.length - 1];
  return last.startBeat + last.durationBeats;
}

export function formatMappedHoleLabel(mapped: MappedHoleTarget | null): string {
  if (!mapped) return '缺音';
  switch (mapped.action) {
    case 'blow':
      return `↑${mapped.holeLabel}`;
    case 'draw':
      return `↓${mapped.holeLabel}`;
    case 'slide_blow':
      return `⇄↑${mapped.holeLabel}`;
    case 'slide_draw':
      return `⇄↓${mapped.holeLabel}`;
    case 'draw_bend':
      return `⤵${mapped.holeLabel}${"'".repeat(Math.max(1, mapped.bendDepth))}`;
    case 'blow_bend':
      return `⤴${mapped.holeLabel}${"'".repeat(Math.max(1, mapped.bendDepth))}`;
    case 'overblow':
      return `⚡↑${mapped.holeLabel}`;
    case 'overdraw':
      return `⚡↓${mapped.holeLabel}`;
  }
}

export function formatJianpuText(note: TabNoteEvent): string {
  const acc = note.accidental === 'b' ? '♭' : note.accidental;
  const oct =
    note.octaveDiff > 0
      ? "'".repeat(note.octaveDiff)
      : note.octaveDiff < 0
        ? ','.repeat(-note.octaveDiff)
        : '';
  return `${acc}${note.degree}${oct}`;
}

export interface PracticeNoteDetail {
  note: TabNoteEvent;
  status: 'perfect' | 'good' | 'miss';
  hitRatio: number;
  avgAbsCents: number;
  avgSignedCents: number;
}

export interface PracticeReport {
  songTitle: string;
  totalNotes: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  hitRatePct: number;
  avgAbsCents: number;
  totalScore: number;
  grade: 'S' | 'A' | 'B' | 'C';
  weakSpots: string[];
  details: PracticeNoteDetail[];
}

export class PracticeScorer {
  private notes: TabNoteEvent[] = [];
  private stats: {
    totalFrames: number;
    hitFrames: number;
    absCentsSum: number;
    signedCentsSum: number;
  }[] = [];

  reset(notes: TabNoteEvent[]): void {
    this.notes = notes;
    this.stats = notes.map(() => ({
      totalFrames: 0,
      hitFrames: 0,
      absCentsSum: 0,
      signedCentsSum: 0,
    }));
  }

  recordFrame(currentBeat: number, match: PitchMatchResult | null): number {
    const activeIdx = this.notes.findIndex(
      (n) => currentBeat >= n.startBeat && currentBeat < n.startBeat + n.durationBeats
    );
    if (activeIdx < 0) return -1;

    const note = this.notes[activeIdx];
    const st = this.stats[activeIdx];
    st.totalFrames++;

    const hitByMidi = match !== null && match.targetMidi === note.targetMidi;
    const hitByHole =
      match !== null &&
      note.mapped !== null &&
      match.hole === note.mapped.hole &&
      match.action === note.mapped.action;

    if ((hitByMidi || hitByHole) && Math.abs(match!.centsOffset) <= 45) {
      st.hitFrames++;
      st.absCentsSum += Math.abs(match!.centsOffset);
      st.signedCentsSum += match!.centsOffset;
    }

    return activeIdx;
  }

  buildReport(songTitle: string): PracticeReport {
    let perfectCount = 0;
    let goodCount = 0;
    let missCount = 0;
    let totalHitAbsCents = 0;
    let totalHitNotes = 0;

    const details: PracticeNoteDetail[] = this.notes.map((note, i) => {
      const st = this.stats[i] ?? {
        totalFrames: 0,
        hitFrames: 0,
        absCentsSum: 0,
        signedCentsSum: 0,
      };
      const hitRatio = st.totalFrames > 0 ? st.hitFrames / st.totalFrames : 0;
      const avgAbsCents = st.hitFrames > 0 ? st.absCentsSum / st.hitFrames : 50;
      const avgSignedCents = st.hitFrames > 0 ? st.signedCentsSum / st.hitFrames : 0;

      let status: 'perfect' | 'good' | 'miss' = 'miss';
      if (hitRatio >= 0.35) {
        totalHitNotes++;
        totalHitAbsCents += avgAbsCents;
        if (avgAbsCents <= 15) {
          status = 'perfect';
          perfectCount++;
        } else {
          status = 'good';
          goodCount++;
        }
      } else {
        missCount++;
      }

      return { note, status, hitRatio, avgAbsCents, avgSignedCents };
    });

    const totalNotes = this.notes.length;
    const hitRate = totalNotes > 0 ? (perfectCount + goodCount) / totalNotes : 0;
    const avgAbsCents = totalHitNotes > 0 ? Math.round(totalHitAbsCents / totalHitNotes) : 0;
    const pitchAccuracyRate = totalHitNotes > 0 ? Math.max(0, 1 - avgAbsCents / 45) : 0;
    const totalScore =
      totalNotes > 0 ? Math.round(hitRate * 65 + pitchAccuracyRate * 35) : 0;
    const grade: 'S' | 'A' | 'B' | 'C' =
      totalScore >= 90 ? 'S' : totalScore >= 80 ? 'A' : totalScore >= 65 ? 'B' : 'C';

    const weakSpots = details
      .filter((d) => d.status !== 'perfect')
      .sort((a, b) => a.hitRatio - b.hitRatio)
      .slice(0, 3)
      .map((d) => {
        const jLabel = formatJianpuText(d.note);
        const hLabel = formatMappedHoleLabel(d.note.mapped);
        if (d.status === 'miss') return `简谱 ${jLabel}（${hLabel}）：未稳定命中`;
        const dir = d.avgSignedCents >= 0 ? '偏高' : '偏低';
        return `简谱 ${jLabel}（${hLabel}）：音准${dir}约 ${Math.round(d.avgAbsCents)}¢`;
      });

    return {
      songTitle,
      totalNotes,
      perfectCount,
      goodCount,
      missCount,
      hitRatePct: Math.round(hitRate * 100),
      avgAbsCents,
      totalScore,
      grade,
      weakSpots,
      details,
    };
  }
}
