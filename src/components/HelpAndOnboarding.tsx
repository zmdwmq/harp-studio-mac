import React from 'react';
import { HelpCircle, X, ChevronRight, ChevronLeft, Lightbulb, Sparkles } from 'lucide-react';
import { AppLocale } from '../core/i18n';

const TIPS_BY_LOCALE: Record<AppLocale, string[]> = {
  zh: [
    '💡 使用雅马哈 AG06mk2 等带硬件监听的声卡时，请保持「耳返：关」，避免声音重叠产生回声。',
    '💡 十孔口琴不会算伴奏移调？切到「高级模式」，用「移调换算」选原曲调和 1~12 把位即可一键匹配！',
    '💡 录完第 1 轨后，在「高级模式」可继续叠录和声轨，或导入本地音频分轨一起混音。',
    '💡 舞台左上角支持一键切换「简谱」或「音名」，并可切到「调琴频率监测」辅助修琴。',
    '💡 没录完的曲子记得点「保存工程 (.harpproj)」，下次打开可完整还原伴奏、多轨与音色！',
    '💡 练布鲁斯摇摆律动时，节拍器节奏型可选「摇摆 Shuffle」搭配 12/8 拍或 4/4 拍。',
    '💡 叠录慢半拍？用「一键校准」测算声卡延迟，或在多轨机架用 -5/+5ms 微调对齐，并可开启「预备拍」。',
    '💡 舞台选择「曲目调性」可自动计算把位并高亮布鲁斯音阶，下方实时音高轨迹图助你练稳压音与颤音。',
    '💡 录完后点「视频」按钮可一键导出 720p 动态口琴孔位动画视频；点顶部「脚踏」可绑定 MIDI/蓝牙翻谱踏板。',
    '💡 点顶部「插件」可切换扩展主题/调弦/音色，也支持零代码导入导出 .harp-plugin.json 分享配置！',
  ],
  en: [
    '💡 Using a hardware-monitoring interface (e.g. AG06mk2)? Keep Software Monitor OFF to avoid echo.',
    '💡 Not sure how many semitones to transpose? Switch to Advanced Mode and use the Key Helper (1–12 positions).',
    '💡 In Advanced Mode, you can overdub harmony tracks or import local audio stems into the multi-track rack.',
    '💡 Toggle between Jianpu (numbered notation) and Note Names, or switch to Reed Tuner to check reed pitch.',
    '💡 Save unfinished sessions as .harpproj files to restore your backing, tracks, and custom presets anytime.',
    '💡 Practicing Blues? Try the "Swing Shuffle" subdivision with 12/8 or 4/4 in the Metronome.',
    '💡 Experiencing overdub latency? Run Auto Calibrate, nudge tracks by ±5ms, or enable 1-bar Count-in.',
    '💡 Pick a Song Key on the stage to auto-compute the Position, highlight Blues scales, and view the live Pitch Curve.',
    '💡 Click "Video" to export a 720p animated harmonica video, or open "Pedal" to bind MIDI/Bluetooth foot switches.',
    '💡 Open "Plugins" to enable custom themes, tunings, presets, or import/export zero-code .harp-plugin.json packs.',
  ],
  ja: [
    '💡 AG06mk2 などハードウェアモニター付き機器を使う場合、「モニター：OFF」にするとエコーを防げます。',
    '💡 移調の計算が難しい時は「アドバンス」モードの移調計算機能で1〜12ポジションを自動計算できます。',
    '💡 アドバンスモードでは重ね録り（オーバーダブ）やローカル音声のマルチトラック追加が可能です。',
    '💡 ステージ左上で「数字譜 / 音名」の切替や「調律チューナー（440/442/443Hz）」が使えます。',
    '💡 作業途中の曲は「保存 (.harpproj)」で伴奏・トラック・カスタム音色を丸ごと保存できます。',
    '💡 ブルースの練習にはメトロノームの「スウィング Shuffle」＋ 12/8拍子がおすすめです。',
    '💡 重ね録りのズレ対策には「自動補正」やトラックごとの ±5ms 微調整、1小節カウントインが便利です。',
    '💡 曲のキーを選ぶとポジションを自動計算し、ブルーススケール強調やリアルタイム音程軌跡を表示します。',
    '💡 「動画」ボタンで穴位置アニメ付き720p動画を書き出し、「ペダル」でMIDI/Bluetoothフットスイッチを連携できます。',
    '💡 「プラグイン」からテーマ・配列・DSPプリセットの追加や .harp-plugin.json の読込/書き出しが可能です。',
  ],
};

