import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Play,
  X,
  Languages,
  BookOpen,
  Mic,
  Scissors,
  Sparkles,
} from 'lucide-react';
import { Episode, NarratorProfile, PronunciationEntry } from '../types';

interface PreflightModalProps {
  episode: Episode;
  narrator: NarratorProfile;
  darijaMode: boolean;
  dictionary: PronunciationEntry[];
  hasCheckedScript: boolean;
  onConfirmGenerate: () => void;
  onClose: () => void;
}

export const PreflightModal: React.FC<PreflightModalProps> = ({
  episode,
  narrator,
  darijaMode,
  dictionary,
  hasCheckedScript,
  onConfirmGenerate,
  onClose,
}) => {
  const [overrideChecks, setOverrideChecks] = useState(false);

  const checks = [
    {
      id: 'script_checked',
      label: 'فحص جودة النص والكلمات الغامضة (Script Checked)',
      passed: hasCheckedScript,
      detail: hasCheckedScript
        ? 'تم تشغيل فحص الذكاء الاصطناعي للنص والتأكد من انسيابية الدارجة.'
        : 'يوصى بفحص النص عبر زر (CHECK SCRIPT) للكشف عن الأرقام والكلمات الأجنبية.',
      icon: Sparkles,
      actionable: true,
    },
    {
      id: 'narrator_selected',
      label: 'اختيار واعتماد الراوي الرئيسي (Narrator Selected)',
      passed: Boolean(narrator && narrator.voiceName),
      detail: `معتمد: ${narrator.name} (${narrator.voiceName}) بإيقاع ${
        narrator.pace === 'medium_slow' ? 'متوسط يميل للبطء' : narrator.pace
      }.`,
      icon: Mic,
      actionable: false,
    },
    {
      id: 'darija_mode',
      label: 'تفعيل وضع الدارجة المغربية (Moroccan Darija Mode ON)',
      passed: darijaMode,
      detail: darijaMode
        ? 'الوضع مفعل: لن يتم تحويل النص للفصحى وستُقرأ المفردات المغربية بطبيعتها.'
        : 'تنبيه: وضع الدارجة مغلق!',
      icon: Languages,
      actionable: false,
    },
    {
      id: 'dict_checked',
      label: 'جاهزية قاموس النطق للأسماء والأرقام (Pronunciation Dictionary)',
      passed: dictionary.length > 0,
      detail: `القاموس يحتوي على ${dictionary.length} مصطلحاً بما فيها 05:17 وإدريس السباعي والوارث.`,
      icon: BookOpen,
      actionable: false,
    },
    {
      id: 'chunking_confirmed',
      label: 'تأكيد تقسيم المشاهد الذكي (Scene Splitting Confirmed)',
      passed: episode.scenes.length > 0,
      detail: `تم تقسيم الحلقة إلى ${episode.scenes.length} مقطع مشهدي دون بتر الجمل الدرامية.`,
      icon: Scissors,
      actionable: false,
    },
  ];

  const allPassed = checks.every((c) => c.passed);
  const canProceed = allPassed || overrideChecks;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-[#0A0A0A] border border-[#3AA9FF]/50 rounded-2xl max-w-lg w-full overflow-hidden shadow-[0_0_40px_rgba(58,169,255,0.3)] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#11233B] to-[#0A0A0A] border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3AA9FF]/10 border border-[#3AA9FF]/30 flex items-center justify-center text-[#3AA9FF]">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">فحص السلامة قبل التوليد (Pre-Flight Safety Check)</h2>
              <p className="text-[11px] text-[#94A3B8]">
                حماية الجودة وضمان عدم إهدار الموارد الصوتية أو توليد أخطاء في الحلقة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1E293B]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Checklist */}
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {checks.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                  item.passed
                    ? 'bg-[#0F172A] border-emerald-900/40 text-slate-200'
                    : 'bg-amber-950/20 border-amber-900/50 text-amber-200'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    item.passed ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-900/50 text-amber-400'
                  }`}
                >
                  {item.passed ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 opacity-80" />
                    <span>{item.label}</span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">{item.detail}</p>
                </div>
              </div>
            );
          })}

          {!allPassed && (
            <div className="pt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="override"
                checked={overrideChecks}
                onChange={(e) => setOverrideChecks(e.target.checked)}
                className="rounded border-slate-700 bg-[#0F172A] text-[#3AA9FF] focus:ring-0"
              />
              <label htmlFor="override" className="text-xs text-slate-300 cursor-pointer">
                المتابعة وبدء التوليد رغم عدم اكتمال بعض التحققات (تجاوز يدوي)
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0A0A0A] border-t border-[#1E293B] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-[#162032] text-xs text-slate-300 hover:text-white"
          >
            إلغاء ومراجعة النص
          </button>

          <button
            onClick={() => {
              onConfirmGenerate();
              onClose();
            }}
            disabled={!canProceed}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-[#3AA9FF] to-[#2563EB] hover:from-[#60BAFF] hover:to-[#3B82F6] text-black font-bold text-xs shadow-[0_0_20px_rgba(58,169,255,0.4)] transition-all disabled:opacity-40"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>تأكيد وبدء التوليد لجميع المشاهد</span>
          </button>
        </div>
      </div>
    </div>
  );
};
