export type ScenePreset =
  | 'normal'
  | 'mystery'
  | 'tension'
  | 'whispered_tension'
  | 'emotional'
  | 'urgent'
  | 'revelation'
  | 'dialogue';

export interface SceneControls {
  pace: 'slow' | 'medium_slow' | 'medium' | 'fast';
  tone: 'deep_calm' | 'dark_mystery' | 'reflective' | 'intense';
  energy: 'low_controlled' | 'medium' | 'high';
  pauseIntensity: 'subtle' | 'cinematic' | 'extended';
}

export type MusicState =
  | 'MYSTERY'
  | 'TENSION'
  | 'MEMORY'
  | 'REVELATION'
  | 'DANGER'
  | 'SILENCE';

export type MusicFamilyId =
  | 'MAIN_THEME'
  | 'MYSTERY_BED'
  | 'TENSION_BED'
  | 'MEMORY_BED'
  | 'REVELATION_BED'
  | 'DANGER_BED'
  | 'SIGNATURE_0517';

export interface SceneMusicAssignment {
  musicState: MusicState;
  familyId: MusicFamilyId;
  intensity: number; // 0.10 to 0.45 (0 for silence)
  fadeInSec: number;
  fadeOutSec: number;
  continueFromPrevious: boolean;
  isSilence: boolean;
  silenceReason?: string; // e.g. "Important line: لقيناه"
  duckingDepth: number; // default 0.65
  audioBase64?: string; // audio bed for this scene
  mixedAudioBase64?: string; // final blended mix (narration + ducked music)
}

export interface MusicTrackAsset {
  id: string;
  familyId: MusicFamilyId;
  name: string; // e.g. "AL WARITH MAIN THEME"
  description: string;
  musicState: MusicState;
  audioBase64: string;
  duration: number; // in seconds
  motifVersion: string; // "5-note unresolved"
  isApproved: boolean;
  createdAt: string;
}

export interface AlWarithMusicDnaConfig {
  enabled: boolean;
  masterMusicVolume: number; // default 0.22 (subtle background underscore)
  masterDuckingDepth: number; // default 0.65 (65% volume reduction during speech)
  crossfadeSec: number; // default 2.0s
  preserveMotif: boolean; // 5-note motif
  subtleMoroccanInfluence: boolean; // microtonal drone texture
  autoSilenceImportantLines: boolean; // true
}

export type AudioMixMode = 'final_mix' | 'voice_only' | 'music_only';

export interface SceneChunk {
  id: string;
  sceneNumber: number;
  title?: string;
  rawText: string;
  cleanText: string;
  cues: string[];
  audioBase64?: string;
  duration?: number; // in seconds
  status: 'idle' | 'generating' | 'ready' | 'error';
  errorMessage?: string;
  isLocked: boolean;
  preset: ScenePreset;
  controls: SceneControls;
  hasCustomPronunciation?: boolean;
  music?: SceneMusicAssignment;
}

export type EpisodeStatus =
  | 'draft'
  | 'script_approved'
  | 'voice_generating'
  | 'voice_review'
  | 'voice_approved'
  | 'edited'
  | 'published';

export interface Episode {
  id: string;
  series: string; // 'الوارث'
  part: string; // 'الجزء الأول'
  partNumber: number; // 1
  chapter: string; // 'الباب الأول'
  chapterNumber: number; // 1
  episodeNumber: string; // '02'
  title: string; // 'لقيناه'
  targetWordCount: number; // 2699
  originalScript: string;
  scenes: SceneChunk[];
  status: EpisodeStatus;
  createdAt: string;
  updatedAt: string;
  fullMixAudioBase64?: string;
  fullMusicAudioBase64?: string;
}

export interface NarratorProfile {
  id: string;
  name: string; // 'AL WARITH - MAIN NARRATOR'
  voiceName: 'Fenrir' | 'Charon' | 'Puck' | 'Kore' | 'Zephyr';
  pace: 'slow' | 'medium_slow' | 'medium';
  dramaticPauseIntensity: 'cinematic' | 'natural' | 'deep';
  darijaMode: boolean;
  characterVoicesEnabled: boolean; // default false
  description: string;
  testScriptAudio?: string;
}

export interface PronunciationEntry {
  id: string;
  term: string; // e.g. "05:17" or "إدريس السباعي"
  pronunciationGuide: string; // e.g. "الخامسة وسبعة عشر دقيقة"
  category: 'name' | 'number' | 'place' | 'term';
  note?: string;
  sampleAudio?: string;
}

export interface ScriptAnalysisResult {
  summary: string;
  wordCount: number;
  detectedCues: string[];
  numberItems: Array<{ original: string; suggestedSpoken: string; reason: string }>;
  unregisteredNames: Array<{ term: string; suggestedGuide: string; category: string }>;
  loanwords: Array<{ word: string; note: string }>;
  longSentences: Array<{ excerpt: string; wordCount: number; recommendation: string }>;
  pronunciationTips: Array<{ phrase: string; tip: string }>;
}

