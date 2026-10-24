import React from 'react';
import {
  Play,
  Pause,
  Lock,
  Unlock,
  RotateCw,
  Volume2,
  Clock,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Layers,
} from 'lucide-react';
import { SceneChunk, NarratorProfile } from '../types';
import { formatTime } from '../utils/audioUtils';

interface TimelineViewProps {
  scenes: SceneChunk[];
  onPlayScene: (sceneId: string) => void;
  onPauseScene: () => void;
  currentPlayingSceneId: string | null;
  isPlaying: boolean;
  onUpdateScene: (sceneId: string, updated: Partial<SceneChunk>) => void;
  onGenerateScene: (sceneId: string) => Promise<void>;
  onMoveScene: (index: number, direction: 'up' | 'down') => void;
  onPlayFullEpisode: () => void;
  isFullEpisodePlaying: boolean;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  scenes,
  onPlayScene,
  onPauseScene,
  currentPlayingSceneId,
  isPlaying,
  onUpdateScene,
  onGenerateScene,
  onMoveScene,
  onPlayFullEpisode,
  isFullEpisodePlaying,
}) => {
  const totalDurationSec = scenes.reduce((acc, s) => acc + (s.duration || (s.audioBase64 ? 12 : 0)), 0);
  const readyCount = scenes.filter((s) => s.status === 'ready').length;

  return (
    <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden shadow-xl space-y-4 p-4">
      {/* Timeline Header Track */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#0A0A0A] rounded-xl border border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#11233B] border border-[#3AA9FF]/30 flex items-center justify-center text-[#3AA9FF]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>التايم لاين الصوتي للحلقة (Audio Timeline)</span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#162032] text-[#3AA9FF] font-mono-num">
                {readyCount}/{scenes.length} مشهد جاهز
              </span>
            </h3>
            <div className="text-[11px] text-[#94A3B8] font-mono-num flex items-center gap-2 mt-0.5">
              <span>المدة الإجمالية التقديرية:</span>
              <strong className="text-white text-xs">{formatTime(totalDurationSec)}</strong>
              <span>•</span>
              <span className="text-emerald-400">Clean Voice (24kHz Mono WAV)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Master Play Button for full episode */}
          <button
            onClick={onPlayFullEpisode}
            disabled={readyCount === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40 ${
              isFullEpisodePlaying
                ? 'bg-[#3AA9FF] text-black shadow-[0_0_15px_#3aa9ff]'
                : 'bg-[#11233B] text-[#3AA9FF] border border-[#3AA9FF]/40 hover:bg-[#1A3458]'
            }`}
          >
            {isFullEpisodePlaying ? (
              <>
                <Pause className="w-4 h-4 fill-black" />
                <span>إيقاف تشغيل الحلقة كاملة</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-[#3AA9FF]" />
                <span>سماع الحلقة كاملة بتسلسل متصل</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Visual Timeline Strip */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-[#94A3B8] px-1">
          تسلسل المشاهد وعلامات الإنتاج الصوتية (Production Cue Markers):
        </div>

        <div className="space-y-2">
          {scenes.map((scene, idx) => {
            const isPlayingThis = currentPlayingSceneId === scene.id && isPlaying;
            const wordCount = scene.rawText.split(/\s+/).filter(Boolean).length;

            return (
              <div
                key={scene.id}
                className={`p-3 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                  isPlayingThis
                    ? 'bg-[#11233B] border-[#3AA9FF] shadow-[0_0_12px_rgba(58,169,255,0.2)]'
                    : scene.isLocked
                    ? 'bg-[#0A0A0A] border-emerald-900/50'
                    : 'bg-[#0A0A0A] border-[#1E293B] hover:border-slate-700'
                }`}
              >
                {/* Reorder and Index */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => onMoveScene(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-[#162032] text-slate-500 hover:text-white disabled:opacity-20"
                      title="تحريك لأعلى"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onMoveScene(idx, 'down')}
                      disabled={idx === scenes.length - 1}
                      className="p-1 rounded hover:bg-[#162032] text-slate-500 hover:text-white disabled:opacity-20"
                      title="تحريك لأسفل"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="w-8 h-8 rounded-lg bg-[#162032] border border-slate-700 flex items-center justify-center font-mono-num font-bold text-xs text-white">
                    S{scene.sceneNumber.toString().padStart(2, '0')}
                  </span>

                  <div className="max-w-md">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">المشهد {scene.sceneNumber}</span>
                      <span className="text-[10px] text-slate-400 font-mono-num font-semibold">
                        {wordCount} كلمة • {scene.duration ? formatTime(scene.duration) : '~00:15'}
                      </span>
                      {scene.isLocked && (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" />
                          <span>معتمد</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-300 truncate font-serif mt-0.5 max-w-[340px]">
                      {scene.rawText}
                    </div>
                  </div>
                </div>

                {/* Production Cues & Tags in Timeline */}
                <div className="flex flex-wrap items-center gap-1.5 flex-1 justify-center">
                  {scene.cues.map((cue, cIdx) => (
                    <span
                      key={cIdx}
                      className="text-[10px] px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800 flex items-center gap-1 font-mono-num"
                    >
                      <Volume2 className="w-2.5 h-2.5" />
                      <span>[{cue}]</span>
                    </span>
                  ))}
                  {scene.rawText.includes('05:17') && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono-num">
                      ⏱ 05:17
                    </span>
                  )}
                  {scene.rawText.includes('لقيناه') && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                      ★ لقيناه
                    </span>
                  )}
                </div>

                {/* Scene Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      if (isPlayingThis) {
                        onPauseScene();
                      } else {
                        onPlayScene(scene.id);
                      }
                    }}
                    disabled={!scene.audioBase64 || scene.status === 'generating'}
                    className={`p-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40 ${
                      isPlayingThis
                        ? 'bg-[#3AA9FF] text-black'
                        : 'bg-[#162032] text-slate-200 hover:text-white hover:bg-[#1E293B]'
                    }`}
                  >
                    {isPlayingThis ? (
                      <Pause className="w-3.5 h-3.5 fill-black" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-slate-200" />
                    )}
                  </button>

                  <button
                    onClick={() => onGenerateScene(scene.id)}
                    disabled={scene.status === 'generating' || scene.isLocked}
                    className="p-2 rounded-lg bg-[#162032] text-slate-300 hover:text-white hover:bg-[#1E293B] disabled:opacity-40"
                    title="إعادة توليد هذا المشهد"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${scene.status === 'generating' ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={() => onUpdateScene(scene.id, { isLocked: !scene.isLocked })}
                    className={`p-2 rounded-lg transition-all ${
                      scene.isLocked
                        ? 'text-emerald-400 bg-emerald-950/40'
                        : 'text-slate-400 hover:text-white bg-[#162032]'
                    }`}
                    title={scene.isLocked ? 'فك قفل المشهد' : 'قفل المشهد كمعتمد'}
                  >
                    {scene.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
