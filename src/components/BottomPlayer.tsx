import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  RotateCw,
  Sparkles,
  Radio,
  Sliders,
} from 'lucide-react';
import { SceneChunk, NarratorProfile, AudioMixMode } from '../types';
import { formatTime } from '../utils/audioUtils';

interface BottomPlayerProps {
  currentScene: SceneChunk | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNextScene: () => void;
  onPrevScene: () => void;
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  narrator: NarratorProfile;
  volume: number;
  onVolumeChange: (vol: number) => void;
  allScenes: SceneChunk[];
  isFullEpisodePlaying: boolean;
  mixMode: AudioMixMode;
  onMixModeChange: (mode: AudioMixMode) => void;
}

export const BottomPlayer: React.FC<BottomPlayerProps> = ({
  currentScene,
  isPlaying,
  onPlayPause,
  onNextScene,
  onPrevScene,
  currentTime,
  duration,
  onSeek,
  narrator,
  volume,
  onVolumeChange,
  allScenes,
  isFullEpisodePlaying,
  mixMode,
  onMixModeChange,
}) => {
  const readyScenesCount = allScenes.filter((s) => s.audioBase64).length;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0A]/95 border-t border-[#1E293B] backdrop-blur-md px-4 py-2.5 shadow-[0_-5px_25px_rgba(0,0,0,0.8)]">
      <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Active Scene Track Info */}
        <div className="flex items-center gap-3 w-full md:w-1/4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#11233B] to-[#0A0A0A] border border-[#3AA9FF]/40 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(58,169,255,0.2)]">
            {isPlaying ? (
              <div className="flex items-end gap-0.5 h-4">
                <span className="w-1 bg-[#3AA9FF] rounded-full animate-wave-1" />
                <span className="w-1 bg-[#3AA9FF] rounded-full animate-wave-2" />
                <span className="w-1 bg-[#3AA9FF] rounded-full animate-wave-3" />
                <span className="w-1 bg-[#3AA9FF] rounded-full animate-wave-4" />
              </div>
            ) : (
              <Radio className="w-5 h-5 text-[#3AA9FF]" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-white truncate">
                {currentScene
                  ? `مشهد ${currentScene.sceneNumber.toString().padStart(2, '0')}`
                  : 'مشغل استوديو الوارث'}
              </span>
              {isFullEpisodePlaying && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                  تشغيل متصل
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#94A3B8] truncate mt-0.5 font-serif">
              {currentScene ? currentScene.rawText : `${readyScenesCount} مشهد صوتي متاح`}
            </div>
          </div>
        </div>

        {/* Center: Master Transport Controls & Progress Scrub Bar */}
        <div className="flex flex-col items-center gap-1.5 w-full md:w-2/4">
          <div className="flex items-center gap-3">
            <button
              onClick={onPrevScene}
              disabled={allScenes.length === 0}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#162032] disabled:opacity-30"
              title="المشهد السابق"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={onPlayPause}
              disabled={readyScenesCount === 0}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-40 ${
                isPlaying
                  ? 'bg-[#3AA9FF] text-black shadow-[0_0_15px_#3aa9ff]'
                  : 'bg-white hover:bg-slate-200 text-black shadow-md'
              }`}
              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-black" />
              ) : (
                <Play className="w-5 h-5 fill-black mr-0.5" />
              )}
            </button>

            <button
              onClick={onNextScene}
              disabled={allScenes.length === 0}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#162032] disabled:opacity-30"
              title="المشهد التالي"
            >
              <SkipBack className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Timeline Scrubber */}
          <div className="w-full flex items-center gap-3 text-xs font-mono-num text-slate-400">
            <span className="text-[11px] min-w-[38px] text-right">{formatTime(currentTime)}</span>
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min={0}
                max={duration > 0 ? duration : 100}
                value={currentTime}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-[#3AA9FF]"
              />
            </div>
            <span className="text-[11px] min-w-[38px]">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Mix Mode Selector & Master Output */}
        <div className="flex items-center justify-end gap-2 w-full md:w-auto text-xs">
          {/* Mix Mode 3-way toggle */}
          <div className="flex items-center bg-[#11233B]/80 p-0.5 rounded-lg border border-[#3AA9FF]/30 text-[10px] font-bold">
            <button
              onClick={() => onMixModeChange('final_mix')}
              className={`px-2 py-1 rounded transition-all ${
                mixMode === 'final_mix'
                  ? 'bg-[#3AA9FF] text-black shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="مكس نهائي: صوت الراوي مدمج مع الموسيقى مع خفض الصوت التلقائي"
            >
              Final Mix
            </button>
            <button
              onClick={() => onMixModeChange('voice_only')}
              className={`px-2 py-1 rounded transition-all ${
                mixMode === 'voice_only'
                  ? 'bg-[#3AA9FF] text-black shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="صوت فقط: صوت الراوي النقي 24kHz"
            >
              Voice Only
            </button>
            <button
              onClick={() => onMixModeChange('music_only')}
              className={`px-2 py-1 rounded transition-all ${
                mixMode === 'music_only'
                  ? 'bg-[#3AA9FF] text-black shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="موسيقى فقط: الموسيقى التصويرية التصويرية المعزولة"
            >
              Music Only
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-1.5 bg-[#162032] px-2 py-1 rounded-lg border border-[#1E293B]">
            <button
              onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}
              className="text-slate-400 hover:text-white"
            >
              {volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-14 h-1 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-[#3AA9FF]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
