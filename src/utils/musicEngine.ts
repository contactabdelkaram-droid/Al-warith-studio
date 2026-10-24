import { MusicFamilyId, MusicState, MusicTrackAsset } from '../types';
import { uint8ArrayToBase64 } from './audioUtils';

/**
 * AL WARITH MUSIC DNA - Procedural Dark Cinematic Underscore Engine
 *
 * Synthesizes pristine 24kHz mono WAV audio beds strictly adhering to AL WARITH MUSIC DNA:
 * - Deep atmospheric drones (D2/A1, 55Hz - 73.4Hz)
 * - Restrained low strings & cello textures
 * - The recurring 5-note AL WARITH motif (D -> Eb -> G -> F# -> A with microtonal inflection)
 * - Soft sub-bass pulses (42Hz - 48Hz)
 * - Subtle metallic resonance (bronze bowl / ancient clock chime)
 * - Designed exclusively as an underscore that leaves substantial space for spoken Moroccan Darija narration.
 */

// Five-note AL WARITH motif frequencies (Hz)
// D2 (73.42), Eb2 (77.78), G2 (98.00), F#2 (92.50), A2 (110.00)
const MOTIF_FREQS = [73.42, 77.78, 98.0, 92.5, 110.0];
const HIGH_MOTIF_FREQS = [293.66, 311.13, 392.0, 369.99, 440.0];

export interface MusicBedConfig {
  durationSec: number;
  familyId: MusicFamilyId;
  musicState: MusicState;
  intensity: number; // 0.10 to 0.45
  includeMotif?: boolean;
  motifFragmentOnly?: boolean;
  isClockSignature?: boolean; // for 05:17
}

/**
 * Encodes an AudioBuffer into a 16-bit PCM WAV Uint8Array
 */
function audioBufferToWav(buffer: AudioBuffer): Uint8Array {
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

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat 1 = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM samples with soft limiter clipping protection
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    let s = channelData[i];
    // Soft tanh limiter
    s = Math.tanh(s);
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(s * 32767)));
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Uint8Array(arrayBuffer);
}

/**
 * Procedurally generates an original AL WARITH instrumental background underscore track
 */
