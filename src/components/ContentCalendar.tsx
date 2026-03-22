import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { Division } from '../constants/Themes';
import { useAppContext } from '../context/AppContext';
import { Card, EmptyState } from '../design-system';
import { cancelScheduledPost, listScheduledPosts } from '../services/FlowAPIService';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Clock, Trash2, Edit3 } from 'lucide-react';

interface ContentCalendarProps { division: Division }

interface CalendarPost {
  id: string;
  platform: string;
  content: string;
  time: string;
  status: 'scheduled' | 'published' | 'failed';
  date: Date;
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E4405F', tiktok: '#000000', linkedin: '#0A66C2',
  youtube: '#FF0000', facebook: '#1877F2', whatsapp: '#25D366',
};

const PLATFORM_ICONS: Record<string, string> = {
  instagram: 'IG', tiktok: 'TK', linkedin: 'IN',
  youtube: 'YT', facebook: 'FB', whatsapp: 'WA',
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendado', published: 'Publicado', failed: 'Falhou',
};

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  published: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  failed: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const ContentCalendar: React.FC<ContentCalendarProps> = ({ division }) => {
  const { addNotification } = useAppContext();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await listScheduledPosts(division);
      setPosts(raw.map(p => ({
        id: p.id,
        platform: (p.platform || 'instagram').split(',')[0].toLowerCase().trim(),
        content: p.content || '',
        time: p.scheduledAt ? new Date(p.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
        status: (p.status === 'published' ? 'published' : p.status === 'failed' ? 'failed' : 'scheduled') as CalendarPost['status'],
        date: new Date(p.scheduledAt || p.createdAt),
      })));
    } catch { setPosts([]); }
    setLoading(false);
  }, [division]);

  useEffect(() => { fetchPosts(); setSelectedDay(null); }, [fetchPosts]);

  const postsForMonth = useMemo(
    () => posts.filter(p => p.date.getMonth() === month && p.date.getFullYear() === year),
    [posts, month, year]
  );

  const postsForDay = useCallback(
    (day: number) => postsForMonth.filter(p => p.date.getDate() === day),
    [postsForMonth]
  );

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const isToday = (d: number) => d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
  const isPast = (d: number) => new Date(year, month, d) < new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const navigateMonth = (dir: -1 | 1) => {
    setMonth(m => { const n = m + dir; if (n < 0) { setYear(y => y - 1); return 11; } if (n > 11) { setYear(y => y + 1); return 0; } return n; });
    setSelectedDay(null);
  };

  const handleCancel = async (id: string) => {
    const ok = await cancelScheduledPost(id);
    if (ok) { addNotification('Agendamento cancelado', 'success'); fetchPosts(); }
    else addNotification('Erro ao cancelar', 'error');
  };

  const selectedPosts = selectedDay ? postsForDay(selectedDay) : [];

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <Card className="!p-5">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-2xl font-black text-[var(--primary-color)] uppercase tracking-tight">{MONTHS[month]}</h2>
            <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{year} — {postsForMonth.length} post{postsForMonth.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex gap-1 bg-[var(--sub-bg)] p-1 rounded-xl">
            <button onClick={() => navigateMonth(-1)} className="p-2 rounded-lg hover:bg-[var(--card-bg)] transition-colors"><ChevronLeft size={16} /></button>
            <button onClick={() => { setMonth(now.getMonth()); setYear(now.getFullYear()); setSelectedDay(null); }} className="px-3 py-1.5 rounded-lg text-[10px] font-black bg-[var(--card-bg)] text-[var(--primary-color)] uppercase tracking-widest">Hoje</button>
            <button onClick={() => navigateMonth(1)} className="p-2 rounded-lg hover:bg-[var(--card-bg)] transition-colors"><ChevronRight size={16} /></button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map(d => <div key={d} className="text-center text-[10px] font-black opacity-40 uppercase tracking-widest pb-2">{d}</div>)}
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="min-h-[72px] rounded-xl bg-[var(--sub-bg)] opacity-10" />;
            const dayPosts = postsForDay(day);
            const today = isToday(day);
            const past = isPast(day);
            const selected = day === selectedDay;
            return (
              <div key={i} onClick={() => setSelectedDay(selected ? null : day)}
                className={`min-h-[72px] p-2 rounded-xl cursor-pointer transition-all duration-200 relative group
                  ${selected ? 'ring-2 ring-[var(--primary-color)] bg-[var(--primary-color)]/10' : 'bg-[var(--sub-bg)] hover:bg-[var(--sub-bg)]/80'}
                  ${past && !today ? 'opacity-50' : ''}
                `}>
                <span className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full mb-1
                  ${today ? 'bg-[var(--primary-color)] text-[var(--card-bg)] shadow-md' : 'text-slate-400'}
                `}>{day}</span>
                <div className="flex flex-wrap gap-0.5">
                  {dayPosts.slice(0, 4).map((p, j) => (
                    <div key={j} className="w-3 h-3 rounded-full" style={{ backgroundColor: PLATFORM_COLORS[p.platform] || '#6B7280' }} title={`${p.platform} - ${p.time}`} />
                  ))}
                  {dayPosts.length > 4 && <span className="text-[8px] font-black text-slate-500 ml-0.5">+{dayPosts.length - 4}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legenda plataformas */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-white/5">
          {Object.entries(PLATFORM_COLORS).map(([k, c]) => (
            <div key={k} className="flex items-center gap-1.5 text-[10px] font-bold opacity-60">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
              <span className="capitalize">{k}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Detalhe do dia selecionado */}
      {selectedDay !== null && (
        <Card className="!p-5 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-black text-[var(--primary-color)]">
              {selectedDay} de {MONTHS[month]}
            </h3>
            <button onClick={() => setSelectedDay(null)} className="w-8 h-8 rounded-full bg-[var(--sub-bg)] flex items-center justify-center hover:bg-[var(--primary-color)] hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          {selectedPosts.length === 0 ? (
            <EmptyState icon={CalendarIcon} title="Sem posts" description="Nenhum post agendado para este dia." className="!p-6" />
          ) : (
            <div className="space-y-3">
              {selectedPosts.map(p => (
                <div key={p.id} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--sub-bg)] border-l-4 hover:translate-x-0.5 transition-transform" style={{ borderLeftColor: PLATFORM_COLORS[p.platform] || '#6B7280' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0" style={{ backgroundColor: PLATFORM_COLORS[p.platform] || '#6B7280' }}>
                    {PLATFORM_ICONS[p.platform] || p.platform.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold opacity-50 flex items-center gap-1"><Clock size={10} /> {p.time}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${STATUS_STYLES[p.status]}`}>{STATUS_LABELS[p.status]}</span>
                    </div>
                    <p className="text-sm font-medium leading-snug line-clamp-2">{p.content || '(sem conteúdo)'}</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button title="Editar" className="w-7 h-7 rounded-lg bg-[var(--card-bg)] flex items-center justify-center text-slate-400 hover:text-[var(--primary-color)] transition-colors">
                      <Edit3 size={12} />
                    </button>
                    <button title="Cancelar" onClick={() => handleCancel(p.id)} className="w-7 h-7 rounded-lg bg-[var(--card-bg)] flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {loading && (
        <div className="text-center text-xs font-bold opacity-40 py-4">Carregando agendamentos...</div>
      )}
    </div>
  );
};

export default ContentCalendar;
