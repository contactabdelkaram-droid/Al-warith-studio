import React, { useState } from 'react';
import {
  Mic,
  Volume2,
  Play,
  Pause,
  RotateCw,
  CheckCircle2,
  Sliders,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react';
import { NarratorProfile } from '../types';
import { generateTTS } from '../utils/api';
import { getAudioContext, base64ToUint8Array, toArrayBuffer } from '../utils/audioUtils';
import {
  playBrowserSpeech,
  stopBrowserSpeech,
  generateFallbackSpeechAudio,
} from '../utils/speechFallback';

interface NarratorWizardProps {
  currentNarrator: NarratorProfile;
  onSaveNarrator: (narrator: NarratorProfile) => void;
  onClose: () => void;
  isInitialSetup?: boolean;
}

const TEST_DARIJA_SCRIPT = `كاين أحلام كتنسى تفاصيلها ملي كتفيق.
ولكن كاين أحلام أخرى...
كتبقى غير كلمة وحدة.
بالنسبة ليا...
كانت هاديك الكلمة:
لقيناه.`;

export const NarratorWizard: React.FC<NarratorWizardProps> = ({
  currentNarrator,
  onSaveNarrator,
  onClose,
  isInitialSetup = false,
}) => {
  const [step, setStep] = useState<number>(1);
  const [selectedVoice, setSelectedVoice] = useState<NarratorProfile['voiceName']>(
    currentNarrator.voiceName || 'Fenrir'
  );
  const [selectedPace, setSelectedPace] = useState<NarratorProfile['pace']>(
    currentNarrator.pace || 'medium_slow'
  );
  const [selectedPause, setSelectedPause] = useState<NarratorProfile['dramaticPauseIntensity']>(
    currentNarrator.dramaticPauseIntensity || 'cinematic'
  );
  const [darijaMode, setDarijaMode] = useState<boolean>(true);
  const [characterVoicesEnabled, setCharacterVoicesEnabled] = useState<boolean>(
    currentNarrator.characterVoicesEnabled || false
  );

  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);

  const voices: Array<{
    name: NarratorProfile['voiceName'];
    label: string;
    description: string;
    badge: string;
  }> = [
    {
      name: 'Fenrir',
      label: 'Fenrir (الموصى به لرواية الوارث)',
      description: 'صوت عميق، دافئ، خافت بنبرة غامضة سينمائية ومتحكم بها، مثالي للبودكاست الدرامي.',
      badge: 'Master Match',
    },
    {
      name: 'Charon',
      label: 'Charon',
      description: 'صوت ناضج جداً، منخفض وداكن، يعطي إحساساً بالرهبة والمشاهد الليلية.',
      badge: 'Dark Noir',
    },
    {
      name: 'Zephyr',
      label: 'Zephyr',
      description: 'صوت سردي متزن وقريب من الأذن، يحافظ على الوضوح الكامل في المقاطع الطويلة.',
      badge: 'Balanced',
    },
    {
      name: 'Puck',
      label: 'Puck',
      description: 'نبرة أكثر مرونة وحيوية، مناسبة إذا كانت الرواية تحتوي على حوارات أسرع.',
      badge: 'Dynamic',
    },
    {
      name: 'Kore',
      label: 'Kore',
      description: 'صوت نسائي ناضج وهادئ، سرد تأملي سينمائي بوقار ووضوح استثنائي.',
      badge: 'Calm Introspective',
    },
  ];

  // Stop currently playing preview audio
  const stopAudio = () => {
    if (audioSource) {
      try {
        audioSource.stop();
      } catch (e) {}
      setAudioSource(null);
    }
    setIsPlayingAudio(false);
  };

  // Play test audio for Moroccan Darija phrase
  const handlePlayTestVoice = async () => {
    if (isPlayingAudio) {
      stopAudio();
      return;
    }

    try {
      setIsLoadingAudio(true);
      const res = await generateTTS({
        text: TEST_DARIJA_SCRIPT,
        voiceName: selectedVoice,
        preset: 'mystery',
        pace: selectedPace,
        darijaMode,
      });

      let audioBase64 = res.audioBase64;

      if (!audioBase64 || res.isQuotaExceeded) {
        // Fallback: use internal speech audio generator and trigger browser voice
        const fallback = await generateFallbackSpeechAudio(TEST_DARIJA_SCRIPT, selectedPace);
        audioBase64 = fallback.audioBase64;
        playBrowserSpeech(TEST_DARIJA_SCRIPT, selectedPace);
      }

      const ctx = getAudioContext();
      const bytes = base64ToUint8Array(audioBase64);
      const ab = toArrayBuffer(bytes);
      const audioBuffer = await ctx.decodeAudioData(ab);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setIsPlayingAudio(false);
        setAudioSource(null);
      };

      source.start();
      setAudioSource(source);
      setIsPlayingAudio(true);
    } catch (err: any) {
      console.warn('Using fallback speech for test voice', err);
      playBrowserSpeech(TEST_DARIJA_SCRIPT, selectedPace);
      setIsPlayingAudio(true);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleSave = () => {
    stopAudio();
    onSaveNarrator({
      ...currentNarrator,
      voiceName: selectedVoice,
      pace: selectedPace,
      dramaticPauseIntensity: selectedPause,
      darijaMode,
      characterVoicesEnabled,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0A0A0A] border border-[#3AA9FF]/40 rounded-2xl max-w-2xl w-full overflow-hidden shadow-[0_0_40px_rgba(58,169,255,0.2)] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#11233B] to-[#0A0A0A] border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3AA9FF]/10 border border-[#3AA9FF]/30 flex items-center justify-center">
              <Mic className="w-4 h-4 text-[#3AA9FF]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>معاير شخصية الراوي الرئيسي الدائمة</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#11233B] text-[#3AA9FF] font-mono-num font-bold">
                  AL WARITH - MAIN NARRATOR
                </span>
              </h2>
              <p className="text-[11px] text-[#94A3B8]">
                الخطوة {step} من 5: ضمان هوية صوتية موحدة ومتسقة عبر مئات الحلقات
              </p>
            </div>
          </div>
          {!isInitialSetup && (
            <button
              onClick={() => {
                stopAudio();
                onClose();
              }}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1E293B]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-5 gap-1 p-2 bg-[#0F172A] border-b border-[#1E293B]">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s <= step ? 'bg-[#3AA9FF] shadow-[0_0_8px_#3aa9ff]' : 'bg-[#1E293B]'
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* STEP 1: Select Voice */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300">
                اختر نبرة الصوت الأساسية للراوي. يجب أن يكون صوتاً ناضجاً وواقعياً يبني التوتر تدريجياً:
              </div>
              <div className="space-y-2">
                {voices.map((v) => (
                  <button
                    key={v.name}
                    onClick={() => setSelectedVoice(v.name)}
                    className={`w-full p-3 rounded-xl border text-right transition-all flex items-start justify-between gap-3 ${
                      selectedVoice === v.name
                        ? 'bg-[#11233B] border-[#3AA9FF] shadow-[0_0_15px_rgba(58,169,255,0.2)]'
                        : 'bg-[#0F172A] border-[#1E293B] hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">{v.label}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#162032] text-[#3AA9FF] border border-[#3AA9FF]/30 font-mono-num">
                          {v.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mt-1">{v.description}</p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border mt-1 shrink-0 flex items-center justify-center ${
                        selectedVoice === v.name
                          ? 'border-[#3AA9FF] bg-[#3AA9FF]'
                          : 'border-slate-600'
                      }`}
                    >
                      {selectedVoice === v.name && (
                        <div className="w-1.5 h-1.5 rounded-full bg-black" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Moroccan Darija Test Script */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-xs text-slate-300">
                اختبار نطق جملة الدارجة المغربية المفتاحية لعالم "الوارث":
              </div>

              <div className="bg-[#0F172A] border border-[#1E293B] p-4 rounded-xl space-y-2">
                <div className="text-[10px] text-[#94A3B8] font-bold">نص الاختبار الدرامي (Test Script):</div>
                <div className="text-sm font-semibold text-white leading-loose whitespace-pre-line border-r-2 border-[#3AA9FF] pr-3">
                  {TEST_DARIJA_SCRIPT}
                </div>
              </div>

              {/* Play preview button */}
              <div className="flex items-center justify-between bg-[#11233B]/50 p-3 rounded-xl border border-[#3AA9FF]/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-200">
                    الصوت الحالي: <strong className="text-[#3AA9FF]">{selectedVoice}</strong>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({selectedPace === 'medium_slow' ? 'متوسط يميل للبطء' : selectedPace})
                  </span>
                </div>

                <button
                  onClick={handlePlayTestVoice}
                  disabled={isLoadingAudio}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3AA9FF] hover:bg-[#60BAFF] text-black font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {isLoadingAudio ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جارٍ التوليد...</span>
                    </>
                  ) : isPlayingAudio ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-black" />
                      <span>إيقاف المعاينة</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-black" />
                      <span>استمع للعينة بالدارجة</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Configure Pace */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300">
                إيقاع السرد (Pace): القاعدة الأساسية لرواية "الوارث" هي إيقاع <strong>متوسط يميل قليلاً إلى البطء</strong>، دون أن يصبح مملاً.
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    id: 'medium_slow',
                    label: 'متوسط يميل للبطء (Recommended Default)',
                    desc: 'إيقاع سينمائي متزن يعطي وزناً لكل كلمة ويسهل متابعة الأحداث في البودكاست.',
                  },
                  {
                    id: 'slow',
                    label: 'بطيء محسوب (Cinematic Slow)',
                    desc: 'إيقاع أثقل مناسب للمشاهد النفسية شديدة التعقيد.',
                  },
                  {
                    id: 'medium',
                    label: 'متوسط اعتيادي (Medium)',
                    desc: 'إيقاع أسرع قليلاً للسرد الإخباري الخفيف.',
                  },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPace(p.id as any)}
                    className={`p-3 rounded-xl border text-right transition-all ${
                      selectedPace === p.id
                        ? 'bg-[#11233B] border-[#3AA9FF] text-white shadow-[0_0_12px_rgba(58,169,255,0.15)]'
                        : 'bg-[#0F172A] border-[#1E293B] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">{p.label}</div>
                    <div className="text-[11px] text-[#94A3B8] mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Dramatic Pauses & Character voices */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="text-xs text-slate-300">
                نظام الوقفات الدرامية ومعاملة الحوارات (Single Narrator):
              </div>

              <div className="bg-[#0F172A] border border-[#1E293B] p-3.5 rounded-xl space-y-3 text-xs">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#3AA9FF]" />
                  <span>قواعد الوقفات المطبقة تلقائياً:</span>
                </div>
                <div className="space-y-1.5 text-slate-300 text-[11px]">
                  <div>• الفاصلة (،): وقفة قصيرة جداً للتنفس الطبيعي.</div>
                  <div>• النقطة (.): وقفة نهاية جملة اعتيادية.</div>
                  <div>• السطر الفارغ: وقفة سردية واضحة بين المشاهد.</div>
                  <div>• علامة (***): وقفة سينمائية أطول مع صمت محسوب.</div>
                  <div>• الجمل القصيرة المنفصلة ("لقيناه."، "05:17"): وقفة درامية قبلها وبعدها.</div>
                </div>
              </div>

              {/* Character Voices Toggle (Requirement 14) */}
              <div className="flex items-center justify-between p-3.5 bg-[#0F172A] border border-[#1E293B] rounded-xl text-xs">
                <div>
                  <div className="font-bold text-white">أصوات الشخصيات (Character Voices)</div>
                  <div className="text-[11px] text-[#94A3B8] mt-0.5">
                    الافتراضي (OFF): صوت الراوي نفسه يقرأ السرد والحوارات بتلوين أدائي طبيعي.
                  </div>
                </div>
                <button
                  onClick={() => setCharacterVoicesEnabled(!characterVoicesEnabled)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold font-mono-num transition-all ${
                    characterVoicesEnabled
                      ? 'bg-[#11233B] border-[#3AA9FF] text-[#3AA9FF]'
                      : 'bg-[#162032] border-slate-700 text-slate-400'
                  }`}
                >
                  {characterVoicesEnabled ? 'ON' : 'OFF (موصى به)'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Review & Save as Master Voice */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center mx-auto mb-2 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">جاهز للاعتماد كملف صوتي رئيسي دائم</h3>
                <p className="text-xs text-slate-400 mt-1">
                  سيتم تطبيق هذه المعايير على جميع حلقات أجزاء "الوارث" لضمان ثبات الهوية السمعية.
                </p>
              </div>

              <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#1E293B]">
                  <span className="text-slate-400">اسم الملف:</span>
                  <span className="font-bold text-white font-mono-num">AL WARITH - MAIN NARRATOR</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1E293B]">
                  <span className="text-slate-400">الصوت المختار:</span>
                  <span className="font-bold text-[#3AA9FF]">{selectedVoice}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1E293B]">
                  <span className="text-slate-400">إيقاع السرد:</span>
                  <span className="text-white">متوسط يميل للبطء (Cinematic Pacing)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1E293B]">
                  <span className="text-slate-400">وضع الدارجة المغربية:</span>
                  <span className="text-emerald-400 font-bold">مفعل (Preserve Darija)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">أصوات الشخصيات المستقلة:</span>
                  <span className="text-slate-300">{characterVoicesEnabled ? 'ON' : 'OFF (راوي موحد)'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="p-4 bg-[#0A0A0A] border-t border-[#1E293B] flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => {
                stopAudio();
                setStep(step - 1);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white bg-[#162032] border border-slate-700"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>السابق</span>
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              onClick={() => {
                stopAudio();
                setStep(step + 1);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3AA9FF] hover:bg-[#60BAFF] text-black font-bold text-xs shadow-md transition-all"
            >
              <span>التالي</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ واعتماد راوي الوارث الرئيسي</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
