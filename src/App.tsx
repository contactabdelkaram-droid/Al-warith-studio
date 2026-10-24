import React, { useState, useEffect, useRef } from 'react';
import {
  getStoredEpisodes,
  saveStoredEpisodes,
  getActiveEpisodeId,
  setActiveEpisodeId,
  getStoredNarrator,
  saveStoredNarrator,
  getStoredDictionary,
  saveStoredDictionary,
  getStoredDarijaMode,
  setStoredDarijaMode,
  isWizardCompleted,
  setWizardCompleted,
  saveAudioToIDB,
  getAudioFromIDB,
  getStoredMusicConfig,
  saveStoredMusicConfig,
  getStoredMusicLibrary,
  saveStoredMusicLibrary,
  clearAllEpisodes,
  loadEnrichedMusicLibrary,
  getInitialEpisodes,
} from './utils/storage';
import { Sparkles, Plus, FileText, Trash2, FolderPlus } from 'lucide-react';
import {
  Episode,
  SceneChunk,
  NarratorProfile,
  PronunciationEntry,
  ScriptAnalysisResult,
  MusicTrackAsset,
  MusicFamilyId,
  AlWarithMusicDnaConfig,
  AudioMixMode,
} from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { EpisodeEditor } from './components/EpisodeEditor';
import { SceneList } from './components/SceneList';
import { NarratorWizard } from './components/NarratorWizard';
import { PronunciationLab } from './components/PronunciationLab';
import { TimelineView } from './components/TimelineView';
import { ExportModal } from './components/ExportModal';
import { PreflightModal } from './components/PreflightModal';
import { BottomPlayer } from './components/BottomPlayer';
import { MusicDirectorPanel } from './components/MusicDirectorPanel';
import { generateTTS, analyzeScript, analyzeEpisodeMusicDirector } from './utils/api';
import {
  getAudioContext,
  base64ToUint8Array,
  toArrayBuffer,
  concatenateWavFiles,
  formatTime,
} from './utils/audioUtils';
import { splitScriptIntoScenes } from './utils/chunker';
import {
  initializeAlWarithMusicLibrary,
  generateAlWarithMusicBed,
} from './utils/musicEngine';
import { directEpisodeMusic } from './utils/musicDirector';
import { mixSceneAudio } from './utils/audioMixer';