export async function generateAlWarithMusicBed(config: MusicBedConfig): Promise<{
  audioBase64: string;
  duration: number;
}> {
  const sampleRate = 24000;
  const duration = Math.max(8, config.durationSec);
  const OfflineAudioCtxClass =
    window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  const ctx = new OfflineAudioCtxClass(1, Math.floor(sampleRate * duration), sampleRate);

  const masterGain = ctx.createGain();
  masterGain.gain.value = Math.min(0.45, Math.max(0.08, config.intensity));
  masterGain.connect(ctx.destination);

  // Master gentle high-cut filter (to guarantee substantial space for Moroccan Darija speech)
  const masterFilter = ctx.createBiquadFilter();
  masterFilter.type = 'lowpass';
  masterFilter.frequency.value = 1600; // leaves clean midrange 2kHz-6kHz for narrator voice
  masterFilter.Q.value = 0.7;
  masterFilter.connect(masterGain);

  const now = 0;

  // 1. DEEP SUBTERRANEAN DRONE (D2 73.4Hz + Sub 36.7Hz)
  const droneOsc1 = ctx.createOscillator();
  droneOsc1.type = 'sine';
  droneOsc1.frequency.setValueAtTime(73.42, now); // D2

  // Subtle North African microtonal drone pitch drift
  droneOsc1.detune.setValueAtTime(0, now);
  droneOsc1.detune.linearRampToValueAtTime(-14, duration * 0.5);
  droneOsc1.detune.linearRampToValueAtTime(0, duration);

  const droneOsc2 = ctx.createOscillator();
  droneOsc2.type = 'triangle';
  droneOsc2.frequency.setValueAtTime(110.0, now); // A2 fifth drone

  const droneFilter = ctx.createBiquadFilter();
  droneFilter.type = 'lowpass';
  droneFilter.frequency.setValueAtTime(180, now);

  const droneGain = ctx.createGain();
  droneGain.gain.setValueAtTime(0.001, now);
  droneGain.gain.linearRampToValueAtTime(0.5, 2.5); // Smooth fade-in
  droneGain.gain.setValueAtTime(0.5, Math.max(0, duration - 2.5));
  droneGain.gain.linearRampToValueAtTime(0.001, duration); // Smooth fade-out

  droneOsc1.connect(droneFilter);
  droneOsc2.connect(droneFilter);
  droneFilter.connect(droneGain);
  droneGain.connect(masterFilter);

  droneOsc1.start(now);
  droneOsc2.start(now);
  droneOsc1.stop(duration);
  droneOsc2.stop(duration);

  // 2. SOFT SUB-BASS PULSE (Tension / Subconscious heartbeat)
  const pulseInterval = config.musicState === 'TENSION' || config.musicState === 'DANGER' ? 4 : 7;
  const pulseCount = Math.floor(duration / pulseInterval);

  for (let p = 0; p < pulseCount; p++) {
    const pulseTime = p * pulseInterval + 1.2;
    if (pulseTime + 2.5 > duration) break;

    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(43.65, pulseTime); // F0/A0 sub-frequency
    subOsc.frequency.exponentialRampToValueAtTime(36.7, pulseTime + 1.2);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.001, pulseTime);
    subGain.gain.linearRampToValueAtTime(0.65, pulseTime + 0.15);
    subGain.gain.exponentialRampToValueAtTime(0.001, pulseTime + 2.2);

    subOsc.connect(subGain);
    subGain.connect(masterGain);

    subOsc.start(pulseTime);
    subOsc.stop(pulseTime + 2.3);
  }

  // 3. RESTRAINED LOW CELLO TEXTURE (Warm, bowed low fifths)
  const celloOsc = ctx.createOscillator();
  celloOsc.type = 'sawtooth';
  celloOsc.frequency.setValueAtTime(73.42, now); // D2

  const celloFilter = ctx.createBiquadFilter();
  celloFilter.type = 'lowpass';
  celloFilter.frequency.setValueAtTime(260, now);
  celloFilter.Q.value = 1.2;

  const celloGain = ctx.createGain();
  celloGain.gain.setValueAtTime(0.001, now);
  celloGain.gain.linearRampToValueAtTime(0.25, 3.0);
  celloGain.gain.setValueAtTime(0.25, Math.max(0, duration - 3.0));
  celloGain.gain.linearRampToValueAtTime(0.001, duration);

  celloOsc.connect(celloFilter);
  celloFilter.connect(celloGain);
  celloGain.connect(masterFilter);

  celloOsc.start(now);
  celloOsc.stop(duration);

  // 4. THE 5-NOTE AL WARITH MOTIF (Sparse Felt Piano)
  // Minimal, mysterious, unresolved, recognizable, never heroic
  if (config.includeMotif !== false) {
    const motifNotes = config.motifFragmentOnly
      ? [MOTIF_FREQS[0], MOTIF_FREQS[1], MOTIF_FREQS[3]] // Fragment: D -> Eb -> F#
      : MOTIF_FREQS;

    const motifStart = config.isClockSignature ? 1.5 : 3.0;

    motifNotes.forEach((freq, idx) => {
      const noteTime = motifStart + idx * 1.8;
      if (noteTime + 2.5 > duration) return;

      // Primary felt piano fundamental
      const pianoOsc = ctx.createOscillator();
      pianoOsc.type = 'triangle';
      pianoOsc.frequency.setValueAtTime(freq * 2, noteTime); // D3 octave for warmth

      // Subtle harmonic overtone (sparse felt damper)
      const pianoOvertone = ctx.createOscillator();
      pianoOvertone.type = 'sine';
      pianoOvertone.frequency.setValueAtTime(freq * 3, noteTime);

      const pianoFilter = ctx.createBiquadFilter();
      pianoFilter.type = 'lowpass';
      pianoFilter.frequency.setValueAtTime(750, noteTime);
      pianoFilter.frequency.exponentialRampToValueAtTime(220, noteTime + 2.2);

      const pianoGain = ctx.createGain();
      pianoGain.gain.setValueAtTime(0.001, noteTime);
      pianoGain.gain.linearRampToValueAtTime(0.35, noteTime + 0.04);
      pianoGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 2.8);

      pianoOsc.connect(pianoFilter);
      pianoOvertone.connect(pianoFilter);
      pianoFilter.connect(pianoGain);
      pianoGain.connect(masterFilter);

      pianoOsc.start(noteTime);
      pianoOvertone.start(noteTime);
      pianoOsc.stop(noteTime + 3.0);
      pianoOvertone.stop(noteTime + 3.0);
    });
  }

  // 5. 05:17 SIGNATURE (Subtle metallic clock chimes derived from motif)
  if (config.isClockSignature) {
    // Two distinct clockwork bell chimes at 0.5s and 1.7s
    [0.6, 1.7].forEach((chimeTime, cIdx) => {
      const chimeFreq = cIdx === 0 ? 1046.5 : 880.0; // High C6 / A5

      const chimeOsc = ctx.createOscillator();
      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(chimeFreq, chimeTime);

      const chimeGain = ctx.createGain();
      chimeGain.gain.setValueAtTime(0.001, chimeTime);
      chimeGain.gain.linearRampToValueAtTime(0.18, chimeTime + 0.02);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, chimeTime + 2.5);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(masterFilter);

      chimeOsc.start(chimeTime);
      chimeOsc.stop(chimeTime + 2.6);
    });
  }

  // 6. OCCASIONAL SUBTLE METALLIC RESONANCE / DISTANT REVERSED TEXTURE
  if (config.musicState === 'MYSTERY' || config.musicState === 'REVELATION') {
    const metalTime = Math.max(1.0, duration * 0.45);
    if (metalTime + 4.0 <= duration) {
      const metalOsc = ctx.createOscillator();
      metalOsc.type = 'sine';
      metalOsc.frequency.setValueAtTime(587.33, metalTime); // D5 high harmonic resonance

      const metalGain = ctx.createGain();
      // Reverse-like swell then decay
      metalGain.gain.setValueAtTime(0.001, metalTime);
      metalGain.gain.linearRampToValueAtTime(0.08, metalTime + 1.8);
      metalGain.gain.exponentialRampToValueAtTime(0.001, metalTime + 4.2);

      metalOsc.connect(metalGain);
      metalGain.connect(masterFilter);

      metalOsc.start(metalTime);
      metalOsc.stop(metalTime + 4.3);
    }
  }

  // Render to AudioBuffer
  const renderedBuffer = await ctx.startRendering();
  const wavBytes = audioBufferToWav(renderedBuffer);
  const audioBase64 = uint8ArrayToBase64(wavBytes);

  return { audioBase64, duration };
}

