import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCw,
  Lock,
  Unlock,
  Download,
  Trash2,
  Sliders,
  Sparkles,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Scissors,
} from 'lucide-react';
import { SceneChunk, ScenePreset, SceneControls, NarratorProfile } from '../types';
import { triggerDownload, formatTime } from '../utils/audioUtils';
import { playBrowserSpeech, stopBrowserSpeech } from '../utils/speechSynthesizer';

interface SceneListProps {
  scenes: SceneChunk[];
  onUpdateScene: (sceneId: string, updated: Partial<SceneChunk>) => void;
  onGenerateScene: (sceneId: string) => Promise<void>;
  onRegenerateSelection: (sceneId: string, selectionText: string) => Promise<void>;
  narrator: NarratorProfile;
  currentPlayingSceneId: string | null;
  onPlayScene: (sceneId: string) => void;
  onPauseScene: () => void;
  isPlaying: boolean;
}

export const SceneList: React.FC<SceneListProps> = ({
  scenes,
  onUpdateScene,
  onGenerateScene,
  onRegenerateSelection,
  narrator,
  currentPlayingSceneId,
  onPlayScene,
  onPauseScene,
  isPlaying,
}) => {
  const [selectedTextByScene, setSelectedTextByScene] = useState<Record<string, string>>({});
  const [expandedControlsId, setExpandedControlsId] = useState<string | null>(null);
  const [speakingBrowserSceneId, setSpeakingBrowserSceneId] = useState<string | null>(null);

  const handleBrowserSpeak = (sceneId: string, text: string) => {
    if (speakingBrowserSceneId === sceneId) {
      stopBrowserSpeech();
      setSpeakingBrowserSceneId(null);
    } else {
      stopBrowserSpeech();
      setSpeakingBrowserSceneId(sceneId);
      playBrowserSpeech(text, () => {
        setSpeakingBrowserSceneId(null);
      });
    }
  };

  const presets: Array<{ id: ScenePreset; label: string; desc: string }> = [
    { id: 'mystery', label: 'غموض هادئ', desc: 'نبرة متحكم بها، مشهد استكشافي مشوق' },
    { id: 'tension', label: 'توتر متصاعد', desc: 'حبس أنفاس تدريجي' },
    { id: 'whispered_tension', label: 'همس متوتر', desc: 'قريب جداً من الميكروفون' },
    { id: 'revelation', label: 'لحظة كشف', desc: 'تباطؤ درامي قبل المعلومة الكبرى' },
    { id: 'emotional', label: 'مشهد إنساني', desc: 'دفء خفيف وعمق نفسي' },
    { id: 'urgent', label: 'خطر ملح', desc: 'إيقاع يقظ وجاد' },
    { id: 'dialogue', label: 'حوار طبيعي', desc: 'سرد حواري بلسان الراوي' },
    { id: 'normal', label: 'سرد متزن', desc: 'إلقاء مريح واعتيادي' },
  ];

  // Capture selection within textarea
  const handleTextSelect = (sceneId: string, e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    if (start !== end) {
      const selected = target.value.substring(start, end).trim();
      setSelectedTextByScene((prev) => ({ ...prev, [sceneId]: selected }));
    } else {
      setSelectedTextByScene((prev) => ({ ...prev, [sceneId]: '' }));
    }
  };

  const handleDownloadScene = (scene: SceneChunk) => {
    if (!scene.audioBase64) return;
    const filename = `ALWARITH_SCENE_${scene.sceneNumber.toString().padStart(2, '0')}.wav`;
    triggerDownload(`data:audio/wav;base64,${scene.audioBase64}`, filename);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>مقاطع المشاهد (Scene Chunks)</span>
            <span className="text-xs px-2 py-0.5 rounded bg-[#11233B] text-[#3AA9FF] font-mono-num font-bold">
              {scenes.length} Scenes
            </span>
          </h3>
          <p className="text-[11px] text-[#94A3B8]">
            كل مشهد يحافظ على نفس شخصية الراوي الرئيسية ({narrator.voiceName}) مع تحكم فردي بالإيقاع والوقفات.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {scenes.map((scene) => {
          const isThisPlaying = currentPlayingSceneId === scene.id && isPlaying;
          const isSelected = selectedTextByScene[scene.id];
          const isControlsOpen = expandedControlsId === scene.id;

          const wordCount = scene.rawText.split(/\s+/).filter(Boolean).length;

          return (
            <div
              key={scene.id}
              className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                scene.isLocked
                  ? 'bg-[#0F172A]/70 border-emerald-900/40'
                  : isThisPlaying
                  ? 'bg-[#11233B]/70 border-[#3AA9FF] shadow-[0_0_15px_rgba(58,169,255,0.2)]'
                  : 'bg-[#0F172A] border-[#1E293B] hover:border-slate-700'
              }`}
            >
              {/* Scene Card Header */}
              <div className="p-3 bg-[#0A0A0A]/60 border-b border-[#1E293B] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#162032] border border-slate-700 flex items-center justify-center font-mono-num text-xs font-bold text-white">
                    {scene.sceneNumber.toString().padStart(2, '0')}
                  </span>
                  <span className="text-xs font-semibold text-slate-200">
                    المشهد {scene.sceneNumber}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono-num">
                    ({wordCount} كلمة)
                  </span>

                  {/* Preset badge */}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#11233B] text-[#3AA9FF] border border-[#3AA9FF]/30">
                    {presets.find((p) => p.id === scene.preset)?.label || scene.preset}
                  </span>

                  {/* AL WARITH Music DNA State */}
                  {scene.music && (
                    scene.music.isSilence ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold flex items-center gap-1">
                        <span>صمت (SILENCE)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono-num font-bold flex items-center gap-1">
                        <span>🎵 {scene.music.musicState}</span>
                        <span className="text-slate-400">({Math.round(scene.music.intensity * 100)}%)</span>
                      </span>
                    )
                  )}

                  {/* Cues Count */}
                  {scene.cues.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                      {scene.cues.length} Cue
                    </span>
                  )}

                  {scene.isLocked && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>معتمد (Locked)</span>
                    </span>
                  )}
                </div>

                {/* Right controls: Status & Quick Actions */}
                <div className="flex items-center gap-1.5">
                  {/* Status Indicator */}
                  {scene.status === 'generating' && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium px-2 py-0.5 rounded bg-amber-950/50 border border-amber-900/60">
                      <RotateCw className="w-3 h-3 animate-spin" />
                      <span>جارٍ التوليد...</span>
                    </div>
                  )}

                  {scene.status === 'ready' && (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono-num px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/50">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>جاهز ({scene.duration ? formatTime(scene.duration) : 'WAV'})</span>
                    </div>
                  )}

                  {scene.status === 'error' && (
                    <div className="flex items-center gap-1 text-[11px] text-rose-400 px-2 py-0.5 rounded bg-rose-950/50 border border-rose-900/60">
                      <AlertCircle className="w-3 h-3" />
                      <span>فشل التوليد</span>
                    </div>
                  )}

                  {/* Lock / Unlock audio (Requirement 11, 16) */}
                  <button
                    onClick={() => onUpdateScene(scene.id, { isLocked: !scene.isLocked })}
                    className={`p-1.5 rounded transition-all ${
                      scene.isLocked
                        ? 'text-emerald-400 hover:bg-emerald-950/50'
                        : 'text-slate-400 hover:text-white hover:bg-[#1E293B]'
                    }`}
                    title={scene.isLocked ? 'فك قفل المشهد' : 'قفل المشهد كمعتمد نهائياً'}
                  >
                    {scene.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>

                  {/* Tuning Drawer Toggle */}
                  <button
                    onClick={() => setExpandedControlsId(isControlsOpen ? null : scene.id)}
                    className={`p-1.5 rounded transition-all ${
                      isControlsOpen
                        ? 'text-[#3AA9FF] bg-[#11233B]'
                        : 'text-slate-400 hover:text-white hover:bg-[#1E293B]'
                    }`}
                    title="ضبط الإيقاع والوقفات والنبرة"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Fine Controls Drawer (Requirement 11) */}
              {isControlsOpen && (
                <div className="p-3 bg-[#0A0A0A]/95 border-b border-[#1E293B] space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {/* Preset */}
                    <div>
                      <label className="block text-[10px] text-[#94A3B8] mb-1">النمط الدرامي (Preset)</label>
                      <select
                        value={scene.preset}
                        onChange={(e) =>
                          onUpdateScene(scene.id, { preset: e.target.value as ScenePreset })
                        }
                        className="w-full bg-[#162032] border border-[#1E293B] rounded p-1.5 text-white outline-none focus:border-[#3AA9FF]"
                      >
                        {presets.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Pace */}
                    <div>
                      <label className="block text-[10px] text-[#94A3B8] mb-1">السرعة (Pace)</label>
                      <select
                        value={scene.controls.pace}
                        onChange={(e) =>
                          onUpdateScene(scene.id, {
                            controls: { ...scene.controls, pace: e.target.value as any },
                          })
                        }
                        className="w-full bg-[#162032] border border-[#1E293B] rounded p-1.5 text-white outline-none focus:border-[#3AA9FF]"
                      >
                        <option value="slow">بطيء سينمائي (Slow)</option>
                        <option value="medium_slow">متوسط يميل للبطء (المعتمد)</option>
                        <option value="medium">متوسط طبيعي (Medium)</option>
                        <option value="fast">سريع يقظ (Fast)</option>
                      </select>
                    </div>

                    {/* Tone */}
                    <div>
                      <label className="block text-[10px] text-[#94A3B8] mb-1">النبرة (Tone)</label>
                      <select
                        value={scene.controls.tone}
                        onChange={(e) =>
                          onUpdateScene(scene.id, {
                            controls: { ...scene.controls, tone: e.target.value as any },
                          })
                        }
                        className="w-full bg-[#162032] border border-[#1E293B] rounded p-1.5 text-white outline-none focus:border-[#3AA9FF]"
                      >
                        <option value="deep_calm">ناضج وهادئ (Deep Calm)</option>
                        <option value="dark_mystery">غموض متحكم به (Dark Mystery)</option>
                        <option value="reflective">إنساني تأملي (Reflective)</option>
                        <option value="intense">توتر داخلي (Intense)</option>
                      </select>
                    </div>

                    {/* Pause Intensity */}
                    <div>
                      <label className="block text-[10px] text-[#94A3B8] mb-1">حدة الوقفات الدرامية</label>
                      <select
                        value={scene.controls.pauseIntensity}
                        onChange={(e) =>
                          onUpdateScene(scene.id, {
                            controls: { ...scene.controls, pauseIntensity: e.target.value as any },
                          })
                        }
                        className="w-full bg-[#162032] border border-[#1E293B] rounded p-1.5 text-white outline-none focus:border-[#3AA9FF]"
                      >
                        <option value="subtle">وقفات خفيفة</option>
                        <option value="cinematic">وقفات سينمائية محسوبة (افتراضي)</option>
                        <option value="extended">وقفات صمت ممتدة</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-[#1E293B]">
                    <span>تطبيق الإعدادات على: <strong>هذا المقطع فقط</strong> (لحماية اتساق هوية الراوي)</span>
                    <button
                      onClick={() => setExpandedControlsId(null)}
                      className="text-[#3AA9FF] hover:underline"
                    >
                      إغلاق
                    </button>
                  </div>
                </div>
              )}

              {/* Scene Script Body */}
              <div className="p-3 space-y-2">
                <textarea
                  value={scene.rawText}
                  onChange={(e) => onUpdateScene(scene.id, { rawText: e.target.value })}
                  onSelect={(e) => handleTextSelect(scene.id, e)}
                  rows={4}
                  className="w-full bg-[#0A0A0A] border border-[#1E293B] rounded-lg p-2.5 text-xs text-[#EAEAEA] leading-relaxed focus:border-[#3AA9FF] outline-none font-sans resize-y selection:bg-[#3AA9FF]/30 selection:text-white"
                  placeholder="نص المشهد بالدارجة المغربية..."
                />

                {/* Display detected production cues */}
                {scene.cues.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-500">مؤشرات المونتاج في هذا المشهد:</span>
                    {scene.cues.map((cue, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/80 font-mono-num"
                      >
                        [{cue}]
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Bar per Chunk: Play, Regenerate, Selection Fix, Download */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#1E293B]/70">
                  <div className="flex items-center gap-2">
                    {/* Play/Pause Button */}
                    <button
                      onClick={() => {
                        if (isThisPlaying) {
                          onPauseScene();
                        } else {
                          onPlayScene(scene.id);
                        }
                      }}
                      disabled={!scene.audioBase64 || scene.status === 'generating'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 ${
                        isThisPlaying
                          ? 'bg-[#3AA9FF] text-black shadow-[0_0_12px_#3aa9ff]'
                          : 'bg-[#11233B] text-[#3AA9FF] hover:bg-[#1A3458] border border-[#3AA9FF]/30'
                      }`}
                    >
                      {isThisPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-black" />
                          <span>إيقاف مؤقت</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-[#3AA9FF]" />
                          <span>استماع للمشهد</span>
                        </>
                      )}
                    </button>

                    {/* Browser Arabic Speech live preview (Web Speech API) */}
                    <button
                      onClick={() => handleBrowserSpeak(scene.id, scene.rawText)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                        speakingBrowserSceneId === scene.id
                          ? 'bg-amber-400 text-black border-amber-300 font-bold shadow-[0_0_10px_#f59e0b]'
                          : 'bg-[#0F172A] hover:bg-[#1E293B] border-slate-700 text-slate-300 hover:text-white'
                      }`}
                      title="استماع فوري للنص عبر محرك النطق العربي للمتصفح (Web Speech)"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{speakingBrowserSceneId === scene.id ? 'إيقاف النطق' : 'نطق المتصفح'}</span>
                    </button>

                    {/* Regenerate Chunk (Requirement 11) */}
                    <button
                      onClick={() => onGenerateScene(scene.id)}
                      disabled={scene.status === 'generating' || scene.isLocked}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#162032] hover:bg-[#1E293B] border border-slate-700 text-xs text-slate-300 hover:text-white transition-all disabled:opacity-40"
                      title="إعادة توليد هذا المشهد بالكامل بنفس شخصية الراوي"
                    >
                      <RotateCw
                        className={`w-3 h-3 text-[#3AA9FF] ${scene.status === 'generating' ? 'animate-spin' : ''}`}
                      />
                      <span>{scene.audioBase64 ? 'إعادة توليد' : 'توليد الصوت'}</span>
                    </button>

                    {/* Download individual scene audio (Requirement 11, 18) */}
                    {scene.audioBase64 && (
                      <button
                        onClick={() => handleDownloadScene(scene)}
                        className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1E293B]"
                        title="تحميل ملف صوت هذا المشهد بصيغة WAV نظيفة"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Single Sentence / Selection Regeneration (Requirement 12) */}
                  {isSelected && (
                    <div className="flex items-center gap-2 bg-[#11233B] border border-[#3AA9FF]/60 px-2.5 py-1 rounded-lg text-xs animate-in fade-in duration-200">
                      <Scissors className="w-3.5 h-3.5 text-[#3AA9FF]" />
                      <span className="text-slate-300">
                        محدد: <strong className="text-white font-mono-num">"{isSelected.slice(0, 20)}..."</strong>
                      </span>
                      <button
                        onClick={() => onRegenerateSelection(scene.id, isSelected)}
                        disabled={scene.status === 'generating' || scene.isLocked}
                        className="px-2 py-0.5 rounded bg-[#3AA9FF] text-black font-bold text-[11px] hover:bg-[#60BAFF] shadow-sm"
                        title="إعادة توليد فقط الجملة المحددة لتصحيح نطق كلمة خاطئة واستبدالها"
                      >
                        إعادة توليد التحديد (REGENERATE SELECTION)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
