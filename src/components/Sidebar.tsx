import React from 'react';
import {
  FolderKanban,
  FileText,
  Mic,
  BookOpen,
  Sliders,
  Download,
  Settings,
  Clock,
  Sparkles,
  ChevronDown,
  Plus,
  Radio,
  Music,
  Trash2,
} from 'lucide-react';
import { Episode, EpisodeStatus } from '../types';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  episodes: Episode[];
  activeEpisodeId: string;
  onSelectEpisode: (id: string) => void;
  onCreateNewEpisode: () => void;
  onDeleteEpisode: (id: string) => void;
  onClearAllEpisodes: () => void;
  selectedPart: number;
  onSelectPart: (part: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  episodes,
  activeEpisodeId,
  onSelectEpisode,
  onCreateNewEpisode,
  onDeleteEpisode,
  onClearAllEpisodes,
  selectedPart,
  onSelectPart,
}) => {
  const parts = [
    { num: 1, title: 'الجزء الأول', sub: 'الباب الأول إلى السابع' },
    { num: 2, title: 'الجزء الثاني', sub: 'أسرار طنجة العتيقة' },
    { num: 3, title: 'الجزء الثالث', sub: 'سلالة الحراس' },
    { num: 4, title: 'الجزء الرابع', sub: 'الأبواب السبعة' },
    { num: 5, title: 'الجزء الخامس', sub: 'الأثر المفقود' },
    { num: 6, title: 'الجزء السادس', sub: 'مواجهة إدريس السباعي' },
    { num: 7, title: 'الجزء السابع', sub: 'الخاتمة الكبرى' },
  ];

  const getStatusBadge = (status: EpisodeStatus) => {
    switch (status) {
      case 'published':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">منشورة</span>;
      case 'voice_approved':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950 text-blue-400 border border-blue-800">صوت معتمد</span>;
      case 'voice_review':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-400 border border-purple-800">مراجعة الصوت</span>;
      case 'voice_generating':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800">جارٍ التوليد</span>;
      case 'script_approved':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">نص معتمد</span>;
      case 'draft':
      default:
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">مسودة</span>;
    }
  };

  const navItems = [
    { id: 'editor', label: 'محرر الحلقة والمشاهد', icon: FileText },
    { id: 'narrator', label: 'الراوي الرئيسي (Master)', icon: Mic },
    { id: 'music', label: 'المخرج الموسيقي (Music DNA)', icon: Music },
    { id: 'pronunciation', label: 'قاموس النطق والمختبر', icon: BookOpen },
    { id: 'timeline', label: 'التايم لاين الصوتي', icon: Clock },
    { id: 'exports', label: 'التصدير وقوائم Cues', icon: Download },
  ];

  return (
    <aside className="w-72 bg-[#0A0A0A] border-l border-[#1E293B] flex flex-col h-[calc(100vh-57px)] sticky top-[57px] shrink-0 text-right select-none">
      {/* Studio Navigation */}
      <div className="p-3 border-b border-[#1E293B]">
        <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2 px-2 flex items-center justify-between">
          <span>أقسام الاستوديو</span>
          <span className="text-[#3AA9FF] text-[10px]">DAW v2.4</span>
        </div>
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#11233B] text-[#3AA9FF] border border-[#3AA9FF]/30 shadow-[0_0_10px_rgba(58,169,255,0.15)]'
                    : 'text-slate-300 hover:text-white hover:bg-[#162032]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#3AA9FF]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#3AA9FF]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Project Library: AL WARITH (Part 01 to Part 07) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Parts Selector Header */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-[#3AA9FF]" />
              <span>مكتبة الأجزاء (Parts)</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono-num">7 أجزاء</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {parts.map((p) => {
              const isPartActive = selectedPart === p.num;
              return (
                <button
                  key={p.num}
                  onClick={() => onSelectPart(p.num)}
                  className={`px-2 py-1.5 rounded border text-right text-[11px] transition-all ${
                    isPartActive
                      ? 'bg-[#11233B] border-[#3AA9FF] text-[#3AA9FF] font-bold shadow-[0_0_8px_rgba(58,169,255,0.2)]'
                      : 'bg-[#0F172A] border-[#1E293B] text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <div className="font-mono-num text-[10px] opacity-75">Part 0{p.num}</div>
                  <div className="truncate">{p.title}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Episodes for current selected Part */}
        <div className="pt-2">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
              حلقات الجزء {selectedPart}
            </span>
            <div className="flex items-center gap-2">
              {episodes.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('هل أنت متأكد من حذف جميع الحلقات والبدء من جديد؟')) {
                      onClearAllEpisodes();
                    }
                  }}
                  className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300"
                  title="حذف جميع الحلقات المسجلة"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                  <span>حذف الكل</span>
                </button>
              )}
              <button
                onClick={onCreateNewEpisode}
                className="flex items-center gap-1 text-[11px] text-[#3AA9FF] hover:underline"
                title="إضافة حلقة جديدة لهذا الجزء"
              >
                <Plus className="w-3 h-3" />
                <span>حلقة جديدة</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {episodes
              .filter((ep) => ep.partNumber === selectedPart)
              .map((ep) => {
                const isSelected = ep.id === activeEpisodeId;
                const readyChunks = ep.scenes.filter((s) => s.status === 'ready').length;
                return (
                  <div
                    key={ep.id}
                    className={`w-full p-2.5 rounded-lg border text-right transition-all group relative cursor-pointer ${
                      isSelected
                        ? 'bg-[#11233B]/80 border-[#3AA9FF] shadow-[0_0_12px_rgba(58,169,255,0.15)]'
                        : 'bg-[#0F172A] border-[#1E293B] hover:border-slate-700'
                    }`}
                    onClick={() => {
                      onSelectEpisode(ep.id);
                      if (activeTab !== 'editor') onSelectTab('editor');
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono-num text-[11px] font-bold text-[#3AA9FF]">
                        EP {ep.episodeNumber}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {getStatusBadge(ep.status)}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`هل أنت متأكد من حذف حلقة "${ep.title}"؟`)) {
                              onDeleteEpisode(ep.id);
                            }
                          }}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-[#162032] transition-colors"
                          title="حذف هذه الحلقة"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="font-semibold text-xs text-white group-hover:text-[#3AA9FF] truncate">
                      {ep.title}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-[#94A3B8]">
                      <span>{ep.chapter}</span>
                      <span className="font-mono-num text-slate-400">
                        {readyChunks}/{ep.scenes.length} مشهد جاهز
                      </span>
                    </div>
                  </div>
                );
              })}

            {episodes.filter((ep) => ep.partNumber === selectedPart).length === 0 && (
              <div className="p-4 border border-dashed border-[#1E293B] rounded-lg text-center text-xs text-slate-500">
                لا توجد حلقات مدخلة في هذا الجزء بعد.
                <button
                  onClick={onCreateNewEpisode}
                  className="mt-2 text-[#3AA9FF] block mx-auto text-xs font-semibold hover:underline"
                >
                  + إنشاء أول حلقة
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Production Footnote / Audio Engine Status */}
      <div className="p-3 border-t border-[#1E293B] bg-[#0A0A0A] text-[11px] text-[#94A3B8] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Gemini TTS 24kHz</span>
        </div>
        <span className="text-[10px] font-mono-num text-slate-500">Clean Voice Mode</span>
      </div>
    </aside>
  );
};
