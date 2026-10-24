import React, { useState } from 'react';
import {
  Download,
  X,
  FileAudio,
  FileText,
  ListOrdered,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Layers,
  RotateCw,
  Music,
  Mic,
  Sliders,
} from 'lucide-react';
import { Episode, PronunciationEntry, AudioMixMode } from '../types';
import { concatenateWavFiles, triggerDownload, formatTime } from '../utils/audioUtils';
import { mixFullEpisode } from '../utils/audioMixer';

interface ExportModalProps {
  episode: Episode;
  dictionary: PronunciationEntry[];
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ episode, dictionary, onClose }) => {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  const readyScenes = episode.scenes.filter((s) => s.audioBase64);
  const baseName = `ALWARITH_P${episode.partNumber.toString().padStart(2, '0')}_E${episode.episodeNumber}_${episode.title.replace(/\s+/g, '_')}`;

  // 1. Export Mix according to Mode (FINAL MIX / VOICE ONLY / MUSIC ONLY)
  const handleExportMode = async (mode: AudioMixMode) => {
    if (readyScenes.length === 0) {
      alert('لا توجد مشاهد صوتية جاهزة بعد. يرجى توليد المقاطع أو إنتاج الحلقة أولاً.');
      return;
    }

    try {
      setIsExporting(mode);
      const { blob } = await mixFullEpisode(readyScenes, mode, 0.7);

      let filename = `${baseName}_FINAL_MIX.wav`;
      if (mode === 'voice_only') filename = `${baseName}_VOICE_ONLY.wav`;
      if (mode === 'music_only') filename = `${baseName}_MUSIC_ONLY.wav`;

      triggerDownload(blob, filename);

      const label =
        mode === 'final_mix'
          ? 'المكس النهائي (صوت + موسيقى)'
          : mode === 'voice_only'
          ? 'الصوت النقي للراوي فقط'
          : 'الموسيقى التصويرية فقط';

      setExportSuccessMessage(`تم تصدير ملف ${label} بنجاح: ${filename}`);
      setTimeout(() => setExportSuccessMessage(null), 4500);
    } catch (err: any) {
      console.error('Failed to export audio', err);
      alert('خطأ أثناء تجهيز وتصدير الصوت: ' + (err?.message || 'خطأ غير معروف'));
    } finally {
      setIsExporting(null);
    }
  };

  // 2. Export Individual Scenes (Requirement 18: ALWARITH_P01_E02_S01, etc.)
  const handleExportIndividualScenes = () => {
    if (readyScenes.length === 0) {
      alert('لا توجد مشاهد صوتية جاهزة للتحميل.');
      return;
    }

    readyScenes.forEach((scene, idx) => {
      setTimeout(() => {
        const sceneNum = scene.sceneNumber.toString().padStart(2, '0');
        const filename = `${baseName}_S${sceneNum}.wav`;
        triggerDownload(`data:audio/wav;base64,${scene.audioBase64}`, filename);
      }, idx * 250);
    });

    setExportSuccessMessage(`جارٍ تحميل ${readyScenes.length} ملفات للمشاهد الفردية...`);
    setTimeout(() => setExportSuccessMessage(null), 4000);
  };

  // 3. Export Clean Script (.txt / .md)
  const handleExportScript = () => {
    const header = `================================================
الوارث | AL WARITH - سيناريو الحلقة
================================================
السلسلة: ${episode.series}
الجزء: ${episode.part}
الفصل: ${episode.chapter}
رقم الحلقة: ${episode.episodeNumber}
عنوان الحلقة: ${episode.title}
تاريخ التصدير: ${new Date().toLocaleDateString('ar-MA')}
عدد الكلمات: ${episode.originalScript.split(/\s+/).filter(Boolean).length}
================================================\n\n`;

    const content = header + episode.originalScript;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, `${baseName}_SCRIPT.txt`);
  };

  // 4. Export Cue Sheet for Video Montage (JSON / DaVinci / Premiere)
  const handleExportCueSheet = () => {
    let currentTime = 0;
    const cuesData = episode.scenes.map((s) => {
      const startTime = currentTime;
      const duration = s.duration || (s.audioBase64 ? 12 : 10);
      currentTime += duration + 0.7; // including pause

      return {
        sceneNumber: s.sceneNumber,
        startTimeFormatted: formatTime(startTime),
        startTimeSeconds: startTime,
        durationSeconds: duration,
        preset: s.preset,
        cues: s.cues,
        scriptExcerpt: s.rawText.slice(0, 60) + '...',
      };
    });

    const exportPayload = {
      project: 'الوارث | AL WARITH',
      episode: {
        part: episode.part,
        chapter: episode.chapter,
        episodeNumber: episode.episodeNumber,
        title: episode.title,
      },
      exportDate: new Date().toISOString(),
      scenesCues: cuesData,
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    triggerDownload(blob, `${baseName}_CUE_SHEET.json`);
  };

  // 5. Export Pronunciation Dictionary
  const handleExportDictionary = () => {
    const blob = new Blob([JSON.stringify(dictionary, null, 2)], {
      type: 'application/json',
    });
    triggerDownload(blob, `ALWARITH_PRONUNCIATION_DICTIONARY.json`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0A0A0A] border border-[#3AA9FF]/40 rounded-2xl max-w-xl w-full overflow-hidden shadow-[0_0_40px_rgba(58,169,255,0.25)] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#11233B] to-[#0A0A0A] border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3AA9FF]/10 border border-[#3AA9FF]/30 flex items-center justify-center text-[#3AA9FF]">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>تصدير حلقة الوارث (Production Export)</span>
              </h2>
              <p className="text-[11px] text-[#94A3B8] font-mono-num">{baseName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1E293B]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Alert */}
        {exportSuccessMessage && (
          <div className="m-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportSuccessMessage}</span>
          </div>
        )}

        {/* Export Options (Prompt Requirements) */}
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* 1. FINAL MIX: Narration + Ducked Underscore */}
          <div className="bg-gradient-to-r from-[#11233B] to-[#0F172A] border border-[#3AA9FF]/60 p-4 rounded-xl shadow-md transition-all flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#3AA9FF]/20 border border-[#3AA9FF]/50 flex items-center justify-center text-[#3AA9FF] shadow-[0_0_12px_rgba(58,169,255,0.3)]">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>تصدير المكس النهائي (FINAL MIX)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                    صوت + موسيقى + Ducking
                  </span>
                </div>
                <div className="text-[11px] text-[#94A3B8] mt-0.5">
                  الماستر الإذاعي الكامل: تعليق الراوي بالدارجة مدمج مع موسيقى الوارث ووقفات الصمت وخفض الصوت التلقائي.
                </div>
                <div className="text-[10px] text-slate-500 font-mono-num mt-1">
                  {readyScenes.length} مشهد جاهز • {baseName}_FINAL_MIX.wav
                </div>
              </div>
            </div>

            <button
              onClick={() => handleExportMode('final_mix')}
              disabled={isExporting !== null || readyScenes.length === 0}
              className="px-4 py-2 rounded-lg bg-[#3AA9FF] hover:bg-[#60BAFF] text-black font-extrabold text-xs shadow-md transition-all disabled:opacity-40 flex items-center gap-1.5 shrink-0"
            >
              {isExporting === 'final_mix' ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جارٍ المكس...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير FINAL MIX</span>
                </>
              )}
            </button>
          </div>

          {/* 2. VOICE ONLY: Clean Narration */}
          <div className="bg-[#0F172A] border border-[#1E293B] hover:border-slate-700 p-4 rounded-xl transition-all flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#162032] border border-slate-700 flex items-center justify-center text-emerald-400">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>تصدير صوت الراوي النقي (VOICE ONLY)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Clean Voice 24k
                  </span>
                </div>
                <div className="text-[11px] text-[#94A3B8] mt-0.5">
                  صوت الراوي النقي دون أي موسيقى أو مؤثرات لتطبيق المونتاج المستقل.
                </div>
                <div className="text-[10px] text-slate-500 font-mono-num mt-1">
                  {baseName}_VOICE_ONLY.wav
                </div>
              </div>
            </div>

            <button
              onClick={() => handleExportMode('voice_only')}
              disabled={isExporting !== null || readyScenes.length === 0}
              className="px-3.5 py-1.5 rounded-lg bg-[#162032] hover:bg-[#1E293B] border border-slate-700 text-slate-200 text-xs font-semibold disabled:opacity-40 flex items-center gap-1.5 shrink-0"
            >
              {isExporting === 'voice_only' ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>تصدير VOICE ONLY</span>
            </button>
          </div>

          {/* 3. MUSIC ONLY: Isolated Underscore */}
          <div className="bg-[#0F172A] border border-[#1E293B] hover:border-slate-700 p-4 rounded-xl transition-all flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#162032] border border-slate-700 flex items-center justify-center text-purple-400">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>تصدير الموسيقى التصويرية فقط (MUSIC ONLY)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    AL WARITH DNA
                  </span>
                </div>
                <div className="text-[11px] text-[#94A3B8] mt-0.5">
                  الموسيقى التصويرية المعزولة مع فترات الصمت الدرامية وبصمة 05:17.
                </div>
                <div className="text-[10px] text-slate-500 font-mono-num mt-1">
                  {baseName}_MUSIC_ONLY.wav
                </div>
              </div>
            </div>

            <button
              onClick={() => handleExportMode('music_only')}
              disabled={isExporting !== null || readyScenes.length === 0}
              className="px-3.5 py-1.5 rounded-lg bg-[#162032] hover:bg-[#1E293B] border border-slate-700 text-slate-200 text-xs font-semibold disabled:opacity-40 flex items-center gap-1.5 shrink-0"
            >
              {isExporting === 'music_only' ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>تصدير MUSIC ONLY</span>
            </button>
          </div>

          {/* 2. Individual Scenes WAV */}
          <div className="bg-[#0F172A] border border-[#1E293B] hover:border-slate-700 p-4 rounded-xl transition-all flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#162032] border border-slate-700 flex items-center justify-center text-slate-300">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">تصدير المشاهد كملفات منفصلة (Individual Scenes)</div>
                <div className="text-[11px] text-[#94A3B8] mt-0.5">
                  تسمية تلقائية معيارية ({baseName}_S01.wav, _S02.wav...)
                </div>
              </div>
            </div>

            <button
              onClick={handleExportIndividualScenes}
              disabled={readyScenes.length === 0}
              className="px-3.5 py-1.5 rounded-lg bg-[#162032] hover:bg-[#1E293B] border border-slate-700 text-slate-200 text-xs font-semibold disabled:opacity-40"
            >
              تحميل المشاهد
            </button>
          </div>

          {/* 3. Export Cue Sheet */}
          <div className="bg-[#0F172A] border border-[#1E293B] hover:border-slate-700 p-4 rounded-xl transition-all flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#162032] border border-slate-700 flex items-center justify-center text-purple-400">
                <ListOrdered className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">تصدير ورقة المؤشرات (Cue Sheet)</div>
                <div className="text-[11px] text-[#94A3B8] mt-0.5">
                  جدول زمني بصيغة JSON يحدد مواقع الموسيقى والمؤثرات الصوتية [موسيقى، صمت، خطوات].
                </div>
              </div>
            </div>

            <button
              onClick={handleExportCueSheet}
              className="px-3.5 py-1.5 rounded-lg bg-[#162032] hover:bg-[#1E293B] border border-slate-700 text-slate-200 text-xs font-semibold"
            >
              تصدير Cue Sheet
            </button>
          </div>

          {/* 4. Export Script */}
          <div className="bg-[#0F172A] border border-[#1E293B] hover:border-slate-700 p-4 rounded-xl transition-all flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#162032] border border-slate-700 flex items-center justify-center text-amber-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">تصدير نص السيناريو (Script Text)</div>
                <div className="text-[11px] text-[#94A3B8] mt-0.5">
                  النص الأصلي الكامل للحلقة بالدارجة مع فواصل المشاهد وتعليمات المخرج.
                </div>
              </div>
            </div>

            <button
              onClick={handleExportScript}
              className="px-3.5 py-1.5 rounded-lg bg-[#162032] hover:bg-[#1E293B] border border-slate-700 text-slate-200 text-xs font-semibold"
            >
              تصدير النص
            </button>
          </div>

          {/* 5. Export Pronunciation Dictionary */}
          <div className="bg-[#0F172A] border border-[#1E293B] hover:border-slate-700 p-4 rounded-xl transition-all flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#162032] border border-slate-700 flex items-center justify-center text-[#3AA9FF]">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">تصدير قاموس نطق عالم الوارث</div>
                <div className="text-[11px] text-[#94A3B8] mt-0.5">
                  ملف JSON بجميع أسماء الشخصيات والمصطلحات ونطق 05:17 لمشاركته مع الفريق.
                </div>
              </div>
            </div>

            <button
              onClick={handleExportDictionary}
              className="px-3.5 py-1.5 rounded-lg bg-[#162032] hover:bg-[#1E293B] border border-slate-700 text-slate-200 text-xs font-semibold"
            >
              تصدير القاموس
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0A0A0A] border-t border-[#1E293B] text-center">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#162032] text-xs text-slate-300 hover:text-white"
          >
            إغلاق نافذة التصدير
          </button>
        </div>
      </div>
    </div>
  );
};
