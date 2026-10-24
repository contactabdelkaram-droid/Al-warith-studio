import {
  Episode,
  NarratorProfile,
  PronunciationEntry,
  AlWarithMusicDnaConfig,
  MusicTrackAsset,
} from '../types';
import { splitScriptIntoScenes } from './chunker';

const DB_NAME = 'AlWarithVoiceStudioDB';
const DB_VERSION = 1;
const AUDIO_STORE = 'audio_chunks';

// In-memory fallback map if IndexedDB is blocked or quota restricted
const memoryAudioCache = new Map<string, string>();

// IndexedDB Helper for audio storage
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAudioToIDB(key: string, base64: string): Promise<void> {
  memoryAudioCache.set(key, base64);
  try {
    const db = await openDB();
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    const store = tx.objectStore(AUDIO_STORE);
    store.put(base64, key);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve(); // Graceful fallback to memoryAudioCache
    });
  } catch (err) {
    // Silently proceed with memoryAudioCache
  }
}

export async function getAudioFromIDB(key: string): Promise<string | null> {
  if (memoryAudioCache.has(key)) {
    return memoryAudioCache.get(key) || null;
  }
  try {
    const db = await openDB();
    const tx = db.transaction(AUDIO_STORE, 'readonly');
    const store = tx.objectStore(AUDIO_STORE);
    const req = store.get(key);
    return new Promise((resolve) => {
      req.onsuccess = () => {
        const val = req.result || null;
        if (val) memoryAudioCache.set(key, val);
        resolve(val);
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

export async function deleteAudioFromIDB(key: string): Promise<void> {
  memoryAudioCache.delete(key);
  try {
    const db = await openDB();
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    const store = tx.objectStore(AUDIO_STORE);
    store.delete(key);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    // Ignore
  }
}

// LocalStorage Keys
const KEYS = {
  EPISODES: 'al_warith_episodes_v1',
  EPISODES_INITIALIZED: 'al_warith_episodes_initialized_v2',
  ACTIVE_EPISODE_ID: 'al_warith_active_episode_id_v1',
  NARRATOR: 'al_warith_master_narrator_v1',
  DICTIONARY: 'al_warith_pronunciation_dict_v1',
  WIZARD_COMPLETED: 'al_warith_wizard_completed_v1',
  DARIJA_MODE: 'al_warith_darija_mode_v1',
  MUSIC_LIBRARY: 'al_warith_music_library_v1',
  MUSIC_DNA_CONFIG: 'al_warith_music_dna_config_v1',
};

export const INITIAL_MUSIC_CONFIG: AlWarithMusicDnaConfig = {
  enabled: true,
  masterMusicVolume: 0.22,
  masterDuckingDepth: 0.65,
  crossfadeSec: 2.0,
  preserveMotif: true,
  subtleMoroccanInfluence: true,
  autoSilenceImportantLines: true,
};

// Initial Pronunciation Entries
export const INITIAL_DICTIONARY: PronunciationEntry[] = [
  {
    id: 'dict_1',
    term: 'الوارث',
    pronunciationGuide: 'الْوَارِثْ',
    category: 'term',
    note: 'اسم الرواية المركزي - يُنطق بهدوء ووقار مع تفخيم خفيف للراء',
  },
  {
    id: 'dict_2',
    term: '05:17',
    pronunciationGuide: 'الخامسة وسبعة عشر دقيقة',
    category: 'number',
    note: 'الرقم المفتاحي في السرد الزمني - يُقرأ كزمن مع وقفة قبلها وبعدها',
  },
  {
    id: 'dict_3',
    term: 'إدريس السباعي',
    pronunciationGuide: 'إِدْرِيسْ السْبَاعِي',
    category: 'name',
    note: 'الشخصية الغامضة - سكون على الدال والسين الأولى',
  },
  {
    id: 'dict_4',
    term: 'طنجة',
    pronunciationGuide: 'طَنْجَة',
    category: 'place',
    note: 'مدينة الأحداث الشمالية - تفخيم الطاء وفتح النون',
  },
  {
    id: 'dict_5',
    term: 'الحراس',
    pronunciationGuide: 'الْحُرَّاسْ',
    category: 'name',
    note: 'تشديد الراء وسكون السين',
  },
  {
    id: 'dict_6',
    term: 'الباب الأول',
    pronunciationGuide: 'الْبَابْ الأَوَّلْ',
    category: 'term',
    note: 'عنوان الفصل التأسيسي',
  },
  {
    id: 'dict_7',
    term: 'الأبواب السبعة',
    pronunciationGuide: 'الأَبْوَابْ السَّبْعَة',
    category: 'term',
    note: 'سر عالم الوارث المحرم',
  },
  {
    id: 'dict_8',
    term: 'الأثر',
    pronunciationGuide: 'الأَثَرْ',
    category: 'term',
    note: 'العلامة المتروكة في مسرح الجريمة',
  },
  {
    id: 'dict_9',
    term: 'المراقب',
    pronunciationGuide: 'الْمُرَاقِبْ',
    category: 'name',
    note: 'الظل الذي يتعقب الراوي في شوارع طنجة',
  },
  {
    id: 'dict_10',
    term: 'لقيناه',
    pronunciationGuide: 'لْقِينَاهْ',
    category: 'term',
    note: 'الكلمة المفصلية - نطق دارجة مغربي بسكون اللام وقاف واضحة',
  },
];

// Initial Master Narrator Profile
export const INITIAL_NARRATOR: NarratorProfile = {
  id: 'narrator_main',
  name: 'AL WARITH - MAIN NARRATOR',
  voiceName: 'Fenrir',
  pace: 'medium_slow',
  dramaticPauseIntensity: 'cinematic',
  darijaMode: true,
  characterVoicesEnabled: false,
  description:
    'صوت ناضج وهادئ، قريب من المستمع، واقعي سينمائي، غامض ومتحكم به، يبني التوتر تدريجياً دون مبالغة مسرحية.',
};

// Rich Initial Moroccan Darija Script for Episode 02: "لقيناه"
export const INITIAL_SCRIPT_EP02 = `[موسيقى غامضة خافتة]
كاين أحلام كتنسى تفاصيلها ملي كتفيق مع الصباح. كتشرب قهوتك، كتخرج للشارع، وكتبدا نهارك عادي بحال إلا ما وقع والو.
ولكن كاين أحلام أخرى...
كتبقى فيك. كتحفر بلاصتها فالذاكرة، وما كتمشيش.
بالنسبة ليا أنا، داك الصباح ديال خريف طنجة، ما بقاش فبالي المشهد كامل.
بقات غير كلمة وحدة. كلمة وحدة كتردد فالظلام بحال الرعد.

[صمت]
لقيناه.

***

[صوت خطوات فوق الرصيف المبلل]
الشارع كان خاوي بزاف. الضباب طالع من جهة الميناء القديم، والبرد كيضرب فالوجه.
شفت فالساعة ديال اليد.
05:17

[موسيقى توتر تدريجي]
داك التوقيت بالذات ماشي صدفة. إدريس السباعي كان ديما كيقول ليا: ملي يوصل الوقت لخمسة وسبعطاش، ما تبقاش بوحدك فطنجة.
رفعت الهاتف بيدي المرتجفة. الرقم اللي عيط ليا قبل قليل كان مخفي.
سمعت غير تنفس ثقيل فالطرف الآخر، وصوت ما كيشبه لتا صوت سمعتو فحياتي:
"الوقت قرب. الحراس وصلو للباب الأول... والوارث ما بقاش ساكت."

***

[صوت ريح قوية وفتح باب خشبي قديم]
رجعت خطوة للور. حسيت بظهري لصق مع الحيط البارد ديال العمارة القديمة.
كنشوف قدامي وما كاين والو غير الظلام. ولكنني كنسمع...
كنسمع وقع رجلين كتقرب بهدوء.
شكون اللي كاين تما؟ واش المراقب؟ ولا شي حد من طرف الأبواب السبعة؟
ماشي ساهل تعيش فهاد الرعب وتظن أنك غادي تنجو بوحدك.
هادشي اللي بديناه دابا... ما عندو حتى طريق للرجوع.

[صمت درامي]
ولكن السؤال اللي كيحرق راسي من الداخل:
شنو لقيناه بالضبط؟
واش الحقيقة... ولا الأثر اللي غادي يقضي علينا كاملين؟`;

export function getStoredNarrator(): NarratorProfile {
  try {
    const raw = localStorage.getItem(KEYS.NARRATOR);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error loading narrator', e);
  }
  return INITIAL_NARRATOR;
}

export function saveStoredNarrator(narrator: NarratorProfile): void {
  try {
    localStorage.setItem(KEYS.NARRATOR, JSON.stringify(narrator));
  } catch (e) {
    console.warn('Error saving narrator', e);
  }
}

export function getStoredDictionary(): PronunciationEntry[] {
  try {
    const raw = localStorage.getItem(KEYS.DICTIONARY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error loading dictionary', e);
  }
  return INITIAL_DICTIONARY;
}

export function saveStoredDictionary(dict: PronunciationEntry[]): void {
  try {
    localStorage.setItem(KEYS.DICTIONARY, JSON.stringify(dict));
  } catch (e) {
    console.warn('Error saving dictionary', e);
  }
}

export function isWizardCompleted(): boolean {
  try {
    return localStorage.getItem(KEYS.WIZARD_COMPLETED) === 'true';
  } catch {
    return false;
  }
}

export function setWizardCompleted(completed: boolean): void {
  try {
    localStorage.setItem(KEYS.WIZARD_COMPLETED, completed ? 'true' : 'false');
  } catch (e) {
    console.warn(e);
  }
}

export function getStoredDarijaMode(): boolean {
  try {
    const val = localStorage.getItem(KEYS.DARIJA_MODE);
    return val !== null ? val === 'true' : true;
  } catch {
    return true;
  }
}

export function setStoredDarijaMode(mode: boolean): void {
  try {
    localStorage.setItem(KEYS.DARIJA_MODE, mode ? 'true' : 'false');
  } catch (e) {
    console.warn(e);
  }
}

// Initial Episode Seed
export function getInitialEpisodes(): Episode[] {
  const scenes = splitScriptIntoScenes(INITIAL_SCRIPT_EP02);
  const ep2: Episode = {
    id: 'ep_alwarith_p01_e02',
    series: 'الوارث',
    part: 'الجزء الأول',
    partNumber: 1,
    chapter: 'الباب الأول',
    chapterNumber: 1,
    episodeNumber: '02',
    title: 'لقيناه',
    targetWordCount: 2699,
    originalScript: INITIAL_SCRIPT_EP02,
    scenes,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const ep1: Episode = {
    id: 'ep_alwarith_p01_e01',
    series: 'الوارث',
    part: 'الجزء الأول',
    partNumber: 1,
    chapter: 'الباب الأول',
    chapterNumber: 1,
    episodeNumber: '01',
    title: 'نداء طنجة',
    targetWordCount: 2699,
    originalScript: `[موسيقى غامضة]
البداية ما كانتش رسالة ولا اتصال. البداية كانت إحساس غريب بلي كاين شي حد كيتبع خطاي فزنقة سيدي بوعبيد.
كنت كنظن أن الأمر مجرد وهم، حتى تلاقيت بإدريس السباعي لأول مرة.
قال ليا كلمة وحدة:
"الوارث كيتسناك."`,
    scenes: splitScriptIntoScenes(`[موسيقى غامضة]
البداية ما كانتش رسالة ولا اتصال. البداية كانت إحساس غريب بلي كاين شي حد كيتبع خطاي فزنقة سيدي بوعبيد.
كنت كنظن أن الأمر مجرد وهم، حتى تلاقيت بإدريس السباعي لأول مرة.
قال ليا كلمة وحدة:
"الوارث كيتسناك."`),
    status: 'script_approved',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  };

  return [ep2, ep1];
}

export function getStoredEpisodes(): Episode[] {
  try {
    const raw = localStorage.getItem(KEYS.EPISODES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading episodes', e);
  }
  // User explicitly requested: "احدف جميع الحلقات" (delete all episodes)
  // Default to empty array [] so user starts with a clean slate
  return [];
}

export function clearAllEpisodes(): void {
  try {
    localStorage.setItem(KEYS.EPISODES, JSON.stringify([]));
    localStorage.setItem(KEYS.EPISODES_INITIALIZED, 'true');
    localStorage.removeItem(KEYS.ACTIVE_EPISODE_ID);
  } catch (e) {
    console.warn('Error clearing episodes', e);
  }
}

export function saveStoredEpisodes(episodes: Episode[]): void {
  try {
    // Avoid saving large base64 audio strings in localStorage to prevent QuotaExceededError
    // All audio is stored in IndexedDB or kept in memoryAudioCache
    const sanitized = episodes.map((ep) => ({
      ...ep,
      fullMixAudioBase64: undefined,
      fullMusicAudioBase64: undefined,
      scenes: ep.scenes.map((s) => ({
        ...s,
        audioBase64: s.audioBase64 ? 'indexeddb_stored' : undefined,
        music: s.music
          ? {
              ...s.music,
              audioBase64: undefined, // Strip audio from localStorage
              mixedAudioBase64: undefined, // Strip audio from localStorage
            }
          : undefined,
      })),
    }));
    localStorage.setItem(KEYS.EPISODES, JSON.stringify(sanitized));
    localStorage.setItem(KEYS.EPISODES_INITIALIZED, 'true');
  } catch (e) {
    console.warn('Error saving episodes to localStorage', e);
  }
}

export function getActiveEpisodeId(): string {
  try {
    return localStorage.getItem(KEYS.ACTIVE_EPISODE_ID) || '';
  } catch {
    return '';
  }
}

export function setActiveEpisodeId(id: string): void {
  try {
    localStorage.setItem(KEYS.ACTIVE_EPISODE_ID, id);
  } catch (e) {
    console.warn(e);
  }
}

export function getStoredMusicConfig(): AlWarithMusicDnaConfig {
  try {
    const raw = localStorage.getItem(KEYS.MUSIC_DNA_CONFIG);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading music config', e);
  }
  return INITIAL_MUSIC_CONFIG;
}

export function saveStoredMusicConfig(config: AlWarithMusicDnaConfig): void {
  try {
    localStorage.setItem(KEYS.MUSIC_DNA_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.warn('Error saving music config', e);
  }
}

export function getStoredMusicLibrary(): MusicTrackAsset[] {
  try {
    const raw = localStorage.getItem(KEYS.MUSIC_LIBRARY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Error reading music library', e);
  }
  return [];
}

export async function saveStoredMusicLibrary(library: MusicTrackAsset[]): Promise<void> {
  try {
    // Save heavy audio strings into IndexedDB / memoryAudioCache
    for (const track of library) {
      if (track.audioBase64 && track.audioBase64 !== 'indexeddb_stored') {
        await saveAudioToIDB(`music_${track.familyId}`, track.audioBase64);
      }
    }
    // Save metadata only into localStorage without audioBase64
    const sanitized = library.map((t) => ({
      ...t,
      audioBase64: 'indexeddb_stored',
    }));
    localStorage.setItem(KEYS.MUSIC_LIBRARY, JSON.stringify(sanitized));
  } catch (e) {
    console.warn('Error saving music library to localStorage', e);
  }
}

export async function loadEnrichedMusicLibrary(): Promise<MusicTrackAsset[]> {
  const metadata = getStoredMusicLibrary();
  if (metadata.length === 0) return [];
  const enriched = await Promise.all(
    metadata.map(async (t) => {
      if (t.audioBase64 === 'indexeddb_stored') {
        const audio = await getAudioFromIDB(`music_${t.familyId}`);
        return { ...t, audioBase64: audio || '' };
      }
      return t;
    })
  );
  return enriched;
}

