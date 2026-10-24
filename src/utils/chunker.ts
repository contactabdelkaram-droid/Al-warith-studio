import { SceneChunk, ScenePreset } from '../types';

/**
 * Extracts production cues from a piece of text (e.g. [موسيقى غامضة])
 */
export function extractCues(text: string): string[] {
  const matches = text.match(/\[([^\]]+)\]/g);
  if (!matches) return [];
  return matches.map((m) => m.replace(/^\[|\]$/g, '').trim());
}

/**
 * Cleans the text for speech synthesis by removing stage directions/cues
 */
export function getSpokenText(text: string): string {
  return text
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/\*\*\*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detects the emotional / atmospheric preset from Moroccan Darija text keywords
 */
export function detectPreset(text: string): ScenePreset {
  const lower = text.toLowerCase();
  if (lower.includes('05:17') || lower.includes('لقيناه') || lower.includes('الوقت قرب')) {
    return 'revelation';
  }
  if (lower.includes('خوف') || lower.includes('كيجري') || lower.includes('هرب') || lower.includes('خطر')) {
    return 'urgent';
  }
  if (lower.includes('حلم') || lower.includes('ذكرى') || lower.includes('توحشت') || lower.includes('بكات')) {
    return 'emotional';
  }
  if (lower.includes('سمع') || lower.includes('حسيت') || lower.includes('ضلام') || lower.includes('سر') || lower.includes('غامض')) {
    return 'mystery';
  }
  if (lower.includes('سكت') || lower.includes('صوت') || lower.includes('حابس') || lower.includes('تسلل')) {
    return 'whispered_tension';
  }
  if (lower.includes('قال') || lower.includes('قلت') || lower.includes('جاوب') || lower.includes('سولني')) {
    return 'dialogue';
  }
  return 'mystery';
}

/**
 * Smart Scene Chunking that respects:
 * - Scene breaks (***)
 * - Narrative paragraphs
 * - Isolated dramatic one-liners (e.g. "لقيناه.", "05:17") kept grouped with their dramatic lead-in
 * - Max target words per chunk ~120-220 words for optimal TTS consistency and speech cadence
 */
export function splitScriptIntoScenes(script: string): SceneChunk[] {
  if (!script || !script.trim()) return [];

  // Split by explicit scene breaks first: *** or ---
  const rawSections = script.split(/(?:\r?\n){1,}\s*\*\*\*\s*(?:\r?\n){1,}/);

  const chunks: SceneChunk[] = [];
  let sceneIndex = 1;

  for (const section of rawSections) {
    if (!section.trim()) continue;

    // Paragraph-based splitting within a section
    const paragraphs = section
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    let currentChunkText = '';
    let currentWordCount = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const pWords = p.split(/\s+/).filter(Boolean).length;

      // Check if this paragraph is a short punchline connected to the previous one
      // (e.g. "05:17", "لقيناه.", "ما تبقاش بوحدك.")
      const isShortPunchline = pWords <= 5;

      // If adding this paragraph exceeds ~180 words, and it's not a short punchline that MUST stay with previous
      if (currentWordCount > 0 && currentWordCount + pWords > 180 && !isShortPunchline) {
        // Push the accumulated chunk
        const cues = extractCues(currentChunkText);
        const clean = getSpokenText(currentChunkText);
        const preset = detectPreset(currentChunkText);

        chunks.push({
          id: `scene_${Date.now()}_${sceneIndex}`,
          sceneNumber: sceneIndex++,
          rawText: currentChunkText.trim(),
          cleanText: clean,
          cues,
          status: 'idle',
          isLocked: false,
          preset,
          controls: {
            pace: 'medium_slow',
            tone: 'deep_calm',
            energy: 'low_controlled',
            pauseIntensity: 'cinematic',
          },
        });

        currentChunkText = p;
        currentWordCount = pWords;
      } else {
        // Append to current chunk
        if (currentChunkText) {
          currentChunkText += '\n\n' + p;
        } else {
          currentChunkText = p;
        }
        currentWordCount += pWords;
      }
    }

    if (currentChunkText.trim()) {
      const cues = extractCues(currentChunkText);
      const clean = getSpokenText(currentChunkText);
      const preset = detectPreset(currentChunkText);

      chunks.push({
        id: `scene_${Date.now()}_${sceneIndex}`,
        sceneNumber: sceneIndex++,
        rawText: currentChunkText.trim(),
        cleanText: clean,
        cues,
        status: 'idle',
        isLocked: false,
        preset,
        controls: {
          pace: 'medium_slow',
          tone: 'deep_calm',
          energy: 'low_controlled',
          pauseIntensity: 'cinematic',
        },
      });
    }
  }

  return chunks;
}
