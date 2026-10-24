import {
  SceneChunk,
  SceneMusicAssignment,
  MusicState,
  MusicFamilyId,
  MusicTrackAsset,
} from '../types';

/**
 * AUTOMATIC MUSIC DIRECTOR
 *
 * Automatically inspects every scene in an episode script to determine:
 * - music_state: MYSTERY | TENSION | MEMORY | REVELATION | DANGER | SILENCE
 * - familyId: AL WARITH 7 reusable music families
 * - intensity: strictly calibrated (10-45%)
 * - continueFromPrevious: smooth narrative continuity
 * - isSilence: automatic silence insertion around iconic lines ("لقيناه.", "05:17", etc.)
 */

// Critical lines where SILENCE is dramatically superior in AL WARITH storytelling
const SILENCE_TRIGGERS = [
  'لقيناه',
  'ما تبقاش بوحدك',
  'الوقت قرب',
  'صمت',
  'صمت درامي',
  'وقفات صامتة',
];

export function analyzeSceneMusicState(
  scene: SceneChunk,
  previousAssignment?: SceneMusicAssignment
): SceneMusicAssignment {
  const text = scene.rawText.toLowerCase();
  const clean = scene.cleanText.toLowerCase();
  const cues = scene.cues.map((c) => c.toLowerCase());

  // Check 1: Explicit Silence Cues or Isolated Critical Revelation Lines
  const isExplicitSilenceCue = cues.some((c) => c.includes('صمت'));
  const isShortPunchline = scene.cleanText.split(/\s+/).filter(Boolean).length <= 4;
  const hasKeySilencePhrase = SILENCE_TRIGGERS.some((phrase) => text.includes(phrase));

  if (isExplicitSilenceCue || (isShortPunchline && hasKeySilencePhrase)) {
    return {
      musicState: 'SILENCE',
      familyId: 'MYSTERY_BED',
      intensity: 0,
      fadeInSec: 0,
      fadeOutSec: 1.5,
      continueFromPrevious: false,
      isSilence: true,
      silenceReason: isExplicitSilenceCue
        ? 'تعليمات صمت درامي [صمت]'
        : `وقفة صمت مقدسة حول جملة مفصلية: "${scene.cleanText}"`,
      duckingDepth: 0,
    };
  }

  // Check 2: 05:17 Clock Signature
  if (text.includes('05:17') || text.includes('خمسة وسبعطاش')) {
    return {
      musicState: 'REVELATION',
      familyId: 'SIGNATURE_0517',
      intensity: 0.22,
      fadeInSec: 1.5,
      fadeOutSec: 2.0,
      continueFromPrevious: false,
      isSilence: false,
      duckingDepth: 0.65,
    };
  }

  // Check 3: Danger / Immediate Threat / Pursuit
  if (
    cues.some((c) => c.includes('خطر') || c.includes('ركض') || c.includes('هروب')) ||
    text.includes('حراس') ||
    text.includes('كيجري') ||
    text.includes('خطر') ||
    text.includes('مراقب') ||
    text.includes('رعب') ||
    text.includes('لصق مع الحيط')
  ) {
    return {
      musicState: 'DANGER',
      familyId: 'DANGER_BED',
      intensity: 0.32, // 25-45% scale
      fadeInSec: 2.0,
      fadeOutSec: 2.5,
      continueFromPrevious: previousAssignment?.musicState === 'DANGER',
      isSilence: false,
      duckingDepth: 0.7,
    };
  }

  // Check 4: Mounting Tension
  if (
    cues.some((c) => c.includes('توتر')) ||
    text.includes('توتر') ||
    text.includes('تنفس ثقيل') ||
    text.includes('هاتف') ||
    text.includes('مرتجفة') ||
    text.includes('ماشي صدفة') ||
    text.includes('خطوات')
  ) {
    return {
      musicState: 'TENSION',
      familyId: 'TENSION_BED',
      intensity: 0.28, // 20-40% scale
      fadeInSec: 2.5,
      fadeOutSec: 2.5,
      continueFromPrevious: previousAssignment?.musicState === 'TENSION',
      isSilence: false,
      duckingDepth: 0.68,
    };
  }

  // Check 5: Memory / Melancholy / Ancient reflection
  if (
    text.includes('حلم') ||
    text.includes('أحلام') ||
    text.includes('ذاكرة') ||
    text.includes('خريف') ||
    text.includes('زمان') ||
    text.includes('القديم') ||
    text.includes('كنت كنظن')
  ) {
    return {
      musicState: 'MEMORY',
      familyId: 'MEMORY_BED',
      intensity: 0.16, // 10-25% scale
      fadeInSec: 2.5,
      fadeOutSec: 3.0,
      continueFromPrevious: previousAssignment?.musicState === 'MEMORY',
      isSilence: false,
      duckingDepth: 0.62,
    };
  }

  // Check 6: Revelation
  if (
    text.includes('سر') ||
    text.includes('حقيقة') ||
    text.includes('أبواب') ||
    text.includes('الوارث') ||
    text.includes('اكتشفنا') ||
    text.includes('سؤال كيحرق')
  ) {
    return {
      musicState: 'REVELATION',
      familyId: 'REVELATION_BED',
      intensity: 0.22, // 15-30% scale
      fadeInSec: 2.0,
      fadeOutSec: 2.5,
      continueFromPrevious: false,
      isSilence: false,
      duckingDepth: 0.65,
    };
  }

  // Default: Restrained Mystery Bed
  const shouldContinue = previousAssignment && previousAssignment.musicState === 'MYSTERY';
  return {
    musicState: 'MYSTERY',
    familyId: 'MYSTERY_BED',
    intensity: 0.15, // 10-20% scale
    fadeInSec: 3.0,
    fadeOutSec: 3.0,
    continueFromPrevious: Boolean(shouldContinue),
    isSilence: false,
    duckingDepth: 0.65,
  };
}

/**
 * Automatically directs and assigns music across all scenes in an episode
 */
export function directEpisodeMusic(
  scenes: SceneChunk[],
  musicLibrary: MusicTrackAsset[]
): SceneChunk[] {
  let previousAssignment: SceneMusicAssignment | undefined = undefined;

  return scenes.map((scene) => {
    const assignment = analyzeSceneMusicState(scene, previousAssignment);

    // Find corresponding music asset from the library
    if (!assignment.isSilence) {
      const asset =
        musicLibrary.find((m) => m.familyId === assignment.familyId) ||
        musicLibrary.find((m) => m.musicState === assignment.musicState) ||
        musicLibrary[0];

      if (asset) {
        assignment.audioBase64 = asset.audioBase64;
      }
    }

    previousAssignment = assignment;
    return {
      ...scene,
      music: assignment,
    };
  });
}