export const ScrollingTipsTicker: React.FC<{ locale: AppLocale }> = ({ locale }) => {
  const tips = TIPS_BY_LOCALE[locale];
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % tips.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [paused, tips.length]);

  return (
    <button
      onClick={() => setIndex((prev) => (prev + 1) % tips.length)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      title="点击切换下一条小提示"
      className="flex max-w-2xl items-center gap-1.5 truncate text-left text-[11px] text-sky-300/90 hover:text-sky-200 transition"
    >
      <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-400" />
      <span className="truncate">{tips[index % tips.length]}</span>
    </button>
  );
};

const ONBOARDING_STEPS: Record<AppLocale, { title: string; desc: string }[]> = {
  zh: [
    {
      title: '1. 选择你的口琴与图谱',
      desc: '在顶部栏选择「十孔布鲁斯（12调）」「半音阶（12/14/16孔）」或「24孔复音」。舞台区支持「简谱 / 音名」「标准音高 / 口琴音高(-8va)」切换、把位与布鲁斯音阶高亮、实时音高轨迹图以及「调琴频率监测」，舞台与多轨机架均支持折叠收起。',
    },
    {
      title: '2. 连接麦克风 / 声卡与脚踏',
      desc: '点击「开启麦克风」即可看到实时输入电平与孔位高亮。使用带硬件监听的声卡请保持「耳返：关」。双手持琴时可点顶部「脚踏」一键绑定 MIDI 踏板或蓝牙翻谱脚踏，用脚控制录音、播放、AB循环与切换音色。',
    },
    {
      title: '3. 伴奏练琴与精准叠录',
      desc: '导入 MP3/WAV 伴奏后可开启「预备拍 (1小节)」与「一键校准」声卡延迟。切到「高级模式」可使用伴奏升降调、1~12 把位换算、AB 循环、Swing 节拍器与多轨叠录（支持单轨 -5/+5ms 偏移微调）。',
    },
    {
      title: '4. 一键出片、插件与工程存档',
      desc: '录完后可切换口琴预设导出 WAV / 320kbps MP3，或点「视频」一键导出带动态孔位动画的 720p 视频；点顶部「插件」可扩展主题、调弦与音色（支持零代码 JSON 导入导出），或保存为 .harpproj 工程。',
    },
  ],
  en: [
    {
      title: '1. Harmonica Stage, Scales & Pitch Curve',
      desc: 'Select 10-hole Diatonic (12 keys), Chromatic (12/14/16-hole), or 24-hole Tremolo. Toggle Jianpu/Notes, Standard/Harmonica (-8va) octave, Position & Blues scale highlights, live Pitch Curve, and Reed Tuner. Both the stage and track rack are collapsible.',
    },
    {
      title: '2. Mic, Interface & Foot Pedals',
      desc: 'Click "Enable Mic" for live VU metering and hole highlighting (keep Software Monitor OFF for hardware-monitoring interfaces). Open "Pedal" at the top to bind MIDI or Bluetooth page-turner pedals for hands-free control.',
    },
    {
      title: '3. Backing Tracks & Precision Overdubbing',
      desc: 'Enable 1-bar Count-in and Auto Latency Calibration before recording. Switch to "Advanced" mode for Key Transposition, AB Loop, Swing Metronome, and Multi-Track Overdubbing with ±5ms per-track offset nudging.',
    },
    {
      title: '4. Video Export, Plugins & Project Save',
      desc: 'Export WAV, 320kbps MP3, or click "Video" for an animated 720p WebM performance video. Open "Plugins" to load custom themes, tunings, and presets (including zero-code JSON packs), or save .harpproj sessions.',
    },
  ],
  ja: [
    {
      title: '1. ハーモニカ表示・音階・音程軌跡',
      desc: '10ホールズ（12調）、クロマチック（12/14/16穴）、24穴複音を選択可能。数字譜/音名、標準/-8va表記、ポジション＆ブルース音階強調、リアルタイム音程軌跡、調律チューナーに対応し、ステージとトラック欄は折りたたみ可能です。',
    },
    {
      title: '2. マイク・I/F・フットペダル連携',
      desc: '「マイク接続」でリアルタイム表示（ハードウェアモニター使用時はモニターOFF）。上部の「脚踏 / Pedal」からMIDIペダルやBluetooth譜めくりペダルを学習登録し、ハンズフリー操作が可能です。',
    },
    {
      title: '3. 伴奏練習と高精度オーバーダブ',
      desc: '1小節カウントインや自動遅延補正が使えます。「アドバンス」ではキー変更、ABループ、スウィング付きメトロノーム、マルチトラック重ね録り（±5ms単位のタイミング微調整対応）を利用できます。',
    },
    {
      title: '4. 動画書き出し・プラグイン・保存',
      desc: 'WAV/MP3書き出しに加え、「動画」ボタンで穴位置アニメ付き720p動画を生成。「プラグイン」でテーマ・配列・音色（JSON形式対応）を追加でき、.harpproj 形式で途中保存も可能です。',
    },
  ],
};

