import React from 'react';
import { X, Compass } from 'lucide-react';
import { HARMONICA_KEYS, HarmonicaKey } from '../core/harmonicaMap';
import { AppLocale } from '../core/i18n';

interface CircleOfFifthsModalProps {
  locale: AppLocale;
  harpKey: HarmonicaKey;
  onClose: () => void;
}

// 五度圈顺时针 12 个调（pitchClass 0..11）
const FIFTHS_RING: { name: string; pitchClass: number }[] = [
  { name: 'C', pitchClass: 0 },
  { name: 'G', pitchClass: 7 },
  { name: 'D', pitchClass: 2 },
  { name: 'A', pitchClass: 9 },
  { name: 'E', pitchClass: 4 },
  { name: 'B', pitchClass: 11 },
  { name: 'F#', pitchClass: 6 },
  { name: 'Db', pitchClass: 1 },
  { name: 'Ab', pitchClass: 8 },
  { name: 'Eb', pitchClass: 3 },
  { name: 'Bb', pitchClass: 10 },
  { name: 'F', pitchClass: 5 },
];

export const CircleOfFifthsModal: React.FC<CircleOfFifthsModalProps> = ({
  locale,
  harpKey,
  onClose,
}) => {
  const harpOffset = HARMONICA_KEYS.find((k) => k.key === harpKey)?.semitoneOffset ?? 0;
  const harpPitchClass = ((harpOffset % 12) + 12) % 12;
  const harpRingIdx = FIFTHS_RING.findIndex((n) => n.pitchClass === harpPitchClass);
  const [selectedPos, setSelectedPos] = React.useState(2);

  const targetNode = FIFTHS_RING[(harpRingIdx + selectedPos - 1) % 12];

  const posDesc = (pos: number) => {
    if (locale === 'en') {
      if (pos === 1) return '1st Pos (Straight / Major)';
      if (pos === 2) return '2nd Pos (Cross Harp / Blues)';
      if (pos === 3) return '3rd Pos (Minor Blues / Dorian)';
      return `Position ${pos}`;
    }
    if (locale === 'ja') {
      if (pos === 1) return '1st (ストレート/メジャー)';
      if (pos === 2) return '2nd (クロスハープ/ブルース)';
      if (pos === 3) return '3rd (マイナーブルース)';
      return `ポジション ${pos}`;
    }
    if (pos === 1) return '1把位（直吹/流行民谣大调）';
    if (pos === 2) return '2把位（Cross Harp/布鲁斯最常用）';
    if (pos === 3) return '3把位（Dorian/小调布鲁斯常用）';
    if (pos === 4) return '4把位（自然小调）';
    if (pos === 12) return '12把位（下属大调）';
    return `第 ${pos} 把位`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-[#283042] bg-[#141821] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-sky-400" />
            <h2 className="text-base font-bold text-slate-100">
              {locale === 'en'
                ? 'Circle of Fifths · 12 Positions'
                : locale === 'ja'
                  ? '五度圏・12ポジション図'
                  : '十孔口琴五度圈 · 12 把位速查图'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <svg viewBox="0 0 300 300" className="h-72 w-72">
            <circle cx="150" cy="150" r="118" fill="none" stroke="#283042" strokeWidth="1.5" />
            <circle cx="150" cy="150" r="72" fill="#0c0e14" stroke="#283042" strokeWidth="1.5" />

            {/* 中心说明 */}
            <text x="150" y="138" textAnchor="middle" fill="#94a3b8" fontSize="11">
              {harpKey} Harp
            </text>
            <text x="150" y="160" textAnchor="middle" fill="#38bdf8" fontSize="18" fontWeight="bold">
              Pos {selectedPos} → {targetNode.name}
            </text>

            {FIFTHS_RING.map((node, i) => {
              const angle = ((i * 30 - 90) * Math.PI) / 180;
              const x = 150 + 118 * Math.cos(angle);
              const y = 150 + 118 * Math.sin(angle);
              const pos = ((i - harpRingIdx + 12) % 12) + 1;
              const isSelected = pos === selectedPos;
              const isFirst = pos === 1;

              return (
                <g
                  key={node.name}
                  onClick={() => setSelectedPos(pos)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 21 : 18}
                    fill={isSelected ? '#0284c7' : isFirst ? '#1e293b' : '#181d28'}
                    stroke={isSelected ? '#38bdf8' : isFirst ? '#34d399' : '#283042'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  <text
                    x={x}
                    y={y - 1}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    {node.name}
                  </text>
                  <text
                    x={x}
                    y={y + 11}
                    textAnchor="middle"
                    fill={isSelected ? '#e0f2fe' : '#94a3b8'}
                    fontSize="9"
                  >
                    P{pos}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="mt-2 w-full rounded-xl border border-[#283042] bg-[#0c0e14] p-3 text-center text-xs text-slate-300">
            <span className="font-bold text-sky-300">{posDesc(selectedPos)}</span>
            <span className="mx-2 text-slate-500">|</span>
            <span>
              {locale === 'en'
                ? `Use ${harpKey} harmonica to play in key of ${targetNode.name}`
                : locale === 'ja'
                  ? `${harpKey}調ハーモニカで ${targetNode.name}調を演奏`
                  : `手里拿 ${harpKey} 调口琴，即可以 ${selectedPos} 把位吹奏 ${targetNode.name} 调曲目`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
