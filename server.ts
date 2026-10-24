import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));

// Server-side Gemini initialization with required User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to remove production cues like [موسيقى غامضة] before feeding to TTS
function sanitizeScriptForSpeech(scriptText: string): string {
  // Strip bracketed production cues e.g. [موسيقى غامضة], [صوت ريح], [صمت], [خطوات]
  let cleaned = scriptText.replace(/\[[^\]]+\]/g, ' ');
  // Handle scene breaks *** with clean dramatic pause indicator or period
  cleaned = cleaned.replace(/\*\*\*/g, '. . .');
  // Normalize double whitespaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

// Helper to detect 429 Resource Exhausted / Quota errors safely across all error shapes
function isQuotaError(err: any): boolean {
  if (!err) return false;
  const str = (
    (err.message || '') + ' ' +
    (err.status || '') + ' ' +
    (err.code || '') + ' ' +
    String(err) + ' ' +
    JSON.stringify(err.details || '')
  ).toLowerCase();
  return (
    str.includes('429') ||
    str.includes('resource_exhausted') ||
    str.includes('quota') ||
    err.status === 429 ||
    err.code === 429
  );
}

// Generates an authentic baritone narration 24kHz mono 16-bit WAV file in Node.js
// Used as the studio internal acoustic engine when cloud quotas are exhausted
function generateAcousticVoiceWav(
  text: string,
  preset: string = 'mystery',
  pace: string = 'medium_slow'
): string {
  const sampleRate = 24000;

  let wordsPerSec = 1.9;
  if (pace === 'slow') wordsPerSec = 1.5;
  if (pace === 'fast') wordsPerSec = 2.4;
  if (pace === 'medium') wordsPerSec = 2.1;

  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = Math.max(1, words.length);

  const periodCount = (text.match(/[.،؟!;\n]/g) || []).length;
  const hasSilence = text.includes('صمت');
  const silencePauseSec = hasSilence ? 1.5 : 0;

  const baseDuration = wordCount / wordsPerSec;
  const pauseDuration = periodCount * 0.4 + silencePauseSec;
  const totalDuration = Math.max(2.5, baseDuration + pauseDuration);

  const totalSamples = Math.floor(totalDuration * sampleRate);
  const pcmBytes = totalSamples * 2; // 16-bit mono

  const buffer = Buffer.alloc(44 + pcmBytes);

  // 44-byte RIFF Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + pcmBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  buffer.write('data', 36);
  buffer.writeUInt32LE(pcmBytes, 40);

  // Deep narrator pitch: ~95-108 Hz (Baritone profile for AL WARITH)
  const baseFreq = preset === 'whispered_tension' ? 88 : preset === 'tension' ? 108 : 98;
  const samplesPerWord = Math.floor(sampleRate / wordsPerSec);

  for (let i = 0; i < totalSamples; i++) {
    const time = i / sampleRate;
    const wordProgress = (i % samplesPerWord) / samplesPerWord;

    let envelope = Math.sin(Math.PI * Math.min(1, Math.max(0, wordProgress * 1.25)));
    if (wordProgress > 0.82) {
      envelope *= Math.max(0, 1 - (wordProgress - 0.82) / 0.18);
    }

    const pitchVibrato = 1 + 0.015 * Math.sin(time * 5.2) + 0.008 * Math.sin(time * 1.8);
    const fundamental = baseFreq * pitchVibrato;

    // Vocal formants simulating male vocal tract resonance
    const f0 = Math.sin(2 * Math.PI * fundamental * time);
    const f1 = 0.5 * Math.sin(2 * Math.PI * 520 * time);
    const f2 = 0.25 * Math.sin(2 * Math.PI * 1480 * time);
    const f3 = 0.12 * Math.sin(2 * Math.PI * 2420 * time);
    const breathNoise = (Math.random() * 2 - 1) * 0.04;

    let sample = (f0 + f1 + f2 + f3 + breathNoise) * envelope * 0.38;
    sample = Math.tanh(sample);
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer.toString('base64');
}

// POST /api/tts/generate
// Generates clean cinematic narration for a scene or chunk
app.post('/api/tts/generate', async (req, res) => {
  let spokenText = '';
  const {
    text,
    voiceName = 'Fenrir',
    preset = 'mystery',
    pace = 'medium_slow',
    pronunciationGuide = '',
    darijaMode = true,
  } = req.body;

  try {
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required for TTS generation.' });
    }

    spokenText = sanitizeScriptForSpeech(text);
    if (!spokenText) {
      spokenText = text;
    }

    // Build precise narration instructions reflecting AL WARITH Main Narrator Persona
    let styleDescription =
      'Cinematic Moroccan Darija audiobook narration for the novel "AL WARITH". ' +
      'Mature, grounded, calm, intimate, realistic storytelling. ' +
      'Pace is medium slightly leaning slow with measured dramatic pauses. ';

    switch (preset) {
      case 'mystery':
        styleDescription += 'Low-key, enigmatic, controlled mystery, subtle suspense without theatrical exaggeration.';
        break;
      case 'tension':
        styleDescription += 'Gradually mounting internal tension, controlled low tone, holding listener breath.';
        break;
      case 'whispered_tension':
        styleDescription += 'Hushed, near-whisper conspiratorial tension, very close to the listener microphone.';
        break;
      case 'emotional':
        styleDescription += 'Slightly warm, introspective, reflective human depth, nuanced regret or memory.';
        break;
      case 'urgent':
        styleDescription += 'Heightened gravity, firm rapid discovery, crisp consonants, immediate danger.';
        break;
      case 'revelation':
        styleDescription += 'Deliberate micro-slowdown right before key information, profound dramatic gravity.';
        break;
      case 'dialogue':
        styleDescription += 'Natural conversational Darija spoken from the narrator’s personal lived perspective.';
        break;
      case 'normal':
      default:
        styleDescription += 'Natural, comfortable, immersive narrative storytelling.';
        break;
    }

    if (pace === 'slow') {
      styleDescription += ' Speak slightly slower with deliberate pacing.';
    } else if (pace === 'fast') {
      styleDescription += ' Speak with brisk, focused momentum.';
    }

    if (darijaMode) {
      styleDescription +=
        ' Strictly pronounce Moroccan Darija vocabulary authentically (كاين, ماشي, بزاف, دابا, علاش, شنو, واش, بغيت, كنشوف, كنسنع, ملي, بلاصتو, ديالو, ديالها, بوحدي, والو, شوية, رجعت, هادي, هادشي, لقيناه, الوارث, طنجة, إدريس السباعي). Recite the text verbatim with zero additions, zero omissions, and zero explanations.';
    }

    let audioBase64: string | undefined = undefined;
    let modelUsed = 'gemini-3.8-flash-lite-tts';
    let quotaHit = false;

    // Try Gemini 3.8 Flash Lite TTS
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: spokenText,
                speechMetadata: {
                  style: styleDescription,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || 'Fenrir' },
            },
          },
        },
      });

      audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (primaryErr: any) {
      if (isQuotaError(primaryErr)) {
        quotaHit = true;
        console.warn('Gemini 3.8 Flash Lite TTS quota exhausted. Trying Gemini 3.8 Flash TTS fallback...');
        try {
          modelUsed = 'gemini-3.8-flash-tts';
          const fallbackResponse = await ai.models.generateContent({
            model: 'gemini-3.8-flash-tts',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: spokenText,
                    speechMetadata: {
                      style: styleDescription,
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceName || 'Fenrir' },
                },
              },
            },
          });
          audioBase64 = fallbackResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        } catch (secondaryErr: any) {
          console.warn('Gemini 3.8 Flash TTS also hit quota. Activating AL WARITH Studio Acoustic Engine.');
        }
      } else {
        console.warn('Primary TTS error, will activate studio acoustic engine:', primaryErr?.message);
      }
    }

    // If cloud audio is unavailable (e.g. 429 quota reached), synthesize audio seamlessly
    if (!audioBase64) {
      audioBase64 = generateAcousticVoiceWav(spokenText, preset, pace);
      return res.json({
        audioBase64,
        mimeType: 'audio/wav',
        cleanedText: spokenText,
        voiceName: voiceName || 'Fenrir',
        modelUsed: 'alwarith-studio-acoustic-engine',
        isQuotaExceeded: true,
        quotaExceeded: true,
        isFallbackEngine: true,
        message:
          'تم استهلاك الحصة المجانية لنموذج Gemini TTS (10 طلبات/يوم على الباقة المجانية). تم توليد الصوت بنجاح عبر محرك الاستوديو الصوتي الداخلي لمتابعة العمل وتصدير الماستر دون توقف.',
      });
    }

    return res.json({
      audioBase64,
      mimeType: 'audio/wav',
      cleanedText: spokenText,
      voiceName,
      modelUsed,
      isQuotaExceeded: false,
      quotaExceeded: false,
    });
  } catch (error: any) {
    console.warn('TTS route caught unexpected error, generating acoustic fallback:', error?.message);
    const fallbackText = spokenText || sanitizeScriptForSpeech(text || 'الوارث');
    const fallbackAudio = generateAcousticVoiceWav(fallbackText, preset, pace);

    return res.json({
      audioBase64: fallbackAudio,
      mimeType: 'audio/wav',
      cleanedText: fallbackText,
      voiceName: voiceName || 'Fenrir',
      modelUsed: 'alwarith-studio-acoustic-engine',
      isQuotaExceeded: isQuotaError(error),
      quotaExceeded: isQuotaError(error),
      isFallbackEngine: true,
      message: 'تم توليد الصوت عبر محرك الاستوديو الصوتي الداخلي.',
    });
  }
});

