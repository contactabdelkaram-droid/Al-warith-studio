import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Volume2,
  RotateCw,
  Play,
  Pause,
  CheckCircle2,
  Search,
  Sparkles,
  Sliders,
  HelpCircle,
} from 'lucide-react';
import { PronunciationEntry, NarratorProfile } from '../types';
import { generateTTS } from '../utils/api';
import { getAudioContext, base64ToUint8Array, toArrayBuffer } from '../utils/audioUtils';
import { generateClientAcousticWav } from '../utils/speechSynthesizer';

interface PronunciationLabProps {
  dictionary: PronunciationEntry[];
  onAddEntry: (entry: Omit<PronunciationEntry, 'id'>) => void;
  onUpdateEntry: (id: string, updated: Partial<PronunciationEntry>) => void;
  onDeleteEntry: (id: string) => void;
  narrator: NarratorProfile;
}

export const PronunciationLab: React.FC<PronunciationLabProps> = ({
  dictionary,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  narrator,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Lab Quick Tester State
  const [labInput, setLabInput] = useState('لقيناه');
  const [labGuide, setLabGuide] = useState('لْقِينَاهْ');
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeTestingId, setActiveTestingId] = useState<string | null>(null);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);

  // New Entry Modal / Form State
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newGuide, setNewGuide] = useState('');
  const [newCategory, setNewCategory] = useState<PronunciationEntry['category']>('term');
  const [newNote, setNewNote] = useState('');

  // Editing Entry State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTerm, setEditTerm] = useState('');
  const [editGuide, setEditGuide] = useState('');
  const [editNote, setEditNote] = useState('');

  const stopAudio = () => {
    if (audioSource) {
      try {
        audioSource.stop();
      } catch (e) {}
      setAudioSource(null);
    }
    setIsPlayingAudio(false);
    setActiveTestingId(null);
  };

  const handleTestAudio = async (textToSpeak: string, entryId?: string) => {
    if (isPlayingAudio && activeTestingId === (entryId || 'lab')) {
      stopAudio();
      return;
    }
    stopAudio();

    try {
      setIsTestingAudio(true);
      if (entryId) setActiveTestingId(entryId);
      else setActiveTestingId('lab');

      const res = await generateTTS({
        text: textToSpeak,
        voiceName: narrator.voiceName,
        preset: 'mystery',
        pace: narrator.pace,
        darijaMode: true,
      });

      const audioToPlay =
        res.audioBase64 || generateClientAcousticWav(textToSpeak, 'mystery', narrator.pace);

      const ctx = getAudioContext();
      const bytes = base64ToUint8Array(audioToPlay);
      const ab = toArrayBuffer(bytes);
      const audioBuffer = await ctx.decodeAudioData(ab);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setIsPlayingAudio(false);
        setActiveTestingId(null);
        setAudioSource(null);
      };

      source.start();
      setAudioSource(source);
      setIsPlayingAudio(true);
    } catch (err: any) {
      console.error('TTS test failed', err);
      alert('تعذر اختبار النطق: ' + (err?.message || 'خطأ في التوليد'));
    } finally {
      setIsTestingAudio(false);
    }
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim() || !newGuide.trim()) return;
    onAddEntry({
      term: newTerm.trim(),
      pronunciationGuide: newGuide.trim(),
      category: newCategory,
      note: newNote.trim(),
    });
    setNewTerm('');
    setNewGuide('');
    setNewNote('');
    setIsAddingNew(false);
  };

  const handleStartEdit = (entry: PronunciationEntry) => {
    setEditingId(entry.id);
    setEditTerm(entry.term);
    setEditGuide(entry.pronunciationGuide);
    setEditNote(entry.note || '');
  };

  const handleSaveEdit = (id: string) => {
    onUpdateEntry(id, {
      term: editTerm,
      pronunciationGuide: editGuide,
      note: editNote,
    });
    setEditingId(null);
  };

  const filteredDictionary = dictionary.filter((item) => {
    const matchesSearch =
      item.term.includes(searchTerm) ||
      item.pronunciationGuide.includes(searchTerm) ||
      (item.note && item.note.includes(searchTerm));
    const matchesCat = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: PRONUNCIATION LAB (Requirement 13) */}
      <div className="bg-gradient-to-r from-[#11233B] via-[#0F172A] to-[#0A0A0A] border border-[#3AA9FF]/40 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3AA9FF]/20 border border-[#3AA9FF]/40 flex items-center justify-center text-[#3AA9FF] shadow-[0_0_15px_rgba(58,169,255,0.25)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>مختبر النطق الصوتي</span>
                <span className="text-xs px-2 py-0.5 rounded bg-[#11233B] text-[#3AA9FF] font-mono-num font-bold">
                  PRONUNCIATION LAB
                </span>
              </h2>
              <p className="text-xs text-[#94A3B8]">
                جرب نطق أي كلمة أو تشكيل صوتي بصوت الراوي الرئيسي المعتمد ({narrator.voiceName}) قبل اعتمادها في قاموس الرواية.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {['الوارث', '05:17', 'إدريس السباعي', 'طنجة', 'لقيناه'].map((sample) => (
              <button
                key={sample}
                onClick={() => {
                  setLabInput(sample);
                  const entry = dictionary.find((d) => d.term === sample);
                  if (entry) setLabGuide(entry.pronunciationGuide);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#0F172A] border border-[#1E293B] hover:border-[#3AA9FF] text-[11px] text-slate-300 font-medium transition-all"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Testing Box */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#0A0A0A]/80 border border-[#1E293B] rounded-lg p-3">
          <div>
            <label className="block text-[11px] text-[#94A3B8] font-medium mb-1">الكلمة أو العبارة الأصلية</label>
            <input
              type="text"
              value={labInput}
              onChange={(e) => setLabInput(e.target.value)}
              placeholder="مثال: لقيناه أو 05:17"
              className="w-full bg-[#162032] border border-[#1E293B] rounded px-3 py-1.5 text-xs text-white focus:border-[#3AA9FF] outline-none font-bold"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#94A3B8] font-medium mb-1">دليل النطق الصوتي / التشكيل</label>
            <input
              type="text"
              value={labGuide}
              onChange={(e) => setLabGuide(e.target.value)}
              placeholder="مثال: لْقِينَاهْ أو الخامسة وسبعة عشر دقيقة"
              className="w-full bg-[#162032] border border-[#1E293B] rounded px-3 py-1.5 text-xs text-white focus:border-[#3AA9FF] outline-none"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => handleTestAudio(labGuide || labInput, 'lab')}
              disabled={isTestingAudio || !labInput.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded bg-[#3AA9FF] hover:bg-[#60BAFF] text-black font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {isTestingAudio && activeTestingId === 'lab' ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جارٍ الاختبار...</span>
                </>
              ) : isPlayingAudio && activeTestingId === 'lab' ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-black" />
                  <span>إيقاف الصوت</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>استماع فوري (Preview)</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                if (!labInput.trim()) return;
                onAddEntry({
                  term: labInput.trim(),
                  pronunciationGuide: labGuide.trim() || labInput.trim(),
                  category: labInput.includes(':') ? 'number' : 'term',
                  note: 'أضيفت من مختبر النطق',
                });
              }}
              className="px-3 py-1.5 rounded bg-[#11233B] border border-[#3AA9FF]/40 text-[#3AA9FF] text-xs font-semibold hover:bg-[#1A3458]"
              title="حفظ النطق المعتمد في القاموس الدائم"
            >
              حفظ بالقاموس
            </button>
          </div>
        </div>
      </div>

      {/* Main Dictionary Section (Requirement 6) */}
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-[#0A0A0A]/60 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-[#3AA9FF]" />
            <div>
              <h3 className="text-sm font-bold text-white">قاموس نطق أسماء ومصطلحات عالم "الوارث"</h3>
              <p className="text-[11px] text-[#94A3B8]">
                يُطبق تلقائياً على جميع الحلقات القادمة لضمان صحة النطق الدائمة للأسماء والأرقام.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#11233B] border border-[#3AA9FF]/40 text-[#3AA9FF] hover:bg-[#1A3458] text-xs font-semibold shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة نطق جديد (Add Entry)</span>
          </button>
        </div>

        {/* Filters & Search */}
        <div className="p-3 bg-[#0F172A] border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث في القاموس أو دليل النطق..."
                className="w-full bg-[#0A0A0A] border border-[#1E293B] rounded-lg pr-8 pl-3 py-1.5 text-xs text-white focus:border-[#3AA9FF] outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'name', label: 'شخصيات وأسماء' },
              { id: 'number', label: 'أرقام وتوقيتات' },
              { id: 'place', label: 'أماكن ومدن' },
              { id: 'term', label: 'مصطلحات وسر' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded text-xs transition-all ${
                  activeCategory === cat.id
                    ? 'bg-[#11233B] text-[#3AA9FF] border border-[#3AA9FF]/30 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Add New Entry Form */}
        {isAddingNew && (
          <form
            onSubmit={handleAddNew}
            className="p-4 bg-[#11233B]/40 border-b border-[#3AA9FF]/30 space-y-3 text-xs"
          >
            <div className="font-bold text-white flex items-center justify-between">
              <span>إدخال مصطلح أو رقم جديد إلى قاموس الوارث:</span>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                إلغاء
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-[#94A3B8] mb-1">الكلمة كما تظهر في النص</label>
                <input
                  type="text"
                  required
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  placeholder="مثال: إدريس السباعي"
                  className="w-full bg-[#0A0A0A] border border-[#1E293B] rounded p-1.5 text-white outline-none focus:border-[#3AA9FF]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#94A3B8] mb-1">دليل النطق الصوتي المطلوب</label>
                <input
                  type="text"
                  required
                  value={newGuide}
                  onChange={(e) => setNewGuide(e.target.value)}
                  placeholder="مثال: إِدْرِيسْ السْبَاعِي"
                  className="w-full bg-[#0A0A0A] border border-[#1E293B] rounded p-1.5 text-white outline-none focus:border-[#3AA9FF]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#94A3B8] mb-1">التصنيف</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full bg-[#0A0A0A] border border-[#1E293B] rounded p-1.5 text-white outline-none focus:border-[#3AA9FF]"
                >
                  <option value="name">شخصية (Name)</option>
                  <option value="number">رقم أو توقيت (Number)</option>
                  <option value="place">مكان (Place)</option>
                  <option value="term">مصطلح درامي (Term)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-[#94A3B8] mb-1">ملاحظة سياقية (اختياري)</label>
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="توجيه نبرة السرد أو الوقفات..."
                className="w-full bg-[#0A0A0A] border border-[#1E293B] rounded p-1.5 text-white outline-none focus:border-[#3AA9FF]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1 bg-[#162032] text-slate-300 rounded hover:bg-[#1E293B]"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-[#3AA9FF] text-black font-bold rounded hover:bg-[#60BAFF]"
              >
                حفظ في القاموس
              </button>
            </div>
          </form>
        )}

        {/* Dictionary Table / List */}
        <div className="divide-y divide-[#1E293B]">
          {filteredDictionary.map((entry) => {
            const isEditing = editingId === entry.id;
            const isThisPlaying = isPlayingAudio && activeTestingId === entry.id;

            return (
              <div key={entry.id} className="p-3.5 hover:bg-[#162032]/40 transition-all text-xs">
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editTerm}
                        onChange={(e) => setEditTerm(e.target.value)}
                        className="bg-[#0A0A0A] border border-slate-700 rounded p-1.5 text-white text-xs"
                      />
                      <input
                        type="text"
                        value={editGuide}
                        onChange={(e) => setEditGuide(e.target.value)}
                        className="bg-[#0A0A0A] border border-slate-700 rounded p-1.5 text-white text-xs"
                      />
                    </div>
                    <input
                      type="text"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-slate-700 rounded p-1.5 text-white text-xs"
                      placeholder="ملاحظات..."
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded text-[11px]"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={() => handleSaveEdit(entry.id)}
                        className="px-3 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold"
                      >
                        حفظ التعديل
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Play Preview button */}
                      <button
                        onClick={() => handleTestAudio(entry.pronunciationGuide, entry.id)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          isThisPlaying
                            ? 'bg-[#3AA9FF] text-black shadow-[0_0_10px_#3aa9ff]'
                            : 'bg-[#162032] text-slate-300 hover:text-white hover:bg-[#1E293B]'
                        }`}
                        title="سماع النطق بالصوت المعتمد"
                      >
                        {isThisPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-black" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{entry.term}</span>
                          <span className="text-[#3AA9FF] font-mono-num font-semibold">
                            → {entry.pronunciationGuide}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0A0A0A] text-slate-400 border border-[#1E293B]">
                            {entry.category}
                          </span>
                        </div>
                        {entry.note && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{entry.note}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStartEdit(entry)}
                        className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#162032]"
                        title="تعديل النطق"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteEntry(entry.id)}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-[#162032]"
                        title="حذف من القاموس"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredDictionary.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs">
              لا توجد مدخلات مطابقة للبحث في قاموس الوارث.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