export default function App() {
  // Persistence state
  const [episodes, setEpisodes] = useState<Episode[]>(getStoredEpisodes);
  const [activeEpisodeIdState, setActiveEpisodeIdState] = useState<string>(getActiveEpisodeId);
  const [narrator, setNarrator] = useState<NarratorProfile>(getStoredNarrator);
  const [dictionary, setDictionary] = useState<PronunciationEntry[]>(getStoredDictionary);
  const [darijaMode, setDarijaModeState] = useState<boolean>(getStoredDarijaMode);

  // AL WARITH MUSIC DNA state
  const [musicLibrary, setMusicLibrary] = useState<MusicTrackAsset[]>(getStoredMusicLibrary);
  const [musicConfig, setMusicConfig] = useState<AlWarithMusicDnaConfig>(getStoredMusicConfig);
  const [mixMode, setMixMode] = useState<AudioMixMode>('final_mix');
  const [isDirectingMusic, setIsDirectingMusic] = useState<boolean>(false);
  const [isProducingEpisode, setIsProducingEpisode] = useState<boolean>(false);
  const [produceStepText, setProduceStepText] = useState<string>('');

  // Active view tab & part
  const [activeTab, setActiveTab] = useState<string>('editor');
  const [selectedPart, setSelectedPart] = useState<number>(1);

  // Script analysis state
  const [scriptAnalysis, setScriptAnalysis] = useState<ScriptAnalysisResult | null>(null);
  const [isCheckingScript, setIsCheckingScript] = useState<boolean>(false);
  const [hasCheckedScript, setHasCheckedScript] = useState<boolean>(false);

  // Modals state
  const [showNarratorWizard, setShowNarratorWizard] = useState<boolean>(!isWizardCompleted());
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showPreflightModal, setShowPreflightModal] = useState<boolean>(false);

  // Audio Playback Engine
  const [currentPlayingSceneId, setCurrentPlayingSceneId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isFullEpisodePlaying, setIsFullEpisodePlaying] = useState<boolean>(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState<boolean>(false);

  const activeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Current active episode
  const activeEpisode =
    episodes.find((ep) => ep.id === activeEpisodeIdState) || episodes[0] || null;

  // Sync selected Part with active episode
  useEffect(() => {
    if (activeEpisode && activeEpisode.partNumber !== selectedPart) {
      setSelectedPart(activeEpisode.partNumber);
    }
  }, [activeEpisodeIdState]);

  // Initialize Music Library if empty on first launch
  useEffect(() => {
    async function setupMusic() {
      try {
        const enriched = await loadEnrichedMusicLibrary();
        if (enriched.length > 0) {
          setMusicLibrary(enriched);
        } else {
          const library = await initializeAlWarithMusicLibrary();
          setMusicLibrary(library);
          await saveStoredMusicLibrary(library);
        }
      } catch (e) {
        console.warn('Failed to initialize music library', e);
      }
    }
    setupMusic();
  }, []);

  // Ensure scenes have music assignments without cyclic re-rendering
  useEffect(() => {
    if (activeEpisode && activeEpisode.scenes.length > 0 && musicLibrary.length > 0) {
      const needsMusic = activeEpisode.scenes.some((s) => !s.music);
      if (needsMusic) {
        const directed = directEpisodeMusic(activeEpisode.scenes, musicLibrary);
        const newEpisodes = episodes.map((ep) =>
          ep.id === activeEpisode.id ? { ...ep, scenes: directed } : ep
        );
        updateEpisodesState(newEpisodes);
      }
    }
  }, [musicLibrary.length, activeEpisode?.id]);

  // Load audio from IndexedDB on initial mount
  useEffect(() => {
    async function loadAudioFromDb() {
      let changed = false;
      const updatedEpisodes = await Promise.all(
        episodes.map(async (ep) => {
          const updatedScenes = await Promise.all(
            ep.scenes.map(async (scene) => {
              if (scene.audioBase64 === 'indexeddb_stored') {
                const storedBase64 = await getAudioFromIDB(scene.id);
                if (storedBase64) {
                  changed = true;
                  return { ...scene, audioBase64: storedBase64 };
                }
              }
              return scene;
            })
          );
          return { ...ep, scenes: updatedScenes };
        })
      );
      if (changed) {
        setEpisodes(updatedEpisodes);
      }
    }
    loadAudioFromDb();
  }, []);

  // Save changes to storage
  const updateEpisodesState = (newEpisodes: Episode[]) => {
    setEpisodes(newEpisodes);
    saveStoredEpisodes(newEpisodes);
  };

  const handleUpdateActiveEpisode = (updated: Partial<Episode>) => {
    if (!activeEpisode) return;
    const newEpisodes = episodes.map((ep) => {
      if (ep.id === activeEpisode.id) {
        return { ...ep, ...updated, updatedAt: new Date().toISOString() };
      }
      return ep;
    });
    updateEpisodesState(newEpisodes);
  };

  const handleUpdateScene = (sceneId: string, updated: Partial<SceneChunk>) => {
    if (!activeEpisode) return;
    const newScenes = activeEpisode.scenes.map((s) => {
      if (s.id === sceneId) {
        return { ...s, ...updated };
      }
      return s;
    });
    handleUpdateActiveEpisode({ scenes: newScenes });
  };

  const handleUpdateSceneMusic = (
    sceneId: string,
    musicUpdate: Partial<SceneChunk['music']>
  ) => {
    if (!activeEpisode) return;
    const newScenes = activeEpisode.scenes.map((s) => {
      if (s.id === sceneId && s.music) {
        return { ...s, music: { ...s.music, ...musicUpdate } };
      }
      return s;
    });
    handleUpdateActiveEpisode({ scenes: newScenes });
  };

  const handleCreateNewEpisode = () => {
    const partNum = selectedPart;
    const partName = `الجزء ${
      partNum === 1
        ? 'الأول'
        : partNum === 2
        ? 'الثاني'
        : partNum === 3
        ? 'الثالث'
        : partNum === 4
        ? 'الرابع'
        : partNum === 5
        ? 'الخامس'
        : partNum === 6
        ? 'السادس'
        : 'السابع'
    }`;
    const nextEpNum = (
      episodes.filter((e) => e.partNumber === partNum).length + 1
    )
      .toString()
      .padStart(2, '0');

    const defaultScript = `[موسيقى غامضة]
كانت البداية فطنجة، ملي سمعت صوت الخطوات ورايا فالزنقة الضيقة.
وقفت وشفت فالساعة:
05:17
[صمت]
لقيناه.`;

    const rawScenes = splitScriptIntoScenes(defaultScript);
    const directedScenes = directEpisodeMusic(rawScenes, musicLibrary);

    const newEp: Episode = {
      id: `ep_alwarith_p${partNum}_e${nextEpNum}_${Date.now()}`,
      series: 'الوارث',
      part: partName,
      partNumber: partNum,
      chapter: 'الباب الأول',
      chapterNumber: 1,
      episodeNumber: nextEpNum,
      title: `حلقة جديدة ${nextEpNum}`,
      targetWordCount: 2699,
      originalScript: defaultScript,
      scenes: directedScenes,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newEpisodes = [newEp, ...episodes];
    updateEpisodesState(newEpisodes);
    setActiveEpisodeIdState(newEp.id);
    setActiveEpisodeId(newEp.id);
    setActiveTab('editor');
  };

  const handleDeleteEpisode = (id: string) => {
    const newEpisodes = episodes.filter((ep) => ep.id !== id);
    updateEpisodesState(newEpisodes);
    if (activeEpisodeIdState === id) {
      const nextId = newEpisodes[0]?.id || '';
      setActiveEpisodeIdState(nextId);
      setActiveEpisodeId(nextId);
    }
  };

  const handleClearAllEpisodes = () => {
    clearAllEpisodes();
    setEpisodes([]);
    setActiveEpisodeIdState('');
    setActiveEpisodeId('');
  };

  const handleLoadSampleEpisode = () => {
    const initial = getInitialEpisodes();
    const directed = directEpisodeMusic(initial[0].scenes, musicLibrary);
    const epWithMusic = { ...initial[0], scenes: directed };
    const newEpisodes = [epWithMusic];
    updateEpisodesState(newEpisodes);
    setActiveEpisodeIdState(epWithMusic.id);
    setActiveEpisodeId(epWithMusic.id);
    setActiveTab('editor');
  };

  const handleToggleDarijaMode = (enabled: boolean) => {
    setDarijaModeState(enabled);
    setStoredDarijaMode(enabled);
  };

  const handleSaveNarrator = (updatedNarrator: NarratorProfile) => {
    setNarrator(updatedNarrator);
    saveStoredNarrator(updatedNarrator);
    setWizardCompleted(true);
  };

  // Pronunciation Dictionary Handlers
  const handleAddPronunciation = (
    term: string,
    guide: string,
    category: PronunciationEntry['category'] = 'term'
  ) => {
    const existingIndex = dictionary.findIndex((d) => d.term === term);
    let updated: PronunciationEntry[];
    if (existingIndex >= 0) {
      updated = dictionary.map((d, i) =>
        i === existingIndex ? { ...d, pronunciationGuide: guide, category } : d
      );
    } else {
      const newEntry: PronunciationEntry = {
        id: `dict_${Date.now()}`,
        term,
        pronunciationGuide: guide,
        category,
        note: 'تمت إضافتها من فحص النص',
      };
      updated = [newEntry, ...dictionary];
    }
    setDictionary(updated);
    saveStoredDictionary(updated);
  };

  const handleUpdateDictEntry = (id: string, updated: Partial<PronunciationEntry>) => {
    const newDict = dictionary.map((d) => (d.id === id ? { ...d, ...updated } : d));
    setDictionary(newDict);
    saveStoredDictionary(newDict);
  };

  const handleDeleteDictEntry = (id: string) => {
    const newDict = dictionary.filter((d) => d.id !== id);
    setDictionary(newDict);
    saveStoredDictionary(newDict);
  };

  // CHECK SCRIPT action (Requirement 8)
  const handleCheckScript = async () => {
    if (!activeEpisode || !activeEpisode.originalScript) return;
    try {
      setIsCheckingScript(true);
      const res = await analyzeScript(activeEpisode.originalScript, dictionary);
      setScriptAnalysis(res);
      setHasCheckedScript(true);
      setActiveTab('editor');
    } catch (err: any) {
      console.error('Script analysis error', err);
      alert('تعذر فحص النص: ' + (err?.message || 'خطأ غير متوقع'));
    } finally {
      setIsCheckingScript(false);
    }
  };

  // Stop Web Audio
  const stopAudio = () => {
    if (activeAudioSourceRef.current) {
      try {
        activeAudioSourceRef.current.stop();
      } catch (e) {}
      activeAudioSourceRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsPlaying(false);
    setCurrentPlayingSceneId(null);
    setCurrentTime(0);
  };

  // Play scene audio according to mixMode (Final Mix, Voice Only, Music Only)
  const handlePlayScene = async (sceneId: string) => {
    const scene = activeEpisode?.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    // Pick audio based on mixMode
    let audioToPlay: string | undefined = undefined;
    if (mixMode === 'voice_only') {
      audioToPlay = scene.audioBase64;
    } else if (mixMode === 'music_only') {
      if (scene.music && !scene.music.isSilence) {
        audioToPlay = scene.music.audioBase64;
      }
    } else {
      // final_mix
      audioToPlay = scene.music?.mixedAudioBase64 || scene.audioBase64;
    }

    if (!audioToPlay) {
      if (mixMode === 'music_only' && scene.music?.isSilence) {
        // Scene has intentional silence
        return;
      }
      if (!scene.audioBase64) return;
      audioToPlay = scene.audioBase64;
    }

    stopAudio();

    try {
      const ctx = getAudioContext();
      const bytes = base64ToUint8Array(audioToPlay);
      const ab = toArrayBuffer(bytes);
      const audioBuffer = await ctx.decodeAudioData(ab);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const gainNode = ctx.createGain();
      gainNode.gain.value = volume;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      const bufferDuration = audioBuffer.duration;
      setDuration(bufferDuration);
      setCurrentPlayingSceneId(sceneId);
      setIsPlaying(true);
      playbackStartTimeRef.current = ctx.currentTime;

      source.onended = () => {
        setIsPlaying(false);
        setCurrentPlayingSceneId(null);
        setCurrentTime(0);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }

        // If continuous episode playback is active, trigger next scene
        if (isFullEpisodePlaying) {
          playNextInQueue(sceneId);
        }
      };

      source.start();
      activeAudioSourceRef.current = source;

      // Update scrub bar ticker
      const updateTicker = () => {
        const elapsed = ctx.currentTime - playbackStartTimeRef.current;
        if (elapsed <= bufferDuration) {
          setCurrentTime(elapsed);
          animationFrameRef.current = requestAnimationFrame(updateTicker);
        } else {
          setCurrentTime(bufferDuration);
        }
      };
      animationFrameRef.current = requestAnimationFrame(updateTicker);
    } catch (err) {
      console.error('Audio playback error', err);
    }
  };

  // Continuous queue playback for Full Episode
  const playNextInQueue = (currentId: string) => {
    if (!activeEpisode) return;
    const readyScenes = activeEpisode.scenes.filter((s) => s.audioBase64);
    const currentIndex = readyScenes.findIndex((s) => s.id === currentId);
    if (currentIndex >= 0 && currentIndex < readyScenes.length - 1) {
      const nextScene = readyScenes[currentIndex + 1];
      setTimeout(() => {
        handlePlayScene(nextScene.id);
      }, 700); // Dramatic breath pause between scenes
    } else {
      setIsFullEpisodePlaying(false);
    }
  };

  const handlePlayFullEpisode = () => {
    if (!activeEpisode) return;
    const readyScenes = activeEpisode.scenes.filter((s) => s.audioBase64);
    if (readyScenes.length === 0) {
      alert('لا توجد مقاطع صوتية جاهزة للتشغيل. يرجى إنتاج الحلقة أولاً.');
      return;
    }

    if (isFullEpisodePlaying) {
      stopAudio();
      setIsFullEpisodePlaying(false);
    } else {
      setIsFullEpisodePlaying(true);
      handlePlayScene(readyScenes[0].id);
    }
  };

  // Generate TTS and Automatic Mix for a single scene
  const handleGenerateScene = async (sceneId: string) => {
    const scene = activeEpisode?.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    handleUpdateScene(sceneId, { status: 'generating', errorMessage: undefined });

    try {
      // 1. Generate Voice Narration in Moroccan Darija
      const res = await generateTTS({
        text: scene.rawText,
        voiceName: narrator.voiceName,
        preset: scene.preset,
        pace: scene.controls.pace,
        darijaMode,
      });

      await saveAudioToIDB(scene.id, res.audioBase64);
      const bytes = base64ToUint8Array(res.audioBase64);
      const estDuration = bytes.byteLength / (24000 * 2);

      // 2. Mix with assigned background underscore if music exists
      let mixedAudioBase64 = res.audioBase64;
      if (scene.music && !scene.music.isSilence && scene.music.audioBase64) {
        const mixRes = await mixSceneAudio(
          res.audioBase64,
          scene.music.audioBase64,
          scene.music.intensity,
          scene.music.duckingDepth || musicConfig.masterDuckingDepth,
          false
        );
        mixedAudioBase64 = mixRes.mixedBase64;
      }

      handleUpdateScene(sceneId, {
        status: 'ready',
        audioBase64: res.audioBase64,
        duration: estDuration,
        music: scene.music ? { ...scene.music, mixedAudioBase64 } : undefined,
      });
    } catch (err: any) {
      console.error(`Error generating scene ${scene.sceneNumber}:`, err);
      handleUpdateScene(sceneId, {
        status: 'error',
        errorMessage: err?.message || 'فشل التوليد',
      });
    }
  };

  // Regenerate selection for a single sentence or error (Requirement 12)
  const handleRegenerateSelection = async (sceneId: string, selectionText: string) => {
    const scene = activeEpisode?.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    handleUpdateScene(sceneId, { status: 'generating' });

    try {
      const res = await generateTTS({
        text: selectionText,
        voiceName: narrator.voiceName,
        preset: scene.preset,
        pace: scene.controls.pace,
        darijaMode,
      });

      await saveAudioToIDB(scene.id, res.audioBase64);
      const bytes = base64ToUint8Array(res.audioBase64);
      const estDuration = bytes.byteLength / (24000 * 2);

      let mixedAudioBase64 = res.audioBase64;
      if (scene.music && !scene.music.isSilence && scene.music.audioBase64) {
        const mixRes = await mixSceneAudio(
          res.audioBase64,
          scene.music.audioBase64,
          scene.music.intensity,
          scene.music.duckingDepth || musicConfig.masterDuckingDepth,
          false
        );
        mixedAudioBase64 = mixRes.mixedBase64;
      }

      handleUpdateScene(sceneId, {
        status: 'ready',
        audioBase64: res.audioBase64,
        duration: estDuration,
        music: scene.music ? { ...scene.music, mixedAudioBase64 } : undefined,
      });
    } catch (err: any) {
      console.error('Error regenerating selection', err);
      handleUpdateScene(sceneId, {
        status: 'error',
        errorMessage: err?.message || 'فشل تصحيح النطق',
      });
    }
  };

  // Generate All Scenes Voice Narration
  const handleGenerateAll = async () => {
    if (!activeEpisode || activeEpisode.scenes.length === 0) return;
    setIsGeneratingAll(true);
    handleUpdateActiveEpisode({ status: 'voice_generating' });

    for (const scene of activeEpisode.scenes) {
      if (scene.isLocked && scene.audioBase64) continue;
      await handleGenerateScene(scene.id);
    }

    setIsGeneratingAll(false);
    handleUpdateActiveEpisode({ status: 'voice_review' });
  };

  // THE 1-CLICK COMPLETE WORKFLOW: "PRODUCE EPISODE" (Requirements 1-10)
  const handleProduceEpisode = async () => {
    if (!activeEpisode || !activeEpisode.originalScript) return;
    try {
      setIsProducingEpisode(true);

      // 1. Ensure scenes are split
      setProduceStepText('1/5: تقسيم المشاهد الذكي...');
      let currentScenes = activeEpisode.scenes;
      if (!currentScenes || currentScenes.length === 0) {
        currentScenes = splitScriptIntoScenes(activeEpisode.originalScript);
      }

      // 2. Ensure music library is ready
      setProduceStepText('2/5: استرجاع عائلات موسيقى الوارث...');
      let library = musicLibrary;
      if (!library || library.length === 0) {
        library = await initializeAlWarithMusicLibrary();
        setMusicLibrary(library);
        saveStoredMusicLibrary(library);
      }

      // 3. Automatic Music Director Analysis
      setProduceStepText('3/5: تحليل الحالات الموسيقية ومواضع الصمت...');
      let directedScenes = directEpisodeMusic(currentScenes, library);
      try {
        // Enhance with server AI Director analysis
        const aiDir = await analyzeEpisodeMusicDirector(currentScenes);
        if (aiDir?.sceneDirectives && Array.isArray(aiDir.sceneDirectives)) {
          directedScenes = directedScenes.map((sc, i) => {
            const dir = aiDir.sceneDirectives.find((d: any) => d.sceneNumber === sc.sceneNumber);
            if (dir && sc.music) {
              const matchedAsset =
                library.find((m) => m.familyId === dir.familyId) ||
                library.find((m) => m.musicState === dir.music_state) ||
                sc.music.audioBase64;
              return {
                ...sc,
                music: {
                  ...sc.music,
                  musicState: dir.music_state || sc.music.musicState,
                  familyId: dir.familyId || sc.music.familyId,
                  intensity: dir.intensity ?? sc.music.intensity,
                  isSilence: dir.isSilence ?? sc.music.isSilence,
                  silenceReason: dir.silenceReason || sc.music.silenceReason,
                  audioBase64: typeof matchedAsset === 'string' ? matchedAsset : matchedAsset?.audioBase64,
                },
              };
            }
            return sc;
          });
        }
      } catch (aiErr) {
        console.warn('AI music director fallback to deterministic engine', aiErr);
      }

      // 4. Generate Moroccan Darija narration for all scenes
      setProduceStepText('4/5: توليد التعليق الصوتي بالدارجة المغربية...');
      const completedScenes: SceneChunk[] = [];

      for (const scene of directedScenes) {
        let voiceBase64 = scene.audioBase64;

        if (!voiceBase64 || voiceBase64 === 'indexeddb_stored') {
          const ttsRes = await generateTTS({
            text: scene.rawText,
            voiceName: narrator.voiceName,
            preset: scene.preset,
            pace: scene.controls.pace,
            darijaMode,
          });
          voiceBase64 = ttsRes.audioBase64;
          await saveAudioToIDB(scene.id, voiceBase64);
        }

        const bytes = base64ToUint8Array(voiceBase64);
        const estDuration = bytes.byteLength / (24000 * 2);

        // 5. Automatic Mixing with Volume Ducking
        let mixedAudioBase64 = voiceBase64;
        if (scene.music && !scene.music.isSilence && scene.music.audioBase64) {
          const mixRes = await mixSceneAudio(
            voiceBase64,
            scene.music.audioBase64,
            scene.music.intensity,
            scene.music.duckingDepth || musicConfig.masterDuckingDepth,
            false
          );
          mixedAudioBase64 = mixRes.mixedBase64;
        }

        completedScenes.push({
          ...scene,
          status: 'ready',
          audioBase64: voiceBase64,
          duration: estDuration,
          music: scene.music ? { ...scene.music, mixedAudioBase64 } : undefined,
        });
      }

      setProduceStepText('5/5: اعتماد المكس الإذاعي للحلقة...');
      handleUpdateActiveEpisode({
        scenes: completedScenes,
        status: 'voice_review',
      });

      // Automatically play first scene on completion in Final Mix mode
      if (completedScenes.length > 0) {
        handlePlayScene(completedScenes[0].id);
      }
    } catch (err: any) {
      console.error('Error in produce episode', err);
      alert('خطأ أثناء الإنتاج التلقائي للحلقة: ' + (err?.message || 'خطأ غير معروف'));
    } finally {
      setIsProducingEpisode(false);
      setProduceStepText('');
    }
  };

  // Re-run Automatic Music Director across scenes
  const handleAutoDirectAllScenes = async () => {
    if (!activeEpisode || activeEpisode.scenes.length === 0) return;
    setIsDirectingMusic(true);
    try {
      const directed = directEpisodeMusic(activeEpisode.scenes, musicLibrary);
      handleUpdateActiveEpisode({ scenes: directed });
    } catch (e) {
      console.error('Auto direction failed', e);
    } finally {
      setIsDirectingMusic(false);
    }
  };

  // Regenerate a single music family
  const handleRegenerateMusicFamily = async (familyId: MusicFamilyId) => {
    try {
      const target = musicLibrary.find((m) => m.familyId === familyId);
      const { audioBase64, duration } = await generateAlWarithMusicBed({
        durationSec: target?.duration || 35,
        familyId,
        musicState: target?.musicState || 'MYSTERY',
        intensity: 0.2,
        includeMotif: true,
        isClockSignature: familyId === 'SIGNATURE_0517',
      });

      const updatedLibrary = musicLibrary.map((m) =>
        m.familyId === familyId ? { ...m, audioBase64, duration } : m
      );
      setMusicLibrary(updatedLibrary);
      saveStoredMusicLibrary(updatedLibrary);
    } catch (e: any) {
      alert('تعذر تجديد العائلة الموسيقية: ' + e?.message);
    }
  };

  // Reordering scenes in timeline
  const handleMoveScene = (index: number, direction: 'up' | 'down') => {
    if (!activeEpisode) return;
    const scenes = [...activeEpisode.scenes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= scenes.length) return;

    const temp = scenes[index];
    scenes[index] = scenes[targetIndex];
    scenes[targetIndex] = temp;

    const reindexed = scenes.map((s, i) => ({ ...s, sceneNumber: i + 1 }));
    handleUpdateActiveEpisode({ scenes: reindexed });
  };

  // Active playing scene
  const activePlayingScene =
    activeEpisode?.scenes.find((s) => s.id === currentPlayingSceneId) || null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EAEAEA] flex flex-col font-sans selection:bg-[#3AA9FF]/30 selection:text-white">
      {/* Studio Header */}
      <Header
        episode={activeEpisode}
        narrator={narrator}
        darijaMode={darijaMode}
        onToggleDarijaMode={handleToggleDarijaMode}
        onOpenNarratorWizard={() => setShowNarratorWizard(true)}
        onOpenPreflight={() => setShowPreflightModal(true)}
        onOpenExport={() => setShowExportModal(true)}
        onCheckScript={handleCheckScript}
        isGeneratingAll={isGeneratingAll}
        isCheckingScript={isCheckingScript}
        onProduceEpisode={handleProduceEpisode}
        isProducingEpisode={isProducingEpisode}
        produceStepText={produceStepText}
        onSelectTab={setActiveTab}
        activeTab={activeTab}
        onCreateNewEpisode={handleCreateNewEpisode}
      />

      {/* Main Studio Body: Sidebar + Main Workstation Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          episodes={episodes}
          activeEpisodeId={activeEpisodeIdState}
          onSelectEpisode={(id) => {
            setActiveEpisodeIdState(id);
            setActiveEpisodeId(id);
            stopAudio();
          }}
          onCreateNewEpisode={handleCreateNewEpisode}
          onDeleteEpisode={handleDeleteEpisode}
          onClearAllEpisodes={handleClearAllEpisodes}
          selectedPart={selectedPart}
          onSelectPart={setSelectedPart}
        />

        {/* Center / Right Content Panel */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-28 max-w-[1440px] mx-auto w-full space-y-6">
          {/* TAB 1: Main Episode Editor & Scene Chunks */}
          {activeTab === 'editor' && (
            activeEpisode ? (
              <div className="space-y-6">
                {/* Episode Script & Cues Editor */}
                <EpisodeEditor
                  episode={activeEpisode}
                  onUpdateEpisode={handleUpdateActiveEpisode}
                  analysis={scriptAnalysis}
                  isCheckingScript={isCheckingScript}
                  onCheckScript={handleCheckScript}
                  onAddPronunciation={handleAddPronunciation}
                  dictionary={dictionary}
                />

                {/* Scene Chunks Audio Workstation */}
                <SceneList
                  scenes={activeEpisode.scenes}
                  onUpdateScene={handleUpdateScene}
                  onGenerateScene={handleGenerateScene}
                  onRegenerateSelection={handleRegenerateSelection}
                  narrator={narrator}
                  currentPlayingSceneId={currentPlayingSceneId}
                  onPlayScene={handlePlayScene}
                  onPauseScene={stopAudio}
                  isPlaying={isPlaying}
                />
              </div>
            ) : (
              /* Atmospheric Empty State (Prompt: "احدف جميع الحلقات") */
              <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-8 md:p-14 text-center max-w-2xl mx-auto my-8 space-y-6 shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-[#11233B] border border-[#3AA9FF]/40 flex items-center justify-center mx-auto text-[#3AA9FF] shadow-[0_0_25px_rgba(58,169,255,0.25)]">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-extrabold text-white tracking-wide">
                    استوديو الوارث الصوتي (AL WARITH VOICE STUDIO)
                  </h2>
                  <p className="text-xs md:text-sm text-[#94A3B8] leading-relaxed max-w-lg mx-auto">
                    تم مسح جميع الحلقات السابقة بنجاح. يمكنك الآن البدء من نقطة الصفر بإنشاء حلقة جديدة، أو تحميل نص تجريبي نموذجي لرواية "الوارث" بالدارجة المغربية.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleCreateNewEpisode}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#3AA9FF] to-[#2563EB] hover:from-[#60BAFF] hover:to-[#3B82F6] text-black font-extrabold text-xs shadow-[0_0_20px_rgba(58,169,255,0.35)] transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إنشاء حلقة جديدة الآن (Create Episode)</span>
                  </button>
                  <button
                    onClick={handleLoadSampleEpisode}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#162032] hover:bg-[#1E293B] border border-slate-700 text-slate-200 text-xs font-semibold transition-all"
                  >
                    <FileText className="w-4 h-4 text-[#3AA9FF]" />
                    <span>تحميل نموذج تجريبي (لقيناه 05:17)</span>
                  </button>
                </div>
              </div>
            )
          )}

          {/* TAB 2: Master Narrator Setup */}
          {activeTab === 'narrator' && (
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>هوية راوي "الوارث" الدائمة (Master Narrator Profile)</span>
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    الحفاظ على نفس طبقة الصوت والإيقاع عبر جميع الحلقات والأجزاء لتجنب تشتت المستمع.
                  </p>
                </div>
                <button
                  onClick={() => setShowNarratorWizard(true)}
                  className="px-4 py-2 rounded-lg bg-[#3AA9FF] text-black font-bold text-xs hover:bg-[#60BAFF]"
                >
                  إعادة تشغيل معالج الضبط (Setup Wizard)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-[#0A0A0A] border border-[#1E293B] rounded-xl">
                  <div className="text-[10px] text-[#94A3B8]">الصوت المعتمد</div>
                  <div className="text-sm font-bold text-[#3AA9FF] mt-1">{narrator.voiceName}</div>
                  <div className="text-xs text-slate-400 mt-1">{narrator.description}</div>
                </div>
                <div className="p-4 bg-[#0A0A0A] border border-[#1E293B] rounded-xl">
                  <div className="text-[10px] text-[#94A3B8]">إيقاع السرد الأساسي</div>
                  <div className="text-sm font-bold text-white mt-1">
                    {narrator.pace === 'medium_slow' ? 'متوسط يميل للبطء (0.95x)' : narrator.pace}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    إلقاء طبيعي ومريح مع تباطؤ في لحظات الاكتشاف.
                  </div>
                </div>
                <div className="p-4 bg-[#0A0A0A] border border-[#1E293B] rounded-xl">
                  <div className="text-[10px] text-[#94A3B8]">وضع الدارجة المغربية</div>
                  <div className="text-sm font-bold text-emerald-400 mt-1">
                    {darijaMode ? 'مفعل (Preserve Darija)' : 'معطل'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    يمنع تحويل الكلمات للفصحى ويحافظ على النطق المغربي الأصيل.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AL WARITH MUSIC DNA & MUSIC DIRECTOR PANEL */}
          {activeTab === 'music' && (
            <MusicDirectorPanel
              scenes={activeEpisode?.scenes || []}
              onUpdateSceneMusic={handleUpdateSceneMusic}
              musicLibrary={musicLibrary}
              onRegenerateMusicFamily={handleRegenerateMusicFamily}
              musicConfig={musicConfig}
              onUpdateMusicConfig={(cfg) => {
                const updated = { ...musicConfig, ...cfg };
                setMusicConfig(updated);
                saveStoredMusicConfig(updated);
              }}
              onAutoDirectAllScenes={handleAutoDirectAllScenes}
              isDirecting={isDirectingMusic}
            />
          )}

          {/* TAB 4: Pronunciation Dictionary & Lab */}
          {activeTab === 'pronunciation' && (
            <PronunciationLab
              dictionary={dictionary}
              onAddEntry={(entry) =>
                handleAddPronunciation(entry.term, entry.pronunciationGuide, entry.category)
              }
              onUpdateEntry={handleUpdateDictEntry}
              onDeleteEntry={handleDeleteDictEntry}
              narrator={narrator}
            />
          )}

          {/* TAB 5: Audio Timeline */}
          {activeTab === 'timeline' && (
            activeEpisode ? (
              <TimelineView
                scenes={activeEpisode.scenes}
                onPlayScene={handlePlayScene}
                onPauseScene={stopAudio}
                currentPlayingSceneId={currentPlayingSceneId}
                isPlaying={isPlaying}
                onUpdateScene={handleUpdateScene}
                onGenerateScene={handleGenerateScene}
                onMoveScene={handleMoveScene}
                onPlayFullEpisode={handlePlayFullEpisode}
                isFullEpisodePlaying={isFullEpisodePlaying}
              />
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-[#1E293B] rounded-xl">
                لا توجد حلقة لعرض التايم لاين. قم بإنشاء حلقة جديدة أولاً.
              </div>
            )
          )}

          {/* TAB 6: Export Suite */}
          {activeTab === 'exports' && (
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-white">تصدير المواد الصوتية للمونتاج والنشر</h2>
              <p className="text-xs text-[#94A3B8]">
                جميع خيارات التصدير متاحة: المكس النهائي (FINAL MIX)، الصوت النقي للراوي (VOICE ONLY)، والموسيقى المعزولة (MUSIC ONLY).
              </p>
              <button
                onClick={() => setShowExportModal(true)}
                disabled={!activeEpisode}
                className="px-5 py-2.5 rounded-lg bg-[#3AA9FF] text-black font-bold text-xs hover:bg-[#60BAFF] shadow-md disabled:opacity-40"
              >
                فتح نافذة التصدير الشاملة (Export Suite)
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Sticky Master Audio Player with Mix Mode 3-way toggle */}
      <BottomPlayer
        currentScene={activePlayingScene}
        isPlaying={isPlaying}
        onPlayPause={() => {
          if (isPlaying) {
            stopAudio();
          } else if (activeEpisode) {
            const firstReady = activeEpisode.scenes.find((s) => s.audioBase64);
            if (firstReady) handlePlayScene(firstReady.id);
          }
        }}
        onNextScene={() => {
          if (!activeEpisode || !currentPlayingSceneId) return;
          const ready = activeEpisode.scenes.filter((s) => s.audioBase64);
          const idx = ready.findIndex((s) => s.id === currentPlayingSceneId);
          if (idx >= 0 && idx < ready.length - 1) {
            handlePlayScene(ready[idx + 1].id);
          }
        }}
        onPrevScene={() => {
          if (!activeEpisode || !currentPlayingSceneId) return;
          const ready = activeEpisode.scenes.filter((s) => s.audioBase64);
          const idx = ready.findIndex((s) => s.id === currentPlayingSceneId);
          if (idx > 0) {
            handlePlayScene(ready[idx - 1].id);
          }
        }}
        currentTime={currentTime}
        duration={duration}
        onSeek={(sec) => {
          // Seek placeholder
        }}
        narrator={narrator}
        volume={volume}
        onVolumeChange={setVolume}
        allScenes={activeEpisode ? activeEpisode.scenes : []}
        isFullEpisodePlaying={isFullEpisodePlaying}
        mixMode={mixMode}
        onMixModeChange={setMixMode}
      />

      {/* Master Narrator Setup Wizard Modal */}
      {showNarratorWizard && (
        <NarratorWizard
          currentNarrator={narrator}
          onSaveNarrator={handleSaveNarrator}
          onClose={() => setShowNarratorWizard(false)}
          isInitialSetup={!isWizardCompleted()}
        />
      )}

      {/* Pre-flight Safety Modal */}
      {showPreflightModal && activeEpisode && (
        <PreflightModal
          episode={activeEpisode}
          narrator={narrator}
          darijaMode={darijaMode}
          dictionary={dictionary}
          hasCheckedScript={hasCheckedScript}
          onConfirmGenerate={handleGenerateAll}
          onClose={() => setShowPreflightModal(false)}
        />
      )}

      {/* Export Modal with 3-Mode Support */}
      {showExportModal && activeEpisode && (
        <ExportModal
          episode={activeEpisode}
          dictionary={dictionary}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
