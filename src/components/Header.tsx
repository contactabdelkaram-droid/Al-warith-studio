import {
  Mic,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  Download,
  Languages,
  Sparkles,
  Layers,
  Music,
  Wand2,
} from 'lucide-react';
import { Episode, NarratorProfile } from '../types';

interface HeaderProps {
  episode: Episode | null;
  narrator: NarratorProfile;
  darijaMode: boolean;
  onToggleDarijaMode: (enabled: boolean) => void;
  onOpenNarratorWizard: () => void;
  onOpenPreflight: () => void;
  onOpenExport: () => void;
  onCheckScript: () => void;
  isGeneratingAll: boolean;
  isCheckingScript: boolean;
  onProduceEpisode: () => void;
  isProducingEpisode: boolean;
  produceStepText?: string;
  onSelectTab: (tab: string) => void;
  activeTab: string;
  onCreateNewEpisode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  episode,
  narrator,
  darijaMode,
  onToggleDarijaMode,
  onOpenNarratorWizard,
  onOpenPreflight,
  onOpenExport,
  onCheckScript,
  isGeneratingAll,
  isCheckingScript,
  onProduceEpisode,
  isProducingEpisode,
  produceStepText,
  onSelectTab,
  activeTab,
  onCreateNewEpisode,
}) => {
  // Calculate word count metrics
  const actualWordCount = episode?.originalScript
    ? episode.originalScript.split(/\s+/).filter(Boolean).length
    : 0;
  const targetWordCount = episode?.targetWordCount || 2699;
  const wordDiff = actualWordCount - targetWordCount;
  const diffPercent = Math.abs(wordDiff) / targetWordCount;

  let countBadgeColor = 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80';
  let countStatusText = 'قريب من الهدف';

  if (diffPercent > 0.25) {
    countBadgeColor = 'bg-rose-950/80 text-rose-400 border-rose-800/80';
    countStatusText = wordDiff > 0 ? 'فائض كبير' : 'نقص كبير';
  } else if (diffPercent > 0.1) {
    countBadgeColor = 'bg-amber-950/80 text-amber-400 border-amber-800/80';
    countStatusText = wordDiff > 0 ? 'زيادة طفيفة' : 'نقص طفيف';
  }

  const readyScenes = episode ? episode.scenes.filter((s) => s.status === 'ready').length : 0;
  const totalScenes = episode ? episode.scenes.length : 0;

  return (
    <header className="bg-[#0A0A0A]/95 border-b border-[#1E293B] sticky top-0 z-40 backdrop-blur-md px-4 py-2.5 shadow-lg">
      <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-4">
        {/* Brand & Series Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#11233B] to-[#0A0A0A] border border-[#3AA9FF]/40 flex items-center justify-center shadow-[0_0_15px_rgba(58,169,255,0.2)]">
            <Mic className="w-5 h-5 text-[#3AA9FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-wide text-white">الوارث</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-[#11233B] border border-[#3AA9FF]/30 text-[#3AA9FF] font-mono-num font-bold">
                AL WARITH
              </span>
              <span className="text-[11px] text-[#94A3B8] font-mono-num uppercase tracking-wider">
                Voice Studio
              </span>
            </div>
            {episode ? (
              <div className="text-xs text-[#94A3B8] flex items-center gap-1.5 mt-0.5">
                <span className="text-slate-300 font-medium">{episode.part}</span>
                <span>•</span>
                <span>{episode.chapter}</span>
                <span>•</span>
                <span className="text-white font-semibold">حلقة {episode.episodeNumber}: {episode.title}</span>
              </div>
            ) : (
              <div className="text-xs text-slate-400 mt-0.5">
                لا توجد حلقة محددة حالياً
              </div>
            )}
          </div>
        </div>

        {/* Word Count Indicator (Requirement 7) */}
        <div className="hidden lg:flex items-center gap-2 bg-[#0F172A] border border-[#1E293B] rounded-lg px-3 py-1.5">
          <div className="text-right">
            <div className="text-[10px] text-[#94A3B8]">عدد الكلمات / المستهدف</div>
            <div className="flex items-center gap-1.5 font-mono-num text-xs">
              <span className="font-bold text-white text-sm">{actualWordCount}</span>
              <span className="text-[#64748B]">/</span>
              <span className="text-[#94A3B8]">{targetWordCount}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded border ${countBadgeColor}`}>
                {wordDiff > 0 ? `+${wordDiff}` : wordDiff} ({countStatusText})
              </span>
            </div>
          </div>
        </div>

        {/* Narrator Profile Pill & Moroccan Darija Mode Toggle */}
        <div className="flex items-center gap-2">
          {/* Moroccan Darija Mode Toggle (Requirement 22) */}
          <button
            onClick={() => onToggleDarijaMode(!darijaMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              darijaMode
                ? 'bg-[#11233B] border-[#3AA9FF] text-[#3AA9FF] shadow-[0_0_12px_rgba(58,169,255,0.25)]'
                : 'bg-[#1E293B]/40 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="وضع الدارجة المغربية مفعل: يحافظ على مفردات الدارجة دون تحويل للفصحى"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>دارجة مغربية</span>
            <span
              className={`w-2 h-2 rounded-full ${darijaMode ? 'bg-[#3AA9FF] animate-pulse' : 'bg-slate-600'}`}
            />
          </button>

          {/* Master Narrator Preset Button */}
          <button
            onClick={onOpenNarratorWizard}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0F172A] border border-[#1E293B] hover:border-[#3AA9FF]/50 text-xs text-white transition-all group"
            title="إعداد وضبط شخصية الراوي الرئيسي الدائمة"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <div className="text-right">
              <div className="text-[10px] text-[#94A3B8] leading-none">صوت الراوي المعتمد</div>
              <div className="font-semibold text-slate-200 group-hover:text-[#3AA9FF] leading-tight">
                {narrator.voiceName} • {narrator.name}
              </div>
            </div>
            <Sliders className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#3AA9FF]" />
          </button>
        </div>

        {/* Primary Studio Actions */}
        <div className="flex items-center gap-2">
          {/* New Episode Button */}
          <button
            onClick={onCreateNewEpisode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#11233B] hover:bg-[#1A3458] border border-[#3AA9FF]/40 text-[#3AA9FF] text-xs font-bold transition-all shadow-sm"
            title="إنشاء حلقة جديدة في هذا الجزء"
          >
            <span>+ حلقة جديدة</span>
          </button>

          {/* Check Script Button (Requirement 8) */}
          <button
            onClick={onCheckScript}
            disabled={isCheckingScript || !episode?.originalScript}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#11233B] border border-[#3AA9FF]/40 text-[#3AA9FF] hover:bg-[#1A3458] text-xs font-semibold transition-all disabled:opacity-50 shadow-sm"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isCheckingScript ? 'animate-spin' : ''}`} />
            <span>{isCheckingScript ? 'فحص...' : 'فحص النص (CHECK)'}</span>
          </button>

          {/* Master 1-Click: PRODUCE EPISODE (Full Narration + Music Director + Ducking Mix) */}
          <button
            onClick={onProduceEpisode}
            disabled={isProducingEpisode || !episode?.originalScript}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 via-[#3AA9FF] to-blue-500 hover:from-amber-300 hover:to-blue-400 text-black font-extrabold text-xs shadow-[0_0_20px_rgba(58,169,255,0.45)] transition-all disabled:opacity-50 group"
            title="الإنتاج الشامل للحلقة: تقسيم المشاهد، توليد صوت الراوي بالدارجة، الإخراج الموسيقي التلقائي، تطبيق الوقفات الصامتة، والمكس النهائي مع Ducking"
          >
            <Wand2 className={`w-3.5 h-3.5 ${isProducingEpisode ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} />
            <span>
              {isProducingEpisode
                ? produceStepText || 'جارٍ إنتاج الحلقة الشامل...'
                : 'إنتاج الحلقة (PRODUCE EPISODE)'}
            </span>
          </button>

          {/* Generate All Audio Button (Requirement 20, 27) */}
          <button
            onClick={onOpenPreflight}
            disabled={isGeneratingAll || !episode || episode.scenes.length === 0}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#162032] border border-slate-700 hover:bg-[#1E293B] text-slate-200 text-xs font-semibold transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-slate-200" />
            <span>
              {isGeneratingAll
                ? `توليد (${readyScenes}/${totalScenes})...`
                : 'صوت فقط (GENERATE VOICE)'}
            </span>
          </button>

          {/* Export Episode Audio */}
          <button
            onClick={onOpenExport}
            disabled={!episode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F172A] border border-[#1E293B] hover:border-slate-600 text-slate-300 hover:text-white text-xs font-medium transition-all disabled:opacity-40"
            title="تصدير المكس النهائي (Final Mix)، الصوت النقي (Voice Only)، أو الموسيقى (Music Only)"
          >
            <Download className="w-3.5 h-3.5 text-[#3AA9FF]" />
            <span className="hidden sm:inline">تصدير (EXPORT)</span>
          </button>
        </div>
      </div>
    </header>
  );
};
