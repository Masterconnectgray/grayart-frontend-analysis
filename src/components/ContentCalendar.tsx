import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { Division } from '../constants/Themes';
import { useAppContext } from '../context/AppContext';
import { Card, EmptyState } from '../design-system';
import { cancelScheduledPost, listScheduledPosts } from '../services/FlowAPIService';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Clock, Plus, Trash2 } from 'lucide-react';

interface ContentCalendarProps {
  division: Division;
}

type EventType = 'Reels' | 'Story' | 'Post' | 'Live' | 'Video' | 'Holiday' | 'Global';
type EventStatus = 'rascunho' | 'agendado' | 'publicado' | 'fixed';

interface ScheduledItem {
  id: string;
  backendId?: string;
  source: 'local' | 'backend';
  day: number;
  month: number;
  year: number;
  type: EventType;
  title: string;
  status: EventStatus;
  time?: string;
}

const STATUS_COLORS: Record<EventStatus, string> = {
  rascunho: 'bg-slate-500/10 text-slate-500 border-slate-500/30',
  agendado: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  publicado: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  fixed: 'bg-red-500/10 text-red-500 border-red-500/30',
};

const STATUS_LABELS: Record<EventStatus, string> = {
  rascunho: 'Rascunho',
  agendado: 'Agendado',
  publicado: 'Publicado',
  fixed: 'Fixo',
};

const TYPE_ICONS: Record<EventType, string> = {
  Reels: '▶',
  Story: '○',
  Post: '■',
  Live: '●',
  Video: '▷',
  Holiday: '★',
  Global: '◆',
};

const EVENT_TYPES: EventType[] = ['Reels', 'Story', 'Post', 'Live', 'Video'];
const EVENT_STATUSES: EventStatus[] = ['rascunho', 'agendado', 'publicado'];

const BR_HOLIDAYS = [
  { day: 1, month: 0, title: 'Confraternização Universal' },
  { day: 16, month: 1, title: 'Carnaval' },
  { day: 17, month: 1, title: 'Carnaval' },
  { day: 3, month: 3, title: 'Sexta-feira Santa' },
  { day: 21, month: 3, title: 'Tiradentes' },
  { day: 1, month: 4, title: 'Dia do Trabalho' },
  { day: 4, month: 5, title: 'Corpus Christi' },
  { day: 7, month: 8, title: 'Independência do Brasil' },
  { day: 12, month: 9, title: 'Nsa. Sra. Aparecida' },
  { day: 2, month: 10, title: 'Finados' },
  { day: 15, month: 10, title: 'Proclamação da República' },
  { day: 20, month: 10, title: 'Consciência Negra' },
  { day: 25, month: 11, title: 'Natal' },
];

const GLOBAL_EVENTS = [
  { day: 15, month: 2, title: 'Reunião Geral Grupo Gray' },
  { day: 28, month: 2, title: 'Review Trimestral de Marketing' },
];

let _idCounter = 100;
const genId = () => `evt-${++_idCounter}`;

const INITIAL_CONTENT: Record<Division, ScheduledItem[]> = {
  'connect-gray': [
    { id: genId(), source: 'local', day: 10, month: 2, year: 2026, type: 'Live', title: 'Live com síndico parceiro', status: 'rascunho', time: '20:00' },
    { id: genId(), source: 'local', day: 15, month: 2, year: 2026, type: 'Reels', title: 'Coffee Meet highlights', status: 'rascunho', time: '10:00' },
    { id: genId(), source: 'local', day: 22, month: 2, year: 2026, type: 'Post', title: 'Resultado: evento marco', status: 'rascunho', time: '15:00' },
  ],
  'gray-up': [
    { id: genId(), source: 'local', day: 12, month: 2, year: 2026, type: 'Story', title: 'Equipe em campo', status: 'rascunho', time: '08:00' },
    { id: genId(), source: 'local', day: 21, month: 2, year: 2026, type: 'Live', title: 'FAQ manutenção preventiva', status: 'rascunho', time: '20:00' },
  ],
  'gray-up-flow': [
    { id: genId(), source: 'local', day: 17, month: 2, year: 2026, type: 'Story', title: 'Bastidores consultoria', status: 'rascunho', time: '14:00' },
    { id: genId(), source: 'local', day: 23, month: 2, year: 2026, type: 'Reels', title: '5S na prática', status: 'rascunho', time: '09:00' },
  ],
  'gray-art': [
    { id: genId(), source: 'local', day: 11, month: 2, year: 2026, type: 'Video', title: 'Time-lapse logo design', status: 'rascunho', time: '16:00' },
    { id: genId(), source: 'local', day: 18, month: 2, year: 2026, type: 'Live', title: 'Review de portfólio ao vivo', status: 'rascunho', time: '20:00' },
    { id: genId(), source: 'local', day: 26, month: 2, year: 2026, type: 'Story', title: 'Inspiração do dia', status: 'rascunho', time: '09:00' },
  ],
};

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

