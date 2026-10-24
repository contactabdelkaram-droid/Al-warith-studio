import { SceneChunk, AudioMixMode } from '../types';
import {
  base64ToUint8Array,
  uint8ArrayToBase64,
  toArrayBuffer,
  getAudioContext,
} from './audioUtils';

/**
 * AUTOMATIC AUDIO MIXER & VOLUME DUCKING ENGINE
 *
 * Places background underscore underneath narration with dynamic volume ducking:
 * - Detects spoken dialogue presence and smoothly ducks music level
 * - Automatically swells music in narrative pauses
 * - Provides clean exports for:
 *   1. FINAL MIX (Narration + Ducked Underscore)
 *   2. VOICE ONLY (Clean Voice 24kHz)
 *   3. MUSIC ONLY (Isolated Underscore Bed)
 */

function audioBufferToWavBytes(buffer: AudioBuffer): Uint8Array {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const numSamples = channelData.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * bytesPerSample;

  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    let s = channelData[i];
    // Master soft limiter
    s = Math.tanh(s);
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(s * 32767)));
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Uint8Array(arrayBuffer);
}

/**
 * Mixes a single scene's narration with its assigned background music applying volume ducking
 */
export async function mixSceneAudio(
  voiceBase64?: string,
  musicBase64?: string,
  intensity: number = 0.2,
  duckingDepth: number = 0.65,
  isSilence: boolean = false
): Promise<{ mixedBase64: string; duration: number }> {
  if (!voiceBase64) {
    return { mixedBase64: '', duration: 0 };
  }

  // If silence is preferred or no music exists, return clean voice
  if (isSilence || !musicBase64 || intensity <= 0) {
    return { mixedBase64: voiceBase64, duration: 0 };
  }

  const sampleRate = 24000;
  const ctx = getAudioContext();

  const voiceBytes = base64ToUint8Array(voiceBase64);
  const voiceBuffer = await ctx.decodeAudioData(toArrayBuffer(voiceBytes));

  const musicBytes = base64ToUint8Array(musicBase64);
  const musicBuffer = await ctx.decodeAudioData(toArrayBuffer(musicBytes));

  const totalLength = voiceBuffer.length;
  const OfflineAudioCtxClass =
    window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  const offlineCtx = new OfflineAudioCtxClass(1, totalLength, sampleRate);

  const voiceData = voiceBuffer.getChannelData(0);
  const musicData = musicBuffer.getChannelData(0);

  // Render voice buffer
  const voiceSource = offlineCtx.createBufferSource();
  voiceSource.buffer = voiceBuffer;
  const voiceGain = offlineCtx.createGain();
  voiceGain.gain.value = 1.0;
  voiceSource.connect(voiceGain);
  voiceGain.connect(offlineCtx.destination);

  // Dynamic Volume Ducking Curve for Music
  const musicSource = offlineCtx.createBufferSource();
  musicSource.buffer = musicBuffer;
  musicSource.loop = true;

  const musicGain = offlineCtx.createGain();
  const baseMusicVol = Math.min(0.35, Math.max(0.05, intensity));
  const duckedMusicVol = baseMusicVol * (1 - duckingDepth); // reduced underneath spoken dialogue

  // Calculate RMS speech activity in 50ms window increments
  const windowSize = Math.floor(sampleRate * 0.05); // 50ms
  const numWindows = Math.floor(totalLength / windowSize);

  musicGain.gain.setValueAtTime(baseMusicVol, 0);

  for (let w = 0; w < numWindows; w++) {
    const startIdx = w * windowSize;
    let sumSquares = 0;
    for (let i = 0; i < windowSize; i++) {
      const v = voiceData[startIdx + i] || 0;
      sumSquares += v * v;
    }
    const rms = Math.sqrt(sumSquares / windowSize);
    const time = (startIdx / sampleRate);

    // If speech is detected (RMS > 0.015), duck music volume down
    const targetGain = rms > 0.015 ? duckedMusicVol : baseMusicVol;
    musicGain.gain.setTargetAtTime(targetGain, time, 0.12); // smooth 120ms time constant
  }

  musicSource.connect(musicGain);
  musicGain.connect(offlineCtx.destination);

  voiceSource.start(0);
  musicSource.start(0);

  const mixedBuffer = await offlineCtx.startRendering();
  const mixedWavBytes = audioBufferToWavBytes(mixedBuffer);
  const mixedBase64 = uint8ArrayToBase64(mixedWavBytes);

  return { mixedBase64, duration: mixedBuffer.duration };
}

/**
 * Mixes the full episode into a seamless continuous audio track according to the specified mode:
 * - 'final_mix': Narration + Ducked Underscore + Silences
 * - 'voice_only': Clean Narration Only
 * - 'music_only': Isolated Music Underscore Only
 */
