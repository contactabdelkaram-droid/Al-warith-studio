import React, { useState } from 'react';
import {
  Music,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCw,
  CheckCircle2,
  Shield,
  Layers,
  Info,
  Clock,
  Radio,
} from 'lucide-react';
import {
  SceneChunk,
  MusicState,
  MusicFamilyId,
  MusicTrackAsset,
  AlWarithMusicDnaConfig,
} from '../types';
import { getAudioContext, base64ToUint8Array, toArrayBuffer } from '../utils/audioUtils';
import { generateAlWarithMusicBed } from '../utils/musicEngine';

interface MusicDirectorPanelProps {
  scenes: SceneChunk[];
  onUpdateSceneMusic: (sceneId: string, musicUpdate: Partial<SceneChunk['music']>) => void;
  musicLibrary: MusicTrackAsset[];
  onRegenerateMusicFamily: (familyId: MusicFamilyId) => Promise<void>;
  musicConfig: AlWarithMusicDnaConfig;
  onUpdateMusicConfig: (config: Partial<AlWarithMusicDnaConfig>) => void;
  onAutoDirectAllScenes: () => Promise<void>;
  isDirecting: boolean;
}

export const MusicDirectorPanel: React.FC<MusicDirectorPanelProps> = ({
  scenes,
  onUpdateSceneMusic,
  musicLibrary,
  onRegenerateMusicFamily,
  musicConfig,
  onUpdateMusicConfig,
  onAutoDirectAllScenes,
  isDirecting,
}) => {
  const [playingAssetId, setPlayingAssetId] = useState<string | null>(null);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);
  const [activeTab, setActiveTab] = useState<'scenes' | 'families' | 'dna'>('scenes');

  const stopAudio = () => {
    if (audioSource) {
      try {
        audioSource.stop();
      } catch (e) {}
      setAudioSource(null);
    }
    setPlayingAssetId(null);
  };

  const handlePlayAssetPreview = async (asset: MusicTrackAsset) => {
    if (playingAssetId === asset.id) {
      stopAudio();
      return;
    }
    stopAudio();

    try {
      const ctx = getAudioContext();
      const bytes = base64ToUint8Array(asset.audioBase64);
      const ab = toArrayBuffer(bytes);
      const buffer = await ctx.decodeAudioData(ab);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setPlayingAssetId(null);
        setAudioSource(null);
      };

      source.start();
      setAudioSource(source);
      setPlayingAssetId(asset.id);
    } catch (e) {
      console.error('Failed to preview music asset', e);
    }
  };

  const musicStatesList: Array<{
    id: MusicState;
    label: string;
    desc: string;
    defaultIntensity: number;
    badgeColor: string;
  }> = [
    {
      id: 'MYSTERY',
      label: 'غموض (Mystery)',
      desc: 'درون هادئ ونغمات بيانو متباعدة (10-20%)',
      defaultIntensity: 0.15,
      badgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-800',
    },
    {
      id: 'TENSION',
      label: 'توتر (Tension)',
      desc: 'نبضات صب-باس مشدودة وتصاعد بطيء (20-40%)',
      defaultIntensity: 0.28,
      badgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
    },
    {
      id: 'MEMORY',
      label: 'ذكرى (Memory)',
      desc: 'أوتار دافئة منخفضة وحنين تأملي (10-25%)',
      defaultIntensity: 0.16,
      badgeColor: 'bg-teal-950 text-teal-300 border-teal-800',
    },
    {
      id: 'REVELATION',
      label: 'كشف وسر (Revelation)',
      desc: 'هبوط درامي عميق وبصمة 05:17 (15-30%)',
      defaultIntensity: 0.22,
      badgeColor: 'bg-purple-950 text-purple-300 border-purple-800',
    },
    {
      id: 'DANGER',
      label: 'خطر ملح (Danger)',
      desc: 'حضور المراقب والحراس بخلفية حذرة (25-45%)',
      defaultIntensity: 0.32,
      badgeColor: 'bg-rose-950 text-rose-300 border-rose-800',
    },
    {
      id: 'SILENCE',
      label: 'صمت درامي (Silence)',
      desc: 'صمت مقدس للجمل المفصلية والوقفات (0%)',
      defaultIntensity: 0.0,
      badgeColor: 'bg-slate-900 text-slate-300 border-slate-700',
    },
  ];

  const familiesList: Array<{
    id: MusicFamilyId;
    title: string;
    sub: string;
    state: MusicState;
  }> = [
    { id: 'MAIN_THEME', title: 'AL WARITH MAIN THEME', sub: 'الموتيف الخماسي + الدرون المتصل', state: 'MYSTERY' },
    { id: 'MYSTERY_BED', title: 'AL WARITH MYSTERY BED', sub: 'أجواء الشوارع الضيقة والظلام', state: 'MYSTERY' },
    { id: 'TENSION_BED', title: 'AL WARITH TENSION BED', sub: 'نبضات ترقب وتوتر نفسي', state: 'TENSION' },
    { id: 'MEMORY_BED', title: 'AL WARITH MEMORY BED', sub: 'ذكريات خريف طنجة والماضي', state: 'MEMORY' },
    { id: 'REVELATION_BED', title: 'AL WARITH REVELATION BED', sub: 'لحظات فتح الأبواب والسر', state: 'REVELATION' },
    { id: 'DANGER_BED', title: 'AL WARITH DANGER BED', sub: 'اقتراب الحراس وخطوات المراقب', state: 'DANGER' },
    { id: 'SIGNATURE_0517', title: 'AL WARITH 05:17 SIGNATURE', sub: 'بصمة توقيت 05:17 المشهدي', state: 'REVELATION' },
  ];

  return (
    <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden shadow-xl space-y-4">
      {/* Panel Top Header */}
      <div className="p-4 bg-gradient-to-r from-[#11233B] via-[#0A0A0A] to-[#0A0A0A] border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3AA9FF]/10 border border-[#3AA9FF]/40 flex items-center justify-center text-[#3AA9FF] shadow-[0_0_15px_rgba(58,169,255,0.2)]">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>المخرج الموسيقي التلقائي</span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#11233B] text-[#3AA9FF] font-mono-num font-bold">
                AL WARITH MUSIC DNA
              </span>
            </h2>
            <p className="text-[11px] text-[#94A3B8]">
              نظام تلقائي ذكي يحدد الحالة الموسيقية لكل مشهد، ويطبق الوقفات الصامتة وخفض الصوت (Ducking) تحت صوت الراوي.
            </p>
          </div>
        </div>

        {/* Global Action: Re-analyze / Auto-direct */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAutoDirectAllScenes}
            disabled={isDirecting || scenes.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3AA9FF] hover:bg-[#60BAFF] text-black font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isDirecting ? 'animate-spin' : ''}`} />
            <span>{isDirecting ? 'جارٍ الإخراج الموسيقي التلقائي...' : 'إعادة الإخراج الموسيقي التلقائي'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 border-b border-[#1E293B] flex items-center gap-2 bg-[#0A0A0A]">
        <button
          onClick={() => setActiveTab('scenes')}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'scenes'
              ? 'border-[#3AA9FF] text-[#3AA9FF]'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          توجيه مشاهد الحلقة ({scenes.length} مشهد)
        </button>
        <button
          onClick={() => setActiveTab('families')}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'families'
              ? 'border-[#3AA9FF] text-[#3AA9FF]'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          عائلات الموسيقى المعتمدة (7 Music Families)
        </button>
        <button
          onClick={() => setActiveTab('dna')}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'dna'
              ? 'border-[#3AA9FF] text-[#3AA9FF]'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          دستور الهوية الموسيقية (Music DNA Config)
        </button>
      </div>

      {/* TAB 1: SCENES MUSIC ASSIGNMENT LIST */}
      {activeTab === 'scenes' && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 bg-[#0A0A0A] p-2.5 rounded-lg border border-[#1E293B]">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#3AA9FF] shrink-0" />
              <span>
                النظام يحدد الحالة تلقائياً دون تدخل يدوي، ويضع <strong>الصمت (SILENCE)</strong> تلقائياً عند الجمل المفصلية مثل <em>"لقيناه."</em> أو <em>"ما تبقاش بوحدك."</em>.
              </span>
            </div>
            <span className="font-mono-num text-[11px] text-emerald-400">
              Ducking: 65% Auto-Active
            </span>
          </div>

          <div className="space-y-2">
            {scenes.map((scene) => {
              const music = scene.music;
              const currentState = music ? music.musicState : 'MYSTERY';
              const isSilence = music ? music.isSilence : false;
              const intensity = music ? Math.round(music.intensity * 100) : 15;

              return (
                <div
                  key={scene.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isSilence
                      ? 'bg-[#0A0A0A] border-slate-700/80'
                      : 'bg-[#0A0A0A] border-[#1E293B] hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    {/* Scene info & Script Excerpt */}
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className="w-7 h-7 rounded bg-[#162032] border border-slate-700 flex items-center justify-center font-mono-num font-bold text-xs text-white shrink-0">
                        {scene.sceneNumber.toString().padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">المشهد {scene.sceneNumber}</span>
                          {/* Silence or Music state badge */}
                          {isSilence ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1 font-bold">
                              <VolumeX className="w-3 h-3 text-amber-400" />
                              <span>صمت مقصود (SILENCE)</span>
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded border font-mono-num font-bold ${
                                musicStatesList.find((m) => m.id === currentState)?.badgeColor ||
                                'bg-indigo-950 text-indigo-300 border-indigo-800'
                              }`}
                            >
                              {currentState} ({intensity}%)
                            </span>
                          )}

                          {music?.familyId && !isSilence && (
                            <span className="text-[10px] text-[#3AA9FF] font-mono-num hidden md:inline">
                              [{music.familyId}]
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-300 font-serif truncate mt-1 max-w-xl">
                          "{scene.cleanText}"
                        </div>

                        {music?.silenceReason && (
                          <div className="text-[10px] text-amber-400/90 mt-1 flex items-center gap-1">
                            <span>سبب الصمت السردي:</span>
                            <span className="font-semibold">{music.silenceReason}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Fine-tuning Overrides (Optional user correction) */}
                    <div className="flex items-center gap-2 shrink-0 bg-[#0F172A] p-1.5 rounded-lg border border-[#1E293B]">
                      <select
                        value={currentState}
                        onChange={(e) => {
                          const newState = e.target.value as MusicState;
                          const stateInfo = musicStatesList.find((m) => m.id === newState);
                          onUpdateSceneMusic(scene.id, {
                            musicState: newState,
                            isSilence: newState === 'SILENCE',
                            intensity: stateInfo ? stateInfo.defaultIntensity : 0.15,
                            silenceReason: newState === 'SILENCE' ? 'تعديل يدوي من المخرج' : undefined,
                          });
                        }}
                        className="bg-[#162032] border border-[#1E293B] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#3AA9FF]"
                      >
                        {musicStatesList.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>

                      {!isSilence && (
                        <div className="flex items-center gap-1 text-[11px] font-mono-num text-slate-300 px-1">
                          <span>الشدة:</span>
                          <span className="text-[#3AA9FF] font-bold">{intensity}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: REUSABLE MUSIC FAMILIES */}
      {activeTab === 'families' && (
        <div className="p-4 space-y-4">
          <div className="text-xs text-slate-300">
            عائلات الموسيقى المعتمدة لعالم "الوارث": تُحفظ في مكتبة المشروع ويُعاد استخدامها عبر جميع الحلقات لضمان بقاء الحلقة 100 بنفس الهوية السمعية للحلقة 1:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {familiesList.map((fam) => {
              const asset = musicLibrary.find((m) => m.familyId === fam.id);
              const isPlayingThis = playingAssetId === asset?.id;

              return (
                <div
                  key={fam.id}
                  className="p-3.5 bg-[#0A0A0A] border border-[#1E293B] hover:border-[#3AA9FF]/40 rounded-xl space-y-2 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs text-white flex items-center gap-2">
                        <span>{fam.title}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#11233B] text-[#3AA9FF] font-mono-num">
                          {fam.state}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{fam.sub}</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {asset && (
                        <button
                          onClick={() => handlePlayAssetPreview(asset)}
                          className={`p-2 rounded-lg transition-all ${
                            isPlayingThis
                              ? 'bg-[#3AA9FF] text-black shadow-[0_0_10px_#3aa9ff]'
                              : 'bg-[#162032] text-slate-200 hover:text-white'
                          }`}
                          title="استماع للمقطوعة"
                        >
                          {isPlayingThis ? (
                            <Pause className="w-3.5 h-3.5 fill-black" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-slate-200" />
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => onRegenerateMusicFamily(fam.id)}
                        className="p-2 rounded-lg bg-[#162032] text-slate-400 hover:text-white"
                        title="إعادة توليد وتحديث هذه العائلة الموسيقية"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 flex items-center justify-between border-t border-[#1E293B] pt-1.5">
                    <span>موتيف الوارث الخماسي (Unresolved)</span>
                    <span className="text-emerald-400">خلفية همسية لصوت الراوي</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: MUSIC DNA CONSTITUTION */}
      {activeTab === 'dna' && (
        <div className="p-4 space-y-4 text-xs">
          <div className="bg-[#0A0A0A] border border-[#1E293B] p-4 rounded-xl space-y-3">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#3AA9FF]" />
              <span>دستور AL WARITH MUSIC DNA الدائم</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300">
              <div className="space-y-1.5">
                <div className="font-semibold text-white">الهوية الجوهرية (Core Identity):</div>
                <p className="text-[11px] text-slate-400">
                  غموض نفسي سينمائي داكن، إحساس بوجود حقيقة قديمة محرمة تحت سطح عالم معاصر عادي، توتر داخلي بطيء الاحتراق.
                </p>
                <div className="font-semibold text-white pt-2">الآلات والأنسجة الصوتية:</div>
                <p className="text-[11px] text-slate-400">
                  درونات عميقة، أوتار تشيلو منخفضة، بيانو هادئ (Felt Piano)، نبضات صب-باس، رنين معدني خافت.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="font-semibold text-white">اللمسة المغربية الخفية:</div>
                <p className="text-[11px] text-slate-400">
                  تلوين مقامي تجريدي غير فلكلوري؛ يُحس لاشعورياً في تموج الدرون دون أن يطغى كلحن شرقي تقليدي.
                </p>
                <div className="font-semibold text-white pt-2">قواعد المنع الصارمة (Forbidden Elements):</div>
                <p className="text-[11px] text-rose-300">
                  ممنوع قطعياً: غناء، كورال، طبول ملحمية، نحاسيات بطولية، موسيقى صاخبة، أو فزعات رعب مفاجئة.
                </p>
              </div>
            </div>
          </div>

          {/* Mixing Parameters */}
          <div className="bg-[#0A0A0A] border border-[#1E293B] p-4 rounded-xl space-y-3">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#3AA9FF]" />
              <span>معايرات المكس التلقائي وخفض الصوت (Auto Ducking)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#94A3B8] mb-1">
                  مستوى صوت الموسيقى في الخلفية (Master Music Bed Level)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0.08}
                    max={0.35}
                    step={0.01}
                    value={musicConfig.masterMusicVolume}
                    onChange={(e) =>
                      onUpdateMusicConfig({ masterMusicVolume: parseFloat(e.target.value) })
                    }
                    className="w-full h-1 bg-[#1E293B] accent-[#3AA9FF]"
                  />
                  <span className="font-mono-num text-white font-bold w-12 text-left">
                    {Math.round(musicConfig.masterMusicVolume * 100)}%
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1">
                  عمق خفض الموسيقى أثناء حديث الراوي (Speech Ducking Depth)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0.4}
                    max={0.85}
                    step={0.05}
                    value={musicConfig.masterDuckingDepth}
                    onChange={(e) =>
                      onUpdateMusicConfig({ masterDuckingDepth: parseFloat(e.target.value) })
                    }
                    className="w-full h-1 bg-[#1E293B] accent-[#3AA9FF]"
                  />
                  <span className="font-mono-num text-white font-bold w-12 text-left">
                    {Math.round(musicConfig.masterDuckingDepth * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