function inferEventType(platform: string): EventType {
  if (platform === 'youtube') return 'Video';
  if (platform === 'whatsapp') return 'Story';
  return 'Post';
}

function mapStatus(status: string): EventStatus {
  if (status === 'published') return 'publicado';
  if (status === 'failed') return 'rascunho';
  return 'agendado';
}

// ── Modal Component ─────────────────────────────────────────────────────────

interface DayModalProps {
  day: number;
  month: number;
  year: number;
  events: ScheduledItem[];
  holidays: { title: string }[];
  onClose: () => void;
  onAdd: (item: Omit<ScheduledItem, 'id' | 'source' | 'backendId'>) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: EventStatus) => void;
}

const DayModal: React.FC<DayModalProps> = ({ day, month, year, events, holidays, onClose, onAdd, onDelete, onUpdateStatus }) => {
  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState<EventType>('Reels');
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('12:00');
  const [newStatus, setNewStatus] = useState<EventStatus>('rascunho');

  const handleSubmit = () => {
    if (!newTitle.trim()) return;
    onAdd({ day, month, year, type: newType, title: newTitle.trim(), status: newStatus, time: newTime });
    setNewTitle('');
    setShowForm(false);
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div onClick={e => e.stopPropagation()} className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--card-bg)] text-[var(--card-text)] rounded-[24px] p-6 shadow-2xl border border-white/10 dark:border-black/10 animate-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-black text-[var(--primary-color)]">{day} de {MONTHS[month]}</h2>
            <div className="text-xs font-bold opacity-50 tracking-widest uppercase mt-1">{year}</div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-[var(--sub-bg)] flex items-center justify-center hover:bg-[var(--primary-color)] hover:text-white transition-colors">
            <X size={20} className="opacity-70 hover:opacity-100" />
          </button>
        </div>

        {holidays.length > 0 && (
          <div className="mb-4 space-y-2">
            {holidays.map((h, i) => (
              <div key={i} className="px-4 py-3 rounded-xl bg-red-500/10 border-l-4 border-red-500 text-red-500 text-sm font-bold flex items-center gap-2">
                <span className="text-lg">{TYPE_ICONS.Holiday}</span> {h.title}
              </div>
            ))}
          </div>
        )}

        {events.length === 0 && holidays.length === 0 && (
          <EmptyState
             icon={CalendarIcon}
             title="Nenhum conteúdo"
             description="Você não tem nenhum conteúdo agendado ou feriado para este dia."
             className="mb-6 !p-6"
          />
        )}

        {events.length > 0 && (
          <div className="space-y-3 mb-6">
            {events.map(evt => {
              const statusClass = STATUS_COLORS[evt.status];
              return (
                <div key={evt.id} className="p-4 rounded-xl bg-[var(--sub-bg)] border-l-4" style={{ borderLeftColor: statusClass.split(' ')[1].replace('text-', 'var(--').replace('500', 'color)') }}>
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`w-6 h-6 rounded flex items-center justify-center text-xs ${statusClass}`}>
                        {TYPE_ICONS[evt.type]}
                      </span>
                      <span className="text-[10px] font-black uppercase text-[var(--primary-color)] tracking-wider">{evt.type}</span>
                      {evt.time && <span className="text-[10px] font-bold opacity-50 flex items-center gap-1"><Clock size={10}/> {evt.time}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={evt.status}
                        onChange={e => onUpdateStatus(evt.id, e.target.value as EventStatus)}
                        className={`text-[10px] font-black px-2 py-1 rounded-md outline-none cursor-pointer appearance-none text-center ${statusClass}`}
                      >
                        {EVENT_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                      <button onClick={() => onDelete(evt.id)} className="w-6 h-6 rounded flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="font-bold text-sm ml-8 opacity-90">{evt.title}</div>
                </div>
              );
            })}
          </div>
        )}

        {showForm ? (
          <div className="p-5 rounded-2xl bg-[var(--sub-bg)] space-y-4 shadow-inner border border-white/5 dark:border-black/5">
            <div className="text-[10px] font-black uppercase tracking-widest opacity-50 flex items-center gap-2">
               <Plus size={12} className="text-[var(--primary-color)]" /> Novo Agendamento
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select value={newType} onChange={e => setNewType(e.target.value as EventType)} className="w-full p-2.5 rounded-lg bg-[var(--card-bg)] text-[var(--card-text)] text-sm font-bold border border-white/10 outline-none focus:ring-2 ring-[var(--primary-color)]/50 focus:border-transparent">
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value as EventStatus)} className="w-full p-2.5 rounded-lg bg-[var(--card-bg)] text-[var(--card-text)] text-sm font-bold border border-white/10 outline-none focus:ring-2 ring-[var(--primary-color)]/50 focus:border-transparent">
                {EVENT_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full p-2.5 rounded-lg bg-[var(--card-bg)] text-[var(--card-text)] text-sm font-bold border border-white/10 outline-none focus:ring-2 ring-[var(--primary-color)]/50 focus:border-transparent" />
            </div>
            
            <input
              type="text"
              placeholder="Título do conteúdo..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full p-3 rounded-lg bg-[var(--card-bg)] text-[var(--card-text)] text-sm font-bold border border-white/10 outline-none focus:ring-2 ring-[var(--primary-color)]/50 focus:border-transparent"
              autoFocus
            />
            
            <div className="flex gap-3 pt-2">
              <button onClick={handleSubmit} className="flex-1 py-3 rounded-xl bg-[var(--primary-color)] text-[var(--card-bg)] text-xs font-black hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[var(--primary-color)]/20">
                ADICIONAR
              </button>
              <button onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl bg-[var(--card-bg)] text-[var(--card-text)] text-xs font-black opacity-70 hover:opacity-100 transition-opacity">
                CANCELAR
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} className="w-full py-4 rounded-xl border-2 border-dashed border-[var(--primary-color)]/40 text-[var(--primary-color)] text-xs font-black hover:bg-[var(--primary-color)]/5 transition-colors flex items-center justify-center gap-2">
            <Plus size={16} /> NOVO AGENDAMENTO
          </button>
        )}
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────