export const OnboardingModal: React.FC<{
  locale: AppLocale;
  onClose: () => void;
}> = ({ locale, onClose }) => {
  const steps = ONBOARDING_STEPS[locale];
  const [stepIdx, setStepIdx] = React.useState(0);
  const isLast = stepIdx === steps.length - 1;

  const titleText =
    locale === 'zh'
      ? '欢迎使用 HarpStudio · 新手引导'
      : locale === 'en'
        ? 'Welcome to HarpStudio · Quick Tour'
        : 'HarpStudio へようこそ · クイックガイド';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-[#283042] bg-[#141821] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-sky-400" />
            <h2 className="text-base font-bold text-slate-100">{titleText}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 步骤进度条 */}
        <div className="mb-4 flex gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= stepIdx ? 'bg-sky-400' : 'bg-[#283042]'
              }`}
            />
          ))}
        </div>

        <div className="min-h-[120px] rounded-xl border border-[#283042] bg-[#0c0e14] p-4">
          <h3 className="mb-2 text-sm font-bold text-sky-300">{steps[stepIdx].title}</h3>
          <p className="text-xs leading-relaxed text-slate-300">{steps[stepIdx].desc}</p>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            {locale === 'zh' ? '跳过引导' : locale === 'en' ? 'Skip' : 'スキップ'}
          </button>

          <div className="flex items-center gap-2">
            {stepIdx > 0 && (
              <button
                onClick={() => setStepIdx((s) => s - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#283042] bg-[#1b202c] px-3 py-1.5 text-xs text-slate-200 hover:border-slate-500"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {locale === 'zh' ? '上一步' : locale === 'en' ? 'Back' : '戻る'}
              </button>
            )}
            <button
              onClick={() => (isLast ? onClose() : setStepIdx((s) => s + 1))}
              className="inline-flex items-center gap-1 rounded-lg bg-sky-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-sky-400"
            >
              {isLast
                ? locale === 'zh'
                  ? '开始使用'
                  : locale === 'en'
                    ? 'Get Started'
                    : '始める'
                : locale === 'zh'
                  ? '下一步'
                  : locale === 'en'
                    ? 'Next'
                    : '次へ'}
              {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const HelpModal: React.FC<{
  locale: AppLocale;
  onClose: () => void;
  onReplayTour: () => void;
}> = ({ locale, onClose, onReplayTour }) => {
  const isEn = locale === 'en';
  const isJa = locale === 'ja';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-[#283042] bg-[#141821] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#283042] px-6 py-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-sky-400" />
            <h2 className="text-base font-bold text-slate-100">
              {isEn ? 'HarpStudio User Guide & FAQ' : isJa ? 'HarpStudio ヘルプ & FAQ' : 'HarpStudio 使用帮助与常见问题'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6 text-xs leading-relaxed text-slate-300">
          <section className="rounded-xl border border-[#283042] bg-[#0c0e14] p-4">
            <h3 className="mb-1.5 text-sm font-bold text-sky-300">
              {isEn ? '1. Quick Workflow' : isJa ? '1. 基本的な使い方' : '一、快速录音 4 步曲'}
            </h3>
            <p>
              {isEn
                ? 'Select your harmonica type & key -> Enable Microphone -> (Optional) Import backing track -> Click Record -> Audition presets & export WAV/MP3 or save .harpproj.'
                : isJa
                  ? 'ハーモニカの種類と調を選択 → マイク接続 → （任意）伴奏読込 → 録音開始 → 音色を選択して WAV/MP3 書き出し、または .harpproj 保存。'
                  : '① 顶部选好口琴型号与调性 → ② 点击「开启麦克风」→ ③ 导入伴奏（或直接独奏）→ ④ 点击「开始录音」，录完可切换预设试听并导出 WAV/MP3，或保存为 .harpproj 工程。'}
            </p>
          </section>

          <section className="rounded-xl border border-[#283042] bg-[#0c0e14] p-4">
            <h3 className="mb-1.5 text-sm font-bold text-sky-300">
              {isEn ? '2. Simple vs Advanced Mode' : isJa ? '2. シンプル / アドバンスモード' : '二、简洁模式 vs 高级模式'}
            </h3>
            <p>
              {isEn
                ? 'Simple Mode keeps only backing playback, hole visualizer, presets, and recording/export. Advanced Mode unlocks Key Helper (1–12 positions), AB Loop, Swing Metronome, Multi-Track Overdubbing, and the 8-band Tone Customizer.'
                : isJa
                  ? 'シンプルモードは伴奏・穴位置・音色・録音のみを表示します。アドバンスモードでは移調計算（12ポジション）、ABループ、メトロノーム、重ね録り、詳細トーン調整が使えます。'
                  : '「简洁模式」专注日常吹奏与快速出片；切到「高级模式」可展开伴奏移调换算（支持十孔 1~12 全把位）、AB 循环、节拍器（含 Swing 摇摆）、多轨叠录机架、导入分轨与 8 参数调音台。'}
            </p>
          </section>

          <section className="rounded-xl border border-[#283042] bg-[#0c0e14] p-4">
            <h3 className="mb-1.5 text-sm font-bold text-sky-300">
              {isEn
                ? '3. Reed Tuner, Scales & Pitch Curve'
                : isJa
                  ? '3. 調律チューナー・音階・音程軌跡'
                  : '三、调琴监测、把位音阶与音高轨迹'}
            </h3>
            <p>
              {isEn
                ? 'Toggle Jianpu/Notes and Standard/Harmonica (-8va) octave in the stage header. Pick a Song Key to auto-compute the Position and highlight Blues/Pentatonic/Minor scales (with root dots and bend badges), and use the live Pitch Curve below to practice bends & vibrato. Switch to Reed Tuner (A4 = 440–444 Hz, ±3¢ green zone) to check reed tuning.'
                : isJa
                  ? '数字譜/音名や標準/-8va表記の切替、曲キーに応じたポジション自動計算・ブルース音階強調（ルート音・ベンド表示）、リアルタイム音程軌跡グラフでベンドやビブラートを練習できます。調律チューナー（A4=440〜444Hz、±3¢緑ゾーン）も内蔵しています。'
                  : '舞台顶部支持「简谱/音名」与「标准音高/口琴音高(-8va)」切换（半音阶 14/16 孔倍低音区以 •1~•4 标识，推杆升半音以青色显示）。选择「曲目调性」可自动计算把位并高亮布鲁斯/五声/小调音阶（标出主音圆点与压音「压」徽标），下方「实时音高轨迹」可辅助练习压音与颤音。切到「调琴频率监测」支持 A4=440~444Hz（±3 cents 内为绿区准音）。'}
            </p>
          </section>

          <section className="rounded-xl border border-[#283042] bg-[#0c0e14] p-4">
            <h3 className="mb-1.5 text-sm font-bold text-sky-300">
              {isEn
                ? '4. Latency Calibration, Count-in & Video Export'
                : isJa
                  ? '4. 遅延補正・カウントイン・動画書き出し'
                  : '四、录音延迟校准、预备拍与一键出片'}
            </h3>
            <p>
              {isEn
                ? 'Enable 1-bar Count-in for hands-ready recording. Click "Auto Calibrate" to measure speaker-to-mic loopback latency so overdubs align automatically, or nudge individual tracks by ±5ms in the track rack. Click "Video" to render a 720p WebM video with animated hole highlights matching your current theme and language.'
                : isJa
                  ? '「カウントイン (1小節)」で録音前に準備拍を鳴らせます。「自動補正」でスピーカー〜マイク間の遅延を計測し重ね録りを自動整列（トラックごとに ±5ms 微調整も可能）。「動画」ボタンで現在のテーマと言語に合わせた穴位置アニメ付き720p WebM動画を書き出せます。'
                  : '勾选「预备拍 (1小节)」可在开录前响起 1 小节节拍器倒计时；点击「一键校准」通过扬声器脉冲测算往返延迟，叠录时自动对齐（也可在多轨机架用 -5/+5ms 微调单轨）。录制完成后点击「视频」按钮，可一键导出带动态孔位高亮动画（跟随当前主题与语言）的 720p WebM 视频。'}
            </p>
          </section>

          <section className="rounded-xl border border-[#283042] bg-[#0c0e14] p-4">
            <h3 className="mb-1.5 text-sm font-bold text-sky-300">
              {isEn
                ? '5. Foot Pedals & Plugin Extensions'
                : isJa
                  ? '5. フットペダル連携とプラグイン拡張'
                  : '五、MIDI / 蓝牙脚踏开关与插件中心'}
            </h3>
            <p>
              {isEn
                ? 'Click "Pedal" in the header to bind USB/Bluetooth MIDI pedals (CC/Note/PC) or keyboard page-turner pedals to Record, Play/Pause, AB Loop, and Next Preset. Open "Plugins" to toggle built-in packs, import/export zero-code .harp-plugin.json themes/tunings/presets, or load custom JS plugins.'
                : isJa
                  ? '上部の「ペダル」からMIDIフットペダルやBluetooth譜めくりペダルを録音・再生・ABループ・音色切替に割り当てできます。「プラグイン」ではテーマ・配列・音色の追加や .harp-plugin.json の読込/書き出しが可能です。'
                  : '点击顶部「脚踏」按钮，可一键学习绑定标准 MIDI 踏板（CC/Note/PC）或蓝牙翻谱脚踏，实现双手持琴脚控录音/播放/AB循环/切换音色。点击顶部「插件」可启用主题、自定义调弦与音色扩展包，支持零代码导入/导出 .harp-plugin.json 配置文件。'}
            </p>
          </section>

          <section className="rounded-xl border border-[#283042] bg-[#0c0e14] p-4">
            <h3 className="mb-1.5 text-sm font-bold text-sky-300">
              {isEn ? '6. Why is there an echo? (Hardware Monitoring)' : isJa ? '6. エコーが聞こえる場合' : '六、常见问题：为什么耳机里有回声？'}
            </h3>
            <p>
              {isEn
                ? 'If your audio interface (e.g. Yamaha AG06mk2) already provides direct hardware monitoring to your headphones, keep Software Monitor OFF in HarpStudio.'
                : isJa
                  ? 'Yamaha AG06mk2 などのダイレクトモニター機能がある機器をご使用の場合、アプリ側の「モニター」は OFF にしてください。'
                  : '如果您使用的是雅马哈 AG06mk2 等带硬件直接监听的声卡，请保持右上角「耳返：关」，否则声卡监听与电脑延迟监听叠加会产生回声。'}
            </p>
          </section>
        </div>

        <div className="flex items-center justify-between border-t border-[#283042] px-6 py-3">
          <button
            onClick={() => {
              onClose();
              onReplayTour();
            }}
            className="text-xs font-medium text-sky-400 hover:text-sky-300"
          >
            {isEn ? 'Replay Quick Tour' : isJa ? 'クイックガイドを再表示' : '重新观看新手引导'}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-sky-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-sky-400"
          >
            {isEn ? 'Close' : isJa ? '閉じる' : '我知道了'}
          </button>
        </div>
      </div>
    </div>
  );
};
