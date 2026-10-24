import React, { useState } from 'react';
import {
  Sparkles,
  Scissors,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Info,
  Layers,
  HelpCircle,
  FileText,
  Clock,
  Volume2,
} from 'lucide-react';
import { Episode, ScriptAnalysisResult, PronunciationEntry } from '../types';
import { splitScriptIntoScenes, extractCues } from '../utils/chunker';

interface EpisodeEditorProps {
  episode: Episode;
  onUpdateEpisode: (updated: Partial<Episode>) => void;
  analysis: ScriptAnalysisResult | null;
  isCheckingScript: boolean;
  onCheckScript: () => void;
  onAddPronunciation: (term: string, guide: string, category?: any) => void;
  dictionary: PronunciationEntry[];
}

export const EpisodeEditor: React.FC<EpisodeEditorProps> = ({
  episode,
  onUpdateEpisode,
  analysis,
  isCheckingScript,
  onCheckScript,
  onAddPronunciation,
  dictionary,
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'cues' | 'analysis'>('editor');

  const actualWordCount = episode.originalScript
    ? episode.originalScript.split(/\s+/).filter(Boolean).length
    : 0;
  const targetWordCount = episode.targetWordCount || 2699;
  const wordDiff = actualWordCount - targetWordCount;
  const diffPercent = Math.abs(wordDiff) / targetWordCount;

  let progressColor = 'bg-emerald-500';
  let diffBadgeColor = 'bg-emerald-950/80 text-emerald-400 border-emerald-800';
  let statusText = 'قريب جداً من الهدف النموذجي لحلقات الوارث (±10%)';

  if (diffPercent > 0.25) {
    progressColor = 'bg-rose-500';
    diffBadgeColor = 'bg-rose-950/80 text-rose-400 border-rose-800';
    statusText = wordDiff > 0 ? 'فائض كبير عن المستهدف (+25%)' : 'نقص كبير عن المستهدف (-25%)';
  } else if (diffPercent > 0.1) {
    progressColor = 'bg-amber-500';
    diffBadgeColor = 'bg-amber-950/80 text-amber-400 border-amber-800';
    statusText = wordDiff > 0 ? 'أطول قليلاً من المستهدف' : 'أقصر قليلاً من المستهدف';
  }

  // Detect cues in original text
  const detectedCues = extractCues(episode.originalScript || '');

  // Handle re-splitting into scenes
  const handleSplitScript = () => {
    const newScenes = splitScriptIntoScenes(episode.originalScript);
    onUpdateEpisode({ scenes: newScenes, status: 'script_approved' });
  };

  return (
    <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden shadow-xl">
      {/* Top Bar: Metadata & Inputs */}
      <div className="p-4 bg-[#0A0A0A]/80 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 min-w-[300px]">
          <div>
            <label className="block text-[10px] text-[#94A3B8] font-medium mb-1">السلسلة</label>
            <input
              type="text"
              value={episode.series}
              disabled
              className="w-full bg-[#162032] border border-[#1E293B] rounded px-2.5 py-1 text-xs text-slate-300 font-bold"
            />
          </div>
          <div>
            <label className="block text-[10px] text-[#94A3B8] font-medium mb-1">الجزء (Part)</label>
            <input
              type="text"
              value={episode.part}
              onChange={(e) => onUpdateEpisode({ part: e.target.value })}
              className="w-full bg-[#162032] border border-[#1E293B] rounded px-2.5 py-1 text-xs text-white focus:border-[#3AA9FF] outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] text-[#94A3B8] font-medium mb-1">الفصل / الباب (Chapter)</label>
            <input
              type="text"
              value={episode.chapter}
              onChange={(e) => onUpdateEpisode({ chapter: e.target.value })}
              className="w-full bg-[#162032] border border-[#1E293B] rounded px-2.5 py-1 text-xs text-white focus:border-[#3AA9FF] outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] text-[#94A3B8] font-medium mb-1">رقم الحلقة وعنوانها</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={episode.episodeNumber}
                onChange={(e) => onUpdateEpisode({ episodeNumber: e.target.value })}
                className="w-14 bg-[#162032] border border-[#1E293B] rounded px-2 py-1 text-xs text-white font-mono-num text-center focus:border-[#3AA9FF] outline-none font-bold"
                placeholder="02"
              />
              <input
                type="text"
                value={episode.title}
                onChange={(e) => onUpdateEpisode({ title: e.target.value })}
                className="flex-1 bg-[#162032] border border-[#1E293B] rounded px-2.5 py-1 text-xs text-white focus:border-[#3AA9FF] outline-none font-bold"
                placeholder="عنوان الحلقة"
              />
            </div>
          </div>
        </div>

        {/* Word count target visualizer */}
        <div className="bg-[#11233B]/60 border border-[#3AA9FF]/30 rounded-lg p-2.5 min-w-[260px]">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[#94A3B8] text-[11px]">مستهدف الكلمات:</span>
            <div className="flex items-center gap-1.5 font-mono-num">
              <span className="font-bold text-white">{actualWordCount}</span>
              <span className="text-slate-500">/</span>
              <span className="text-[#3AA9FF]">{targetWordCount}</span>
              <span className={`text-[10px] px-1.5 rounded border ${diffBadgeColor}`}>
                {wordDiff > 0 ? `+${wordDiff}` : wordDiff}
              </span>
            </div>
          </div>
          <div className="w-full bg-[#162032] h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${progressColor}`}
              style={{ width: `${Math.min(100, (actualWordCount / targetWordCount) * 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">{statusText}</div>
        </div>
      </div>

      {/* Tabs & Toolbar */}
      <div className="px-4 py-2 border-b border-[#1E293B] flex items-center justify-between bg-[#0F172A]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'editor'
                ? 'bg-[#11233B] text-[#3AA9FF] border border-[#3AA9FF]/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            نص السيناريو الأصلي ({actualWordCount} كلمة)
          </button>
          <button
            onClick={() => setActiveTab('cues')}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'cues'
                ? 'bg-[#11233B] text-[#3AA9FF] border border-[#3AA9FF]/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>تعليمات الإنتاج الصامتة</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-950 text-purple-300 border border-purple-800">
              {detectedCues.length} Cues
            </span>
          </button>
          {analysis && (
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'analysis'
                  ? 'bg-[#11233B] text-[#3AA9FF] border border-[#3AA9FF]/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#3AA9FF]" />
              <span>تقرير فحص النص (Check Results)</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Smart Chunking Button (Requirement 9) */}
          <button
            onClick={handleSplitScript}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#162032] hover:bg-[#1E293B] border border-slate-700 text-xs text-white transition-all shadow-sm"
            title="تقسيم النص تلقائياً إلى مقاطع ذكية بحسب فواصل المشاهد *** وتغيرات الإيقاع"
          >
            <Scissors className="w-3.5 h-3.5 text-[#3AA9FF]" />
            <span>تقسيم ذكي للمشاهد ({episode.scenes.length} مقطع حالياً)</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="p-4">
        {activeTab === 'editor' && (
          <div className="space-y-3">
            <div className="relative">
              <textarea
                value={episode.originalScript}
                onChange={(e) => onUpdateEpisode({ originalScript: e.target.value })}
                rows={12}
                placeholder="ألصق هنا نص حلقة 'الوارث' بالدارجة المغربية... يمكنك إدراج تعليمات مثل [موسيقى غامضة] أو فواصل مشاهد مثل ***"
                className="w-full bg-[#0A0A0A] border border-[#1E293B] rounded-lg p-3 text-sm text-[#EAEAEA] leading-relaxed focus:border-[#3AA9FF] outline-none font-sans resize-y"
              />
              <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[11px] text-slate-500 bg-[#0A0A0A]/90 px-2 py-0.5 rounded border border-[#1E293B]">
                <span>فواصل المشاهد: <code>***</code></span>
                <span>•</span>
                <span>تعليمات الإنتاج: <code>[موسيقى]</code></span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 bg-[#0A0A0A]/50 p-3 rounded-lg border border-[#1E293B]">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#3AA9FF] shrink-0" />
                <span>
                  النظام يحافظ على النص المغربي حرفياً دون تبديل أو تلخيص. تعليمات الأقواس [..] لن يقرأها الراوي وستُعامل كمؤشرات للمونتاج.
                </span>
              </div>
              <button
                onClick={onCheckScript}
                disabled={isCheckingScript || !episode.originalScript}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#11233B] border border-[#3AA9FF]/40 text-[#3AA9FF] hover:bg-[#1A3458] text-xs font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isCheckingScript ? 'جارٍ الفحص...' : 'فحص الكلمات والأرقام (CHECK)'}</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'cues' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-300">
              تعليمات الإنتاج الصامتة التي تم اكتشافها في النص (لا تتم قراءتها بالصوت، وتُخصص لمهندس الصوت ومونتاج YouTube):
            </div>
            {detectedCues.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {detectedCues.map((cue, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-[#0A0A0A] border border-purple-900/50 p-2.5 rounded-lg text-xs"
                  >
                    <Volume2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-purple-300 font-medium">[{cue}]</span>
                    <span className="text-[10px] text-slate-500 mr-auto font-mono-num">Cue #{idx + 1}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-[#1E293B] rounded-lg">
                لم يتم إدراج أي تعليمات إنتاج بالأقواس بعد. مثال: <code>[موسيقى غامضة خافتة]</code> أو <code>[صوت خطوات]</code>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analysis' && analysis && (
          <div className="space-y-4">
            {/* Analysis Summary */}
            <div className="bg-[#11233B]/40 border border-[#3AA9FF]/30 p-3 rounded-lg text-xs flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#3AA9FF] mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-[#3AA9FF] ml-1">ملخص فحص الدارجة:</span>
                <span className="text-slate-200">{analysis.summary}</span>
              </div>
            </div>

            {/* Numbers section (e.g. 05:17) */}
            {analysis.numberItems && analysis.numberItems.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>الأرقام والتوقيتات المكتشفة ({analysis.numberItems.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {analysis.numberItems.map((num, i) => (
                    <div
                      key={i}
                      className="bg-[#0A0A0A] border border-amber-900/40 p-2.5 rounded-lg text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-mono-num font-bold text-amber-300 text-sm">
                          {num.original}
                        </div>
                        <div className="text-slate-300 mt-0.5 font-medium">
                          النطق الموصى به: <span className="text-white font-bold">{num.suggestedSpoken}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">{num.reason}</div>
                      </div>
                      <button
                        onClick={() => onAddPronunciation(num.original, num.suggestedSpoken, 'number')}
                        className="px-2 py-1 bg-[#162032] hover:bg-[#1E293B] border border-slate-700 text-[10px] text-[#3AA9FF] rounded"
                      >
                        إضافة للقاموس
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unregistered Names */}
            {analysis.unregisteredNames && analysis.unregisteredNames.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#3AA9FF]" />
                  <span>شخصيات وأسماء مقترحة للقاموس</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {analysis.unregisteredNames.map((item, i) => (
                    <div
                      key={i}
                      className="bg-[#0A0A0A] border border-[#1E293B] p-2.5 rounded-lg text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-white">{item.term}</div>
                        <div className="text-slate-400 text-[11px]">
                          دليل النطق: {item.suggestedGuide}
                        </div>
                      </div>
                      <button
                        onClick={() => onAddPronunciation(item.term, item.suggestedGuide, item.category || 'name')}
                        className="px-2 py-1 bg-[#11233B] hover:bg-[#1A3458] border border-[#3AA9FF]/30 text-[10px] text-[#3AA9FF] rounded"
                      >
                        حفظ في القاموس
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Long Sentences & Breath points */}
            {analysis.longSentences && analysis.longSentences.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>جمل طويلة قد تحتاج وقفات تنفس ({analysis.longSentences.length})</span>
                </div>
                <div className="space-y-1.5">
                  {analysis.longSentences.map((s, i) => (
                    <div
                      key={i}
                      className="bg-[#0A0A0A] border border-[#1E293B] p-2.5 rounded-lg text-xs text-slate-300"
                    >
                      <div className="text-slate-400 font-serif">"{s.excerpt}"</div>
                      <div className="text-[10px] text-amber-400 mt-1">
                        توصية الراوي: {s.recommendation} ({s.wordCount} كلمة)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pronunciation Tips */}
            {analysis.pronunciationTips && analysis.pronunciationTips.length > 0 && (
              <div className="bg-[#0A0A0A] border border-[#1E293B] p-3 rounded-lg space-y-1.5">
                <div className="text-xs font-bold text-[#3AA9FF]">توجيهات الإلقاء المغربي الطبيعي:</div>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  {analysis.pronunciationTips.map((tip, i) => (
                    <li key={i}>
                      <span className="font-semibold text-white">{tip.phrase}:</span> {tip.tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