const ContentCalendar: React.FC<ContentCalendarProps> = ({ division }) => {
  const { addNotification } = useAppContext();

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [modalDay, setModalDay] = useState<number | null>(null);
  const [localEvents, setLocalEvents] = useState<ScheduledItem[]>(() => [...INITIAL_CONTENT[division]]);
  const [backendEvents, setBackendEvents] = useState<ScheduledItem[]>([]);

  const refreshBackendEvents = useCallback(async () => {
    try {
      const posts = await listScheduledPosts(division);
      const mapped = posts.map((post) => {
        const parsed = post.scheduledAt ? new Date(post.scheduledAt) : new Date();
        return {
          id: `backend-${post.id}`,
          backendId: post.id,
          source: 'backend' as const,
          day: parsed.getDate(),
          month: parsed.getMonth(),
          year: parsed.getFullYear(),
          type: inferEventType(post.platform.split(',')[0] || 'instagram'),
          title: post.content,
          status: mapStatus(post.status),
          time: post.scheduledAt
            ? parsed.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : undefined,
        };
      });
      setBackendEvents(mapped);
    } catch {
      setBackendEvents([]);
    }
  }, [division]);

  useEffect(() => {
    setLocalEvents([...INITIAL_CONTENT[division]]);
    setSelectedDay(null);
    setModalDay(null);
    refreshBackendEvents();
  }, [division, refreshBackendEvents]);

  const allEvents: ScheduledItem[] = [
    ...localEvents,
    ...backendEvents,
    ...GLOBAL_EVENTS.map(e => ({ ...e, id: `global-${e.day}-${e.month}`, source: 'local' as const, year: 2026, type: 'Global' as EventType, status: 'fixed' as EventStatus })),
    ...BR_HOLIDAYS.map(h => ({ ...h, id: `hol-${h.day}-${h.month}`, source: 'local' as const, year: 2026, type: 'Holiday' as EventType, status: 'fixed' as EventStatus })),
  ];

  const monthEvents = useMemo(
    () => allEvents.filter(e => e.month === currentMonth && e.year === currentYear),
    [allEvents, currentMonth, currentYear]
  );

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d: number) => d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const getEventsForDay = useCallback((day: number) => monthEvents.filter(e => e.day === day), [monthEvents]);
  const getHolidaysForDay = (day: number) => BR_HOLIDAYS.filter(h => h.month === currentMonth && h.day === day);
  const getUserEventsForDay = (day: number) => monthEvents.filter(e => e.day === day && e.type !== 'Holiday' && e.type !== 'Global');

  const handleAddEvent = useCallback((item: Omit<ScheduledItem, 'id' | 'source' | 'backendId'>) => {
    const newItem: ScheduledItem = { ...item, id: genId(), source: 'local' };
    setLocalEvents(prev => [...prev, newItem]);
    addNotification(`Conteúdo "${item.title}" adicionado em ${item.day}/${item.month + 1}`, 'success');
  }, [addNotification]);

  const handleDeleteEvent = useCallback(async (id: string) => {
    const backendEvent = backendEvents.find((event) => event.id === id);
    if (backendEvent?.backendId) {
      const ok = await cancelScheduledPost(backendEvent.backendId);
      if (ok) {
        await refreshBackendEvents();
        addNotification('Agendamento removido do backend.', 'info');
      } else {
        addNotification('Não foi possível remover o agendamento.', 'error');
      }
      return;
    }

    setLocalEvents(prev => prev.filter(e => e.id !== id));
    addNotification('Evento removido', 'info');
  }, [addNotification, backendEvents, refreshBackendEvents]);

  const handleUpdateStatus = useCallback((id: string, status: EventStatus) => {
    const backendEvent = backendEvents.find((event) => event.id === id);
    if (backendEvent) {
      addNotification('Status de item sincronizado deve ser alterado pelo Publicador.', 'info');
      return;
    }

    setLocalEvents(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  }, [addNotification, backendEvents]);

  const getPostCount = (day: number) => monthEvents.filter(e => e.day === day && e.type !== 'Holiday' && e.type !== 'Global').length;

  const totalPosts = monthEvents.filter(e => e.type !== 'Holiday' && e.type !== 'Global').length;
  const draftCount = monthEvents.filter(e => e.status === 'rascunho').length;
  const scheduledCount = monthEvents.filter(e => e.status === 'agendado').length;
  const publishedCount = monthEvents.filter(e => e.status === 'publicado').length;

  return (
    <div className="animate-in fade-in duration-300">
      
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: totalPosts, borderClass: `border-[var(--primary-color)]`, textClass: `text-[var(--primary-color)]` },
          { label: 'Rascunhos', value: draftCount, borderClass: `border-slate-500`, textClass: `text-slate-500` },
          { label: 'Agendados', value: scheduledCount, borderClass: `border-amber-500`, textClass: `text-amber-500` },
          { label: 'Publicados', value: publishedCount, borderClass: `border-emerald-500`, textClass: `text-emerald-500` },
        ].map((s, i) => (
          <Card key={i} className={`border-b-4 ${s.borderClass} !p-4 flex flex-col items-center justify-center`}>
            <div className={`text-3xl font-black mb-1 ${s.textClass}`}>{s.value}</div>
            <div className="text-[10px] font-black opacity-50 uppercase tracking-widest">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Calendar Grid Section */}
        <Card className="flex-1 w-full !p-4 sm:!p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-black text-[var(--primary-color)] mb-1 uppercase tracking-tight">
                {MONTHS[currentMonth]}
              </h2>
              <div className="text-xs font-bold opacity-50 uppercase tracking-widest flex items-center gap-2">
                 <CalendarIcon size={14} className="text-[var(--primary-color)]" />
                 Agenda Estratégica {currentYear}
              </div>
            </div>
            <div className="flex gap-2 bg-[var(--sub-bg)] p-1.5 rounded-xl self-start sm:self-auto shadow-inner border border-white/5 dark:border-black/5">
              <button onClick={() => { setCurrentMonth(m => m === 0 ? 11 : m - 1); if (currentMonth === 0) setCurrentYear(y => y - 1); setSelectedDay(null); }} className="p-2 rounded-lg hover:bg-[var(--card-bg)] hover:shadow-sm transition-all text-slate-400 hover:text-[var(--card-text)]">
                <ChevronLeft size={18} strokeWidth={3} />
              </button>
              <button onClick={() => { const now = new Date(); setCurrentMonth(now.getMonth()); setCurrentYear(now.getFullYear()); setSelectedDay(null); }} className="px-4 py-2 rounded-lg text-[10px] font-black bg-[var(--card-bg)] text-[var(--primary-color)] shadow-sm hover:brightness-110 transition-all uppercase tracking-widest">
                Hoje
              </button>
              <button onClick={() => { setCurrentMonth(m => m === 11 ? 0 : m + 1); if (currentMonth === 11) setCurrentYear(y => y + 1); setSelectedDay(null); }} className="p-2 rounded-lg hover:bg-[var(--card-bg)] hover:shadow-sm transition-all text-slate-400 hover:text-[var(--card-text)]">
                <ChevronRight size={18} strokeWidth={3} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {DAYS.map(day => (
              <div key={day} className="text-center font-black text-[10px] sm:text-xs opacity-40 uppercase tracking-widest pb-2">
                {day}
              </div>
            ))}
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="min-h-[80px] sm:min-h-[100px] rounded-2xl bg-[var(--sub-bg)] opacity-10" />;

              const items = getEventsForDay(day);
              const holiday = items.find(e => e.type === 'Holiday');
              const postCount = getPostCount(day);
              const isSelected = day === selectedDay;
              const isTodayDay = isToday(day);

              return (
                <div
                  key={i}
                  onClick={() => {
                    setSelectedDay(isSelected ? null : day);
                    setModalDay(day);
                  }}
                  className={`min-h-[80px] sm:min-h-[100px] p-2 sm:p-3 rounded-2xl cursor-pointer transition-all duration-300 relative group
                    ${holiday ? 'bg-red-500/5 hover:bg-red-500/10' : isSelected ? 'bg-[var(--primary-color)]/10 shadow-md shadow-[var(--primary-color)]/10' : 'bg-[var(--sub-bg)] hover:-translate-y-1 hover:shadow-md'}
                    ${isSelected ? 'ring-2 ring-[var(--primary-color)]' : holiday ? 'ring-1 ring-red-500/20' : 'ring-1 ring-transparent hover:ring-[var(--primary-color)]/30'}
                  `}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm sm:text-base font-black w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-colors
                      ${isTodayDay ? 'bg-[var(--primary-color)] text-[var(--card-bg)] shadow-md shadow-[var(--primary-color)]/30' : 'text-slate-400 group-hover:text-[var(--card-text)]'}
                    `}>
                      {day}
                    </span>
                    <div className="flex items-center gap-1">
                      {holiday && <span title={holiday.title} className="text-red-500 text-xs sm:text-sm">{TYPE_ICONS.Holiday}</span>}
                      {postCount > 0 && (
                        <span className="text-[10px] font-black w-4 h-4 rounded-full bg-[var(--primary-color)] text-[var(--card-bg)] flex items-center justify-center shadow-sm">
                          {postCount}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-auto">
                    {items.filter(it => it.type !== 'Holiday').slice(0, 3).map((item, idx) => {
                       const statusClass = STATUS_COLORS[item.status];
                       return (
                         <div key={idx} className={`w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center text-[8px] sm:text-[10px] shadow-sm ${statusClass}`} title={`${item.type}: ${item.title}`}>
                           {TYPE_ICONS[item.type]}
                         </div>
                       );
                    })}
                    {items.filter(it => it.type !== 'Holiday').length > 3 && (
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center text-[8px] font-black bg-slate-500/20 text-slate-500">
                        +{items.filter(it => it.type !== 'Holiday').length - 3}
                      </div>
                    )}
                  </div>
                  
                  {holiday && (
                    <div className="text-[8px] sm:text-[9px] font-bold text-red-500 mt-2 leading-tight opacity-80 truncate" title={holiday.title}>
                      {holiday.title}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Sidebar Section */}
        <div className="w-full lg:w-[320px] flex flex-col gap-6 shrink-0">
          
          <Card className="!p-5 border border-white/5 dark:border-black/5">
            <h3 className="text-xs font-black tracking-widest uppercase text-[var(--primary-color)] mb-4 flex items-center gap-2">
              <CalendarIcon size={14} /> Detalhes do Dia
            </h3>
            
            {selectedDay ? (
              <div className="flex flex-col gap-4">
                <div className="text-3xl font-black mb-1">{selectedDay} <span className="text-xl opacity-50">{MONTHS[currentMonth]}</span></div>
                
                {getHolidaysForDay(selectedDay).map((h, i) => (
                  <div key={i} className="px-4 py-3 rounded-xl bg-red-500/10 border-l-4 border-red-500 text-sm font-bold text-red-500 flex items-center gap-2">
                    {TYPE_ICONS.Holiday} {h.title}
                  </div>
                ))}
                
                {getUserEventsForDay(selectedDay).length === 0 && getHolidaysForDay(selectedDay).length === 0 ? (
                  <EmptyState
                     icon={CalendarIcon}
                     title="Sem Conteúdo"
                     description="O dia selecionado está vazio."
                     className="!p-4"
                  />
                ) : (
                  getUserEventsForDay(selectedDay).map(it => {
                    const statusClass = STATUS_COLORS[it.status];
                    return (
                      <div key={it.id} className="p-4 rounded-xl bg-[var(--sub-bg)] border-l-4 shadow-sm hover:-translate-y-0.5 transition-transform" style={{ borderLeftColor: statusClass.split(' ')[1].replace('text-', 'var(--').replace('500', 'color)') }}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black text-[var(--primary-color)] uppercase tracking-wider bg-[var(--primary-color)]/10 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                              <span>{TYPE_ICONS[it.type]}</span> {it.type}
                            </span>
                            {it.time && <span className="text-[10px] font-bold opacity-50 flex items-center gap-1"><Clock size={10} /> {it.time}</span>}
                          </div>
                        </div>
                        <div className="font-bold text-sm leading-snug">{it.title}</div>
                        <div className="mt-2.5">
                          <span className={`text-[9px] font-black px-2 py-1 rounded inline-block uppercase tracking-wider ${statusClass}`}>
                             {STATUS_LABELS[it.status]}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                
                <button onClick={() => setModalDay(selectedDay)} className="mt-2 w-full py-3.5 rounded-xl bg-[var(--primary-color)] text-[var(--card-bg)] text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[var(--primary-color)]/20 flex items-center justify-center gap-2">
                  <CalendarIcon size={14} /> GERENCIADOR
                </button>
              </div>
            ) : (
              <EmptyState
                 icon={CalendarIcon}
                 title="Nenhum dia selecionado"
                 description="Selecione um dia no calendário para gerenciar o conteúdo."
                 className="mt-6 border-none bg-transparent"
              />
            )}
          </Card>

          <Card className="!p-5">
            <h3 className="text-[10px] font-black tracking-widest uppercase opacity-50 mb-4">Tipos de Conteúdo</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {EVENT_TYPES.map(k => (
                <div key={k} className="flex items-center gap-2 text-xs font-bold">
                  <span className="w-6 h-6 rounded flex items-center justify-center bg-[var(--sub-bg)] text-slate-400 shadow-sm border border-white/5 dark:border-black/5">{TYPE_ICONS[k]}</span>
                  {k}
                </div>
              ))}
            </div>
            
            <div className="pt-4 border-t border-[var(--sub-bg)]">
              <h4 className="text-[10px] font-black tracking-widest uppercase opacity-50 mb-3">Status</h4>
              <div className="flex flex-col gap-2.5">
                {EVENT_STATUSES.map(s => {
                   const statusClass = STATUS_COLORS[s];
                   return (
                     <div key={s} className="flex items-center gap-2 text-xs font-bold">
                       <div className={`w-3 h-3 rounded-[3px] shadow-sm ${statusClass}`} />
                       {STATUS_LABELS[s]}
                     </div>
                   );
                })}
              </div>
            </div>
          </Card>

          <Card className="!p-5">
            <h3 className="text-[10px] font-black tracking-widest uppercase opacity-50 mb-4 flex items-center justify-between">
               Feriados {currentYear}
               <span className="text-[var(--primary-color)] font-black text-xs">{BR_HOLIDAYS.length}</span>
            </h3>
            <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-2 scrollbar-thin">
              {BR_HOLIDAYS.map((h, i) => {
                const isPast = h.month < currentMonth || (h.month === currentMonth && h.day < today.getDate());
                const isCurrent = h.month === currentMonth;
                return (
                  <div key={i} className={`flex justify-between items-center p-2.5 rounded-lg text-xs transition-colors ${isCurrent ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'hover:bg-[var(--sub-bg)]'} ${isPast ? 'opacity-30 grayscale' : 'opacity-100'}`}>
                    <span className="font-bold flex items-center gap-1.5 truncate"><span className="text-[10px]">{TYPE_ICONS.Holiday}</span> {h.title}</span>
                    <span className="font-black opacity-60 ml-2 shrink-0">{h.day}/{String(h.month + 1).padStart(2, '0')}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {modalDay !== null && (
        <DayModal
          day={modalDay}
          month={currentMonth}
          year={currentYear}
          events={getUserEventsForDay(modalDay)}
          holidays={getHolidaysForDay(modalDay)}
          onClose={() => setModalDay(null)}
          onAdd={handleAddEvent}
          onDelete={handleDeleteEvent}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  );
};

export default ContentCalendar;