export async function mixFullEpisode(
  scenes: SceneChunk[],
  mode: AudioMixMode = 'final_mix',
  pauseBetweenScenesSec: number = 0.7
): Promise<{ blob: Blob; url: string; totalDuration: number }> {
  const sampleRate = 24000;
  const ctx = getAudioContext();

  const sceneAudioBuffers: Array<{
    voiceBuffer?: AudioBuffer;
    musicBuffer?: AudioBuffer;
    isSilence: boolean;
    intensity: number;
    duckingDepth: number;
    duration: number;
  }> = [];

  for (const scene of scenes) {
    if (!scene.audioBase64) continue;

    const voiceBytes = base64ToUint8Array(scene.audioBase64);
    const voiceBuffer = await ctx.decodeAudioData(toArrayBuffer(voiceBytes));

    let musicBuffer: AudioBuffer | undefined = undefined;
    if (scene.music && !scene.music.isSilence && scene.music.audioBase64) {
      try {
        const musicBytes = base64ToUint8Array(scene.music.audioBase64);
        musicBuffer = await ctx.decodeAudioData(toArrayBuffer(musicBytes));
      } catch (e) {
        console.warn('Failed to decode music buffer for scene', e);
      }
    }

    sceneAudioBuffers.push({
      voiceBuffer,
      musicBuffer,
      isSilence: scene.music ? scene.music.isSilence : false,
      intensity: scene.music ? scene.music.intensity : 0.2,
      duckingDepth: scene.music ? scene.music.duckingDepth : 0.65,
      duration: voiceBuffer.duration,
    });
  }

  if (sceneAudioBuffers.length === 0) {
    throw new Error('No ready scenes to mix.');
  }

  // Calculate total duration in samples
  let totalSamples = 0;
  for (let i = 0; i < sceneAudioBuffers.length; i++) {
    totalSamples += sceneAudioBuffers[i].voiceBuffer!.length;
    if (i < sceneAudioBuffers.length - 1) {
      totalSamples += Math.floor(pauseBetweenScenesSec * sampleRate);
    }
  }

  const OfflineAudioCtxClass =
    window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  const offlineCtx = new OfflineAudioCtxClass(1, totalSamples, sampleRate);

  let currentSampleOffset = 0;

  for (let sIdx = 0; sIdx < sceneAudioBuffers.length; sIdx++) {
    const item = sceneAudioBuffers[sIdx];
    const startTimeSec = currentSampleOffset / sampleRate;
    const durationSec = item.duration;

    // 1. VOICE TRACK
    if (mode === 'final_mix' || mode === 'voice_only') {
      const vSource = offlineCtx.createBufferSource();
      vSource.buffer = item.voiceBuffer!;
      const vGain = offlineCtx.createGain();
      vGain.gain.value = 1.0;
      vSource.connect(vGain);
      vGain.connect(offlineCtx.destination);
      vSource.start(startTimeSec);
    }

    // 2. MUSIC UNDERSCORE TRACK
    if ((mode === 'final_mix' || mode === 'music_only') && !item.isSilence && item.musicBuffer) {
      const mSource = offlineCtx.createBufferSource();
      mSource.buffer = item.musicBuffer;
      mSource.loop = true;

      const mGain = offlineCtx.createGain();
      const baseVol = Math.min(0.35, Math.max(0.06, item.intensity));

      if (mode === 'final_mix') {
        const duckedVol = baseVol * (1 - item.duckingDepth);
        const vData = item.voiceBuffer!.getChannelData(0);
        const windowSize = Math.floor(sampleRate * 0.05);
        const numWindows = Math.floor(vData.length / windowSize);

        mGain.gain.setValueAtTime(baseVol, startTimeSec);

        for (let w = 0; w < numWindows; w++) {
          const startIdx = w * windowSize;
          let sumSquares = 0;
          for (let i = 0; i < windowSize; i++) {
            const val = vData[startIdx + i] || 0;
            sumSquares += val * val;
          }
          const rms = Math.sqrt(sumSquares / windowSize);
          const t = startTimeSec + startIdx / sampleRate;
          const target = rms > 0.015 ? duckedVol : baseVol;
          mGain.gain.setTargetAtTime(target, t, 0.12);
        }
      } else {
        // Music only mode: master level
        mGain.gain.setValueAtTime(baseVol, startTimeSec);
      }

      // Smooth fade-in and fade-out at scene boundaries
      mGain.gain.setValueAtTime(0.001, startTimeSec);
      mGain.gain.linearRampToValueAtTime(baseVol, startTimeSec + 1.2);
      mGain.gain.setValueAtTime(baseVol, Math.max(startTimeSec + 1.2, startTimeSec + durationSec - 1.2));
      mGain.gain.linearRampToValueAtTime(0.001, startTimeSec + durationSec);

      mSource.connect(mGain);
      mGain.connect(offlineCtx.destination);

      mSource.start(startTimeSec);
      mSource.stop(startTimeSec + durationSec);
    }

    currentSampleOffset += item.voiceBuffer!.length;
    if (sIdx < sceneAudioBuffers.length - 1) {
      currentSampleOffset += Math.floor(pauseBetweenScenesSec * sampleRate);
    }
  }

  const renderedBuffer = await offlineCtx.startRendering();
  const masterWavBytes = audioBufferToWavBytes(renderedBuffer);
  const blob = new Blob([toArrayBuffer(masterWavBytes)], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);

  return { blob, url, totalDuration: renderedBuffer.duration };
}
