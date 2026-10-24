import { ScriptAnalysisResult, PronunciationEntry } from '../types';

export interface TTSGenerateParams {
  text: string;
  voiceName: string;
  preset?: string;
  pace?: string;
  pronunciationGuide?: string;
  darijaMode?: boolean;
}

export interface TTSGenerateResponse {
  audioBase64?: string;
  mimeType?: string;
  cleanedText?: string;
  voiceName?: string;
  isQuotaExceeded?: boolean;
  quotaExceeded?: boolean;
  message?: string;
}

import { generateClientAcousticWav } from './speechSynthesizer';

export async function generateTTS(params: TTSGenerateParams): Promise<TTSGenerateResponse> {
  try {
    const res = await fetch('/api/tts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json().catch(() => ({}));

    // If server provided audioBase64 (even with isQuotaExceeded flag), return it
    if (data && data.audioBase64) {
      return data;
    }

    // If quota exceeded or error occurred without audioBase64, generate client acoustic fallback
    const errStr = JSON.stringify(data.error || data || '');
    const is429 =
      res.status === 429 ||
      errStr.includes('429') ||
      errStr.includes('RESOURCE_EXHAUSTED') ||
      errStr.includes('quota') ||
      Boolean(data.isQuotaExceeded);

    const clientAudio = generateClientAcousticWav(
      params.text,
      (params.preset as any) || 'mystery',
      params.pace || 'medium_slow'
    );

    return {
      audioBase64: clientAudio,
      mimeType: 'audio/wav',
      isQuotaExceeded: is429,
      quotaExceeded: is429,
      message:
        data.message ||
        'تم استهلاك الحصة اليومية لـ Gemini TTS (10 طلبات/يوم). تم تفعيل محرك الصوت الداخلي للاستوديو للمتابعة دون توقف.',
      cleanedText: params.text,
      voiceName: params.voiceName,
    };
  } catch (err: any) {
    console.warn('Network or server error in generateTTS, activating client acoustic engine:', err);
    const clientAudio = generateClientAcousticWav(
      params.text,
      (params.preset as any) || 'mystery',
      params.pace || 'medium_slow'
    );

    return {
      audioBase64: clientAudio,
      mimeType: 'audio/wav',
      isQuotaExceeded: true,
      quotaExceeded: true,
      message: 'تم تفعيل محرك الاستوديو الصوتي الداخلي لمواصلة العمل.',
      cleanedText: params.text,
      voiceName: params.voiceName,
    };
  }
}

export async function analyzeScript(
  script: string,
  dictionary: PronunciationEntry[]
): Promise<ScriptAnalysisResult> {
  const res = await fetch('/api/script/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script, dictionary }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${res.status}`);
  }

  return await res.json();
}

export async function analyzeEpisodeMusicDirector(scenes: any[]): Promise<any> {
  const res = await fetch('/api/music/director-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenes }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${res.status}`);
  }

  return await res.json();
}

export async function generateMusicTrack(
  familyId: string,
  prompt?: string
): Promise<{ audioBase64?: string; message?: string; familyId: string }> {
  const res = await fetch('/api/music/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ familyId, prompt }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${res.status}`);
  }

  return await res.json();
}