/**
 * Pre-seeds the 7 Reusable AL WARITH Music Families into the project library
 */
export async function initializeAlWarithMusicLibrary(): Promise<MusicTrackAsset[]> {
  const families: Array<{
    id: MusicFamilyId;
    name: string;
    description: string;
    musicState: MusicState;
    intensity: number;
    durationSec: number;
    isClock?: boolean;
    motifFragmentOnly?: boolean;
  }> = [
    {
      id: 'MAIN_THEME',
      name: 'AL WARITH MAIN THEME',
      description: 'الهوية الموسيقية الرئيسية: درونات سينمائية داكنة مع موتيف الوارث الخماسي على البيانو الهادئ.',
      musicState: 'MYSTERY',
      intensity: 0.18,
      durationSec: 45,
    },
    {
      id: 'MYSTERY_BED',
      name: 'AL WARITH MYSTERY BED',
      description: 'خلفية غموض نفسي هادئة، مساحات واسعة لصوت الراوي، وطبقة تشيلو منخفضة ومتحكم بها.',
      musicState: 'MYSTERY',
      intensity: 0.15,
      durationSec: 35,
      motifFragmentOnly: true,
    },
    {
      id: 'TENSION_BED',
      name: 'AL WARITH TENSION BED',
      description: 'نبضات صب-باس تحتية وتوتر متصاعد بحذر شديد مع الاحتفاظ بوضوح الكلام.',
      musicState: 'TENSION',
      intensity: 0.28,
      durationSec: 35,
      motifFragmentOnly: true,
    },
    {
      id: 'MEMORY_BED',
      name: 'AL WARITH MEMORY BED',
      description: 'نغمات تأملية حميمية تعبر عن الذكريات والماضي الغامض في أزقة طنجة.',
      musicState: 'MEMORY',
      intensity: 0.16,
      durationSec: 35,
    },
    {
      id: 'REVELATION_BED',
      name: 'AL WARITH REVELATION BED',
      description: 'لحظات كشف الأسرار: هبوط تركيبي عميق ورنين برونزي خافت غير محلول.',
      musicState: 'REVELATION',
      intensity: 0.22,
      durationSec: 35,
    },
    {
      id: 'DANGER_BED',
      name: 'AL WARITH DANGER BED',
      description: 'إيقاع يقظ ومنخفض، إحساس بوجود المراقب والحراس يقتربون في الظلام.',
      musicState: 'DANGER',
      intensity: 0.32,
      durationSec: 30,
      motifFragmentOnly: true,
    },
    {
      id: 'SIGNATURE_0517',
      name: 'AL WARITH 05:17 SIGNATURE',
      description: 'البصمة الصوتية الخاصة بالتوقيت المفتاحي 05:17: رنين ساعة غامضة وموتيف الوارث.',
      musicState: 'REVELATION',
      intensity: 0.22,
      durationSec: 25,
      isClock: true,
    },
  ];

  const assets: MusicTrackAsset[] = [];

  for (const f of families) {
    try {
      const { audioBase64, duration } = await generateAlWarithMusicBed({
        durationSec: f.durationSec,
        familyId: f.id,
        musicState: f.musicState,
        intensity: f.intensity,
        includeMotif: true,
        motifFragmentOnly: f.motifFragmentOnly,
        isClockSignature: f.isClock,
      });

      assets.push({
        id: `music_asset_${f.id.toLowerCase()}`,
        familyId: f.id,
        name: f.name,
        description: f.description,
        musicState: f.musicState,
        audioBase64,
        duration,
        motifVersion: '5-note unresolved',
        isApproved: true,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn(`Failed to synthesize family ${f.id}`, e);
    }
  }

  return assets;
}