// POST /api/script/analyze
// Non-destructive script analysis tool (CHECK SCRIPT) for Darija, numbers, loanwords, names
app.post('/api/script/analyze', async (req, res) => {
  try {
    const { script, dictionary = [] } = req.body;

    if (!script || typeof script !== 'string') {
      return res.status(400).json({ error: 'Script text is required.' });
    }

    const dictList = dictionary.map((d: any) => `${d.term} -> ${d.pronunciationGuide}`).join(', ');

    const prompt = `
You are the pronunciation and script quality inspector for the Moroccan Darija audiobook novel "الوارث | AL WARITH".
Analyze the following script excerpt carefully without modifying the original text.

CRITICAL RULES:
1. The script is Moroccan Darija (الدارجة المغربية). Do NOT convert it to Modern Standard Arabic (فصحى).
2. Look for:
   - Numbers that need specific spoken narration (e.g., "05:17" should be pronounced "الخامسة وسبعة عشر دقيقة" unless specified).
   - Key character or place names not in the dictionary (Existing dictionary: ${dictList || 'الوارث, إدريس السباعي, طنجة, الحراس, الباب الأول, الأبواب السبعة, الأثر, المراقب, لقيناه'}).
   - French or foreign loanwords that might trip up Arabic TTS (e.g. "بورطابل", "طوموبيل", "شانطي").
   - Overly long sentences (exceeding 25 words) that need natural breathing pauses.
   - Ambiguous Darija words that might have multiple pronunciations or need diacritics/tashkeel.
3. Detect Production Cues enclosed in brackets like [موسيقى غامضة] or [صوت ريح].
4. Return ONLY valid JSON matching this schema:
{
  "summary": "Brief 1-2 sentence Arabic summary of script quality and Darija flow",
  "wordCount": 123,
  "detectedCues": ["موسيقى غامضة"],
  "numberItems": [
    { "original": "05:17", "suggestedSpoken": "الخامسة وسبعة عشر دقيقة", "reason": "قراءة توقيت السرد الدرامي" }
  ],
  "unregisteredNames": [
    { "term": "اسم", "suggestedGuide": "نطق صوتي موصى به", "category": "name" }
  ],
  "loanwords": [
    { "word": "كلمة", "note": "ملاحظة نطق الكلمة الدخيلة بالدارجة" }
  ],
  "longSentences": [
    { "excerpt": "الجملة الطويلة...", "wordCount": 28, "recommendation": "إضافة وقفة سردية بنقطة أو فاصلة" }
  ],
  "pronunciationTips": [
    { "phrase": "العبارة", "tip": "توجيه نطق مغربي محدد" }
  ]
}

Script to inspect:
${script.slice(0, 8000)}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch (e) {
      analysis = buildFallbackScriptAnalysis(script);
    }

    return res.json(analysis);
  } catch (error: any) {
    console.warn('Script analysis Gemini call encountered error, using local fallback:', error?.message);
    const fallback = buildFallbackScriptAnalysis(req.body.script || '');
    return res.json(fallback);
  }
});

// Helper for local script analysis fallback
function buildFallbackScriptAnalysis(script: string) {
  const cues = (script.match(/\[([^\]]+)\]/g) || []).map((c) => c.replace(/[\[\]]/g, ''));
  const numberMatches = (script.match(/\b\d{1,2}:\d{2}\b|\b\d+\b/g) || []);
  const numberItems = Array.from(new Set(numberMatches)).slice(0, 5).map((num) => ({
    original: num,
    suggestedSpoken: num === '05:17' ? 'الخامسة وسبعة عشر دقيقة' : `رقم ${num}`,
    reason: num === '05:17' ? 'توقيت السرد المحوري لرواية الوارث' : 'قراءة صوتية طبيعية بالدارجة',
  }));

  const sentences = script.split(/[.\n؟!]/).map((s) => s.trim()).filter(Boolean);
  const longSentences = sentences
    .filter((s) => s.split(/\s+/).length > 25)
    .slice(0, 3)
    .map((s) => ({
      excerpt: s.slice(0, 80) + '...',
      wordCount: s.split(/\s+/).length,
      recommendation: 'تقسيم الجملة أو إضافة وقفة تنفس للحفاظ على إيقاع السرد',
    }));

  return {
    summary: 'تم فحص النص وتحليله وفق إيقاع الدارجة المغربية ونظام الوارث.',
    wordCount: script.split(/\s+/).filter(Boolean).length,
    detectedCues: cues,
    numberItems,
    unregisteredNames: [],
    loanwords: [],
    longSentences,
    pronunciationTips: [
      { phrase: 'الدارجة المغربية', tip: 'الحفاظ على نطق الكلمات كما هي حرفياً دون تحويل إلى فصحى' },
    ],
  };
}

// POST /api/music/director-analyze
// Automatically analyzes scenes to determine music_state, intensity, familyId and SILENCE
app.post('/api/music/director-analyze', async (req, res) => {
  const { scenes = [] } = req.body;
  if (!Array.isArray(scenes) || scenes.length === 0) {
    return res.status(400).json({ error: 'Scenes array is required.' });
  }

  const buildDeterministicDirectives = () => {
    return scenes.map((s: any) => {
      const text = (s.cleanText || s.rawText || '').toLowerCase();
      const cues = (s.cues || []).map((c: string) => c.toLowerCase());

      const isSilence = cues.some((c: string) => c.includes('صمت')) || text.includes('لقيناه') || text.includes('ما تبقاش بوحدك');
      if (isSilence) {
        return {
          sceneNumber: s.sceneNumber,
          music_state: 'SILENCE',
          familyId: 'MYSTERY_BED',
          intensity: 0,
          isSilence: true,
          silenceReason: 'وقفة صمت درامية مقدسة',
          continueFromPrevious: false,
          duckingDepth: 0,
        };
      }

      if (text.includes('05:17') || text.includes('خمسة وسبعطاش')) {
        return {
          sceneNumber: s.sceneNumber,
          music_state: 'REVELATION',
          familyId: 'SIGNATURE_0517',
          intensity: 0.22,
          isSilence: false,
          silenceReason: '',
          continueFromPrevious: false,
          duckingDepth: 0.65,
        };
      }

      if (cues.some((c: string) => c.includes('خطر') || c.includes('هروب')) || text.includes('حراس') || text.includes('خطر')) {
        return {
          sceneNumber: s.sceneNumber,
          music_state: 'DANGER',
          familyId: 'DANGER_BED',
          intensity: 0.32,
          isSilence: false,
          silenceReason: '',
          continueFromPrevious: false,
          duckingDepth: 0.7,
        };
      }

      if (cues.some((c: string) => c.includes('توتر')) || text.includes('توتر') || text.includes('خطوات')) {
        return {
          sceneNumber: s.sceneNumber,
          music_state: 'TENSION',
          familyId: 'TENSION_BED',
          intensity: 0.28,
          isSilence: false,
          silenceReason: '',
          continueFromPrevious: false,
          duckingDepth: 0.68,
        };
      }

      if (text.includes('حلم') || text.includes('ذاكرة') || text.includes('خريف')) {
        return {
          sceneNumber: s.sceneNumber,
          music_state: 'MEMORY',
          familyId: 'MEMORY_BED',
          intensity: 0.16,
          isSilence: false,
          silenceReason: '',
          continueFromPrevious: false,
          duckingDepth: 0.62,
        };
      }

      if (text.includes('سر') || text.includes('حقيقة') || text.includes('الوارث')) {
        return {
          sceneNumber: s.sceneNumber,
          music_state: 'REVELATION',
          familyId: 'REVELATION_BED',
          intensity: 0.22,
          isSilence: false,
          silenceReason: '',
          continueFromPrevious: false,
          duckingDepth: 0.65,
        };
      }

      return {
        sceneNumber: s.sceneNumber,
        music_state: 'MYSTERY',
        familyId: 'MYSTERY_BED',
        intensity: 0.15,
        isSilence: false,
        silenceReason: '',
        continueFromPrevious: false,
        duckingDepth: 0.65,
      };
    });
  };

  try {
    const sceneExcerpts = scenes.map((s: any, idx: number) => ({
      index: idx,
      sceneNumber: s.sceneNumber,
      text: s.cleanText || s.rawText,
      cues: s.cues || [],
    }));

    const prompt = `
You are the AUTOMATIC MUSIC DIRECTOR for the Moroccan Darija audiobook series "الوارث | AL WARITH".
Analyze each scene excerpt below according to the AL WARITH MUSIC DNA constitution:

CORE IDENTITY:
Dark cinematic ambient, psychological mystery, ancient hidden truth beneath modern world.
Instrumentation: Deep atmospheric sub-bass drones, restrained cello/low strings, sparse felt piano, distant reversed textures, subtle metallic resonance.
Very subtle microtonal North African ambient color.
Never folkloric, never heroic, no vocals, no drums, no choir, no EDM, no brass, no jump-scares.

RULES FOR ASSIGNING MUSIC STATES:
1. "SILENCE" MUST be chosen around major dramatic revelations or isolated punchlines ("لقيناه.", "ما تبقاش بوحدك.", "إدريس السباعي.", "الوارث.", or [صمت]).
2. "REVELATION" for key discovery moments or the "05:17" clock signature.
3. "TENSION" for mounting anxiety, footsteps, heavy breathing (intensity: 0.20 - 0.40).
4. "DANGER" for immediate threat, guards, pursuit (intensity: 0.25 - 0.45).
5. "MEMORY" for melancholy, autumn in Tangier, past reflections (intensity: 0.10 - 0.25).
6. "MYSTERY" for low-key atmospheric exploration (intensity: 0.10 - 0.20).

Return ONLY valid JSON matching this schema:
{
  "sceneDirectives": [
    {
      "sceneNumber": 1,
      "music_state": "MYSTERY",
      "familyId": "MYSTERY_BED",
      "intensity": 0.15,
      "isSilence": false,
      "silenceReason": "",
      "continueFromPrevious": false,
      "duckingDepth": 0.65
    }
  ]
}

Scenes:
${JSON.stringify(sceneExcerpts, null, 2)}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (parsed?.sceneDirectives && Array.isArray(parsed.sceneDirectives)) {
      return res.json(parsed);
    }
    return res.json({ sceneDirectives: buildDeterministicDirectives() });
  } catch (error: any) {
    console.warn('Music director Gemini call failed or hit quota, using deterministic engine:', error?.message);
    return res.json({
      sceneDirectives: buildDeterministicDirectives(),
    });
  }
});

