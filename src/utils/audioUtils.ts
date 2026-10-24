// Audio utilities for WAV parsing, Web Audio playback, and seamless multi-scene WAV concatenation

let sharedAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioCtx = new AudioContextClass({ sampleRate: 24000 });
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

/**
 * Converts a base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts Uint8Array to base64 string
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Safely converts Uint8Array to a clean standalone ArrayBuffer
 */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return ab;
}

/**
 * Decodes base64 WAV into an AudioBuffer using the Web Audio API
 */
export async function decodeAudioBase64(base64: string): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  const bytes = base64ToUint8Array(base64);
  const ab = toArrayBuffer(bytes);
  return await ctx.decodeAudioData(ab);
}

/**
 * Creates a silence PCM buffer for cinematic pauses between scenes
 */
export function createSilencePcm(durationSec: number, sampleRate: number = 24000): Uint8Array {
  const totalSamples = Math.floor(durationSec * sampleRate);
  // 16-bit mono = 2 bytes per sample
  return new Uint8Array(totalSamples * 2);
}

/**
 * Concatenates multiple WAV base64 clips into a single pristine 24kHz mono 16-bit WAV file
 * inserting a cinematic pause (default 0.7s) between scenes.
 */
export async function concatenateWavFiles(
  wavBase64List: string[],
  pauseBetweenScenesSec: number = 0.7
): Promise<{ blob: Blob; url: string; totalDuration: number }> {
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;

  const pcmChunks: Uint8Array[] = [];
  let totalPcmBytes = 0;

  for (let i = 0; i < wavBase64List.length; i++) {
    const rawBytes = base64ToUint8Array(wavBase64List[i]);

    // WAV header is usually 44 bytes. Verify 'RIFF' and 'data' chunks
    let pcmStart = 44;
    // Look for 'data' chunk marker
    for (let b = 0; b < Math.min(rawBytes.length - 8, 200); b++) {
      if (
        rawBytes[b] === 0x64 && // 'd'
        rawBytes[b + 1] === 0x61 && // 'a'
        rawBytes[b + 2] === 0x74 && // 't'
        rawBytes[b + 3] === 0x61 // 'a'
      ) {
        pcmStart = b + 8;
        break;
      }
    }

    if (pcmStart < rawBytes.length) {
      const pcmData = rawBytes.subarray(pcmStart);
      pcmChunks.push(pcmData);
      totalPcmBytes += pcmData.byteLength;
    }

    // Insert dramatic pause between scenes if not last
    if (i < wavBase64List.length - 1 && pauseBetweenScenesSec > 0) {
      const silence = createSilencePcm(pauseBetweenScenesSec, sampleRate);
      pcmChunks.push(silence);
      totalPcmBytes += silence.byteLength;
    }
  }

  // Build master WAV with 44-byte RIFF header
  const headerBuffer = new ArrayBuffer(44);
  const view = new DataView(headerBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk size: 36 + SubChunk2Size
  view.setUint32(4, 36 + totalPcmBytes, true);
  // RIFF format
  writeString(view, 8, 'WAVE');
  // 'fmt ' chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // NumChannels (1)
  view.setUint32(24, sampleRate, true); // SampleRate (24000)
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // ByteRate
  view.setUint16(32, numChannels * bytesPerSample, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample (16)
  // 'data' chunk
  writeString(view, 36, 'data');
  view.setUint32(40, totalPcmBytes, true); // Subchunk2Size

  const combinedBytes = new Uint8Array(44 + totalPcmBytes);
  combinedBytes.set(new Uint8Array(headerBuffer), 0);

  let offset = 44;
  for (const chunk of pcmChunks) {
    combinedBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const blob = new Blob([combinedBytes], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const totalDuration = totalPcmBytes / (sampleRate * numChannels * bytesPerSample);

  return { blob, url, totalDuration };
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Formats seconds into HH:MM:SS or MM:SS
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Downloads a Blob or base64 file with specific filename
 */
export function triggerDownload(urlOrBlob: string | Blob, filename: string) {
  const link = document.createElement('a');
  if (typeof urlOrBlob === 'string') {
    link.href = urlOrBlob;
  } else {
    link.href = URL.createObjectURL(urlOrBlob);
  }
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