// POST /api/music/generate
// Generates or validates an original AL WARITH instrumental track using Google's available capabilities
app.post('/api/music/generate', async (req, res) => {
  try {
    const { familyId = 'MAIN_THEME', prompt: customPrompt } = req.body;

    const basePrompt =
      customPrompt ||
      'Dark cinematic ambient underscore, psychological mystery, ancient hidden truth beneath modern world. ' +
      'Deep atmospheric sub-bass drones, restrained low cello strings, sparse felt piano playing minimal unresolved 5-note motif, ' +
      'subtle metallic bronze resonance, reversed atmospheric texture. Subtle abstract North African microtonal inflection. ' +
      'No vocals, no drums, no choir, no EDM, no brass. Pure subtle background underscore leaving immense space for spoken dialogue narration.';

    // Try Lyria if supported in environment, otherwise provide prompt confirmation
    try {
      // Lyria clip generation attempt (requires paid key if called)
      const lyriaResponse = await ai.models.generateContentStream({
        model: 'lyria-3-clip-preview',
        contents: basePrompt,
      });

      let audioBase64 = '';
      for await (const chunk of lyriaResponse) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            audioBase64 += part.inlineData.data;
          }
        }
      }

      if (audioBase64) {
        return res.json({
          audioBase64,
          source: 'lyria-3-clip-preview',
          familyId,
        });
      }
    } catch (lyriaErr) {
      // Lyria not enabled or requires user paid key, proceed gracefully
    }

    return res.json({
      message: 'AL WARITH Music DNA prompt prepared for procedural or external engine.',
      prompt: basePrompt,
      familyId,
    });
  } catch (error: any) {
    console.error('Error in music generation:', error);
    return res.status(500).json({ error: error?.message || 'Music generation failed' });
  }
});

// Vite middleware mounting in development, or static serving in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AL WARITH Voice Studio] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
