import React, { useState, useCallback } from 'react';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
import { useAppContext } from '../context/AppContext';

interface ContentCalendarProps {
  division: Division;
}

type EventType = 'Reels' | 'Story' | 'Post' | 'Live' | 'Video' | 'Holiday' | 'Global';
type EventStatus = 'rascunho' | 'agendado' | 'publicado' | 'fixed';

interface ScheduledItem {
  id: string;
  day: number;
  month: number;
  year: number;
  type: EventType;
  title: string;
  status: EventStatus;
  time?: string;
}

const STATUS_COLORS: Record<EventStatus, string> = {
  rascunho: '#6b7280',
  agendado: '#f59e0b',
  publicado: '#22c55e',
  fixed: '#ef4444',
};

const STATUS_LABELS: Record<EventStatus, string> = {
  rascunho: 'Rascunho',
  agendado: 'Agendado',
  publicado: 'Publicado',
  fixed: 'Fixo',
};

const TYPE_ICONS: Record<EventType, string> = {
  Reels: '\u25B6',
  Story: '\u25CB',
  Post: '\u25A0',
  Live: '\u25CF',
  Video: '\u25B7',
  Holiday: '\u2605',
  Global: '\u25C6',
};

const EVENT_TYPES: EventType[] = ['Reels', 'Story', 'Post', 'Live', 'Video'];
const EVENT_STATUSES: EventStatus[] = ['rascunho', 'agendado', 'publicado'];

const BR_HOLIDAYS = [
  { day: 1, month: 0, title: 'Confraternizacao Universal' },
  { day: 16, month: 1, title: 'Carnaval' },
  { day: 17, month: 1, title: 'Carnaval' },
  { day: 3, month: 3, title: 'Sexta-feira Santa' },
  { day: 21, month: 3, title: 'Tiradentes' },
  { day: 1, month: 4, title: 'Dia do Trabalho' },
  { day: 4, month: 5, title: 'Corpus Christi' },
  { day: 7, month: 8, title: 'Independencia do Brasil' },
  { day: 12, month: 9, title: 'Nsa. Sra. Aparecida' },
  { day: 2, month: 10, title: 'Finados' },
  { day: 15, month: 10, title: 'Proclamacao da Republica' },
  { day: 20, month: 10, title: 'Consciencia Negra' },
  { day: 25, month: 11, title: 'Natal' },
];

const GLOBAL_EVENTS = [
  { day: 15, month: 2, title: 'Reuniao Geral Grupo Gray' },
  { day: 28, month: 2, title: 'Review Trimestral de Marketing' },
];

let _idCounter = 100;
const genId = () => `evt-${++_idCounter}`;

const INITIAL_CONTENT: Record<Division, ScheduledItem[]> = {
  'connect-gray': [
    { id: genId(), day: 3, month: 2, year: 2026, type: 'Reels', title: 'Dor: Gestao condominial caotica', status: 'publicado', time: '12:00' },
    { id: genId(), day: 5, month: 2, year: 2026, type: 'Post', title: 'Carrossel: 5 dicas para sindicos', status: 'agendado', time: '18:30' },
    { id: genId(), day: 10, month: 2, year: 2026, type: 'Story', title: 'Bastidores do evento', status: 'agendado', time: '14:00' },
    { id: genId(), day: 10, month: 2, year: 2026, type: 'Live', title: 'Live com sindico parceiro', status: 'rascunho', time: '20:00' },
    { id: genId(), day: 15, month: 2, year: 2026, type: 'Reels', title: 'Coffee Meet highlights', status: 'rascunho', time: '10:00' },
    { id: genId(), day: 20, month: 2, year: 2026, type: 'Video', title: 'Depoimento cliente Coffee Meet', status: 'agendado', time: '09:00' },
    { id: genId(), day: 22, month: 2, year: 2026, type: 'Post', title: 'Resultado: evento marco', status: 'rascunho', time: '15:00' },
    { id: genId(), day: 25, month: 2, year: 2026, type: 'Story', title: 'Contagem regressiva evento', status: 'agendado', time: '11:00' },
  ],
  'gray-up': [
    { id: genId(), day: 2, month: 2, year: 2026, type: 'Reels', title: 'Dor: Elevador parado = prejuizo', status: 'publicado', time: '07:30' },
    { id: genId(), day: 4, month: 2, year: 2026, type: 'Post', title: 'Antes/Depois modernizacao', status: 'agendado', time: '12:00' },
    { id: genId(), day: 9, month: 2, year: 2026, type: 'Video', title: 'Tour obra Salvador Dali', status: 'agendado', time: '19:00' },
    { id: genId(), day: 12, month: 2, year: 2026, type: 'Story', title: 'Equipe em campo', status: 'rascunho', time: '08:00' },
    { id: genId(), day: 16, month: 2, year: 2026, type: 'Reels', title: 'Time-lapse instalacao', status: 'agendado', time: '12:00' },
    { id: genId(), day: 21, month: 2, year: 2026, type: 'Live', title: 'FAQ manutencao preventiva', status: 'rascunho', time: '20:00' },
    { id: genId(), day: 27, month: 2, year: 2026, type: 'Post', title: 'Dica seguranca elevadores', status: 'agendado', time: '10:00' },
  ],
  'gray-up-flow': [
    { id: genId(), day: 3, month: 2, year: 2026, type: 'Reels', title: 'Dor: Empresa desorganizada', status: 'publicado', time: '08:00' },
    { id: genId(), day: 7, month: 2, year: 2026, type: 'Post', title: 'Case: reducao 30% desperdicio', status: 'agendado', time: '12:30' },
    { id: genId(), day: 12, month: 2, year: 2026, type: 'Video', title: 'Workshop Lean Manufacturing', status: 'agendado', time: '20:00' },
    { id: genId(), day: 17, month: 2, year: 2026, type: 'Story', title: 'Bastidores consultoria', status: 'rascunho', time: '14:00' },
    { id: genId(), day: 23, month: 2, year: 2026, type: 'Reels', title: '5S na pratica', status: 'rascunho', time: '09:00' },
    { id: genId(), day: 26, month: 2, year: 2026, type: 'Live', title: 'Webinar processos', status: 'agendado', time: '19:00' },
  ],
  'gray-art': [
    { id: genId(), day: 2, month: 2, year: 2026, type: 'Reels', title: 'Trend: Design minimalista 2026', status: 'publicado', time: '10:00' },
    { id: genId(), day: 5, month: 2, year: 2026, type: 'Story', title: 'Processo criativo do dia', status: 'agendado', time: '14:00' },
    { id: genId(), day: 8, month: 2, year: 2026, type: 'Post', title: 'Feed grid harmonico', status: 'agendado', time: '21:30' },
    { id: genId(), day: 11, month: 2, year: 2026, type: 'Video', title: 'Time-lapse logo design', status: 'rascunho', time: '16:00' },
    { id: genId(), day: 14, month: 2, year: 2026, type: 'Reels', title: 'Paleta de cores trending', status: 'agendado', time: '10:00' },
    { id: genId(), day: 18, month: 2, year: 2026, type: 'Live', title: 'Review de portfolio ao vivo', status: 'rascunho', time: '20:00' },
    { id: genId(), day: 22, month: 2, year: 2026, type: 'Post', title: 'Carrossel: ferramentas design', status: 'agendado', time: '11:00' },
    { id: genId(), day: 26, month: 2, year: 2026, type: 'Story', title: 'Inspiracao do dia', status: 'rascunho', time: '09:00' },
    { id: genId(), day: 28, month: 2, year: 2026, type: 'Reels', title: 'Transformacao marca cliente', status: 'agendado', time: '14:00' },
  ],
};

const MONTHS = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

// ── Modal Component ─────────────────────────────────────────────────────────
const DayModal: React.FC<{
  day: number;
  month: number;
  year: number;
  events: ScheduledItem[];
  holidays: { title: string }[];
  onClose: () => void;
  onAdd: (item: Omit<ScheduledItem, 'id'>) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: EventStatus) => void;
  theme: { colors: { primary: string } };
  isDark: boolean;
  cardBg: string;
  cardText: string;
  subBg: string;
}> = ({ day, month, year, events, holidays, onClose, onAdd, onDelete, onUpdateStatus, theme, isDark, cardBg, cardText, subBg }) => {
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

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
    border: `1px solid ${isDark ? '#444' : '#ddd'}`, background: isDark ? '#333' : '#fff',
    color: cardText, fontSize: '0.85rem', fontWeight: 600, outline: 'none',
    boxSizing: 'border-box',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: 'pointer', appearance: 'auto' as const,
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      backdropFilter: 'blur(4px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: cardBg, color: cardText, borderRadius: '20px', padding: '2rem',
        width: '480px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
        border: `1px solid ${isDark ? '#333' : '#eee'}`,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: theme.colors.primary }}>
              {day} de {MONTHS[month]}
            </h2>
            <div style={{ fontSize: '0.75rem', opacity: 0.4, fontWeight: 700, marginTop: '0.2rem' }}>{year}</div>
          </div>
          <button onClick={onClose} style={{
            width: '36px', height: '36px', borderRadius: '50%', border: 'none',
            background: subBg, color: cardText, fontSize: '1.2rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900,
          }}>X</button>
        </div>

        {/* Holidays */}
        {holidays.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            {holidays.map((h, i) => (
              <div key={i} style={{
                padding: '0.6rem 1rem', borderRadius: '10px', marginBottom: '0.5rem',
                background: `${STATUS_COLORS.fixed}15`, borderLeft: `4px solid ${STATUS_COLORS.fixed}`,
                fontSize: '0.8rem', fontWeight: 700,
              }}>
                {TYPE_ICONS.Holiday} {h.title}
              </div>
            ))}
          </div>
        )}

        {/* Events */}
        {events.length === 0 && holidays.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', background: subBg, borderRadius: '12px', opacity: 0.5, fontSize: '0.85rem', marginBottom: '1rem' }}>
            Nenhum conteudo agendado.
          </div>
        )}
        {events.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
            {events.map(evt => (
              <div key={evt.id} style={{
                padding: '0.8rem 1rem', borderRadius: '12px', background: subBg,
                borderLeft: `4px solid ${STATUS_COLORS[evt.status]}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      width: '24px', height: '24px', borderRadius: '6px',
                      background: `${STATUS_COLORS[evt.status]}20`, color: STATUS_COLORS[evt.status],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 900,
                    }}>{TYPE_ICONS[evt.type]}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: theme.colors.primary }}>{evt.type}</span>
                    {evt.time && <span style={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: 700 }}>{evt.time}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                    <select
                      value={evt.status}
                      onChange={e => onUpdateStatus(evt.id, e.target.value as EventStatus)}
                      style={{
                        fontSize: '0.6rem', fontWeight: 800, padding: '0.15rem 0.3rem',
                        borderRadius: '4px', border: 'none', cursor: 'pointer',
                        background: `${STATUS_COLORS[evt.status]}20`, color: STATUS_COLORS[evt.status],
                      }}
                    >
                      {EVENT_STATUSES.map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                    <button onClick={() => onDelete(evt.id)} style={{
                      width: '22px', height: '22px', borderRadius: '6px', border: 'none',
                      background: '#ef444420', color: '#ef4444', cursor: 'pointer',
                      fontSize: '0.65rem', fontWeight: 900,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>X</button>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', paddingLeft: '2rem' }}>{evt.title}</div>
              </div>
            ))}
          </div>
        )}

        {/* Add Form */}
        {showForm ? (
          <div style={{ padding: '1rem', borderRadius: '14px', background: subBg, display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            <div style={{ fontWeight: 800, fontSize: '0.8rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px' }}>Novo Agendamento</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              <select value={newType} onChange={e => setNewType(e.target.value as EventType)} style={selectStyle}>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value as EventStatus)} style={selectStyle}>
                {EVENT_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} style={inputStyle} />
            </div>
            <input
              type="text"
              placeholder="Titulo do conteudo..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={inputStyle}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleSubmit} style={{
                flex: 1, padding: '0.7rem', borderRadius: '10px', border: 'none',
                background: theme.colors.primary, color: isDark ? '#fff' : '#000',
                fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
              }}>ADICIONAR</button>
              <button onClick={() => setShowForm(false)} style={{
                padding: '0.7rem 1rem', borderRadius: '10px', border: 'none',
                background: isDark ? '#444' : '#ddd', color: cardText,
                fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
              }}>CANCELAR</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} style={{
            width: '100%', padding: '0.8rem', borderRadius: '12px', border: `2px dashed ${isDark ? '#444' : '#ccc'}`,
            background: 'transparent', color: theme.colors.primary,
            fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
          }}>+ NOVO AGENDAMENTO</button>
        )}
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────
const ContentCalendar: React.FC<ContentCalendarProps> = ({ division }) => {
  const { addNotification } = useAppContext();
  const theme = DIVISIONS[division];
  const isDark = division !== 'gray-art';

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [modalDay, setModalDay] = useState<number | null>(null);
  const [events, setEvents] = useState<ScheduledItem[]>(() => [...INITIAL_CONTENT[division]]);

  // Reset events when division changes
  const [prevDiv, setPrevDiv] = useState(division);
  if (division !== prevDiv) {
    setPrevDiv(division);
    setEvents([...INITIAL_CONTENT[division]]);
    setSelectedDay(null);
    setModalDay(null);
  }

  const allEvents: ScheduledItem[] = [
    ...events,
    ...GLOBAL_EVENTS.map(e => ({ ...e, id: `global-${e.day}-${e.month}`, year: 2026, type: 'Global' as EventType, status: 'fixed' as EventStatus })),
    ...BR_HOLIDAYS.map(h => ({ ...h, id: `hol-${h.day}-${h.month}`, year: 2026, type: 'Holiday' as EventType, status: 'fixed' as EventStatus })),
  ];

  const monthEvents = allEvents.filter(e => e.month === currentMonth && e.year === currentYear);

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

  const handleAddEvent = useCallback((item: Omit<ScheduledItem, 'id'>) => {
    const newItem: ScheduledItem = { ...item, id: genId() };
    setEvents(prev => [...prev, newItem]);
    addNotification(`Conteudo "${item.title}" adicionado em ${item.day}/${item.month + 1}`, 'success');
  }, [addNotification]);

  const handleDeleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    addNotification('Evento removido', 'info');
  }, [addNotification]);

  const handleUpdateStatus = useCallback((id: string, status: EventStatus) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  }, []);

  const cardBg = isDark ? '#1e1e1e' : '#fff';
  const cardText = isDark ? '#fff' : '#1a1a1a';
  const subBg = isDark ? '#2d2d2d' : '#f0f2f5';

  // count posts per day (exclude holidays/global)
  const getPostCount = (day: number) => monthEvents.filter(e => e.day === day && e.type !== 'Holiday' && e.type !== 'Global').length;

  // Summary stats
  const totalPosts = events.filter(e => e.month === currentMonth && e.year === currentYear).length;
  const draftCount = events.filter(e => e.month === currentMonth && e.year === currentYear && e.status === 'rascunho').length;
  const scheduledCount = events.filter(e => e.month === currentMonth && e.year === currentYear && e.status === 'agendado').length;
  const publishedCount = events.filter(e => e.month === currentMonth && e.year === currentYear && e.status === 'publicado').length;

  return (
    <div className="animate-fade-in">
      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', value: totalPosts, color: theme.colors.primary },
          { label: 'Rascunhos', value: draftCount, color: STATUS_COLORS.rascunho },
          { label: 'Agendados', value: scheduledCount, color: STATUS_COLORS.agendado },
          { label: 'Publicados', value: publishedCount, color: STATUS_COLORS.publicado },
        ].map((s, i) => (
          <div key={i} className="premium-card" style={{
            backgroundColor: cardBg, color: cardText, padding: '1rem',
            borderBottom: `3px solid ${s.color}`, textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Calendar Grid Section */}
        <div className="premium-card" style={{ flex: '2 1 600px', backgroundColor: cardBg, color: cardText, padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: theme.colors.primary, margin: 0 }}>{MONTHS[currentMonth].toUpperCase()}</h2>
              <div style={{ fontSize: '0.8rem', opacity: 0.4, fontWeight: 700 }}>AGENDA ESTRATEGICA {currentYear}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', background: subBg, padding: '0.3rem', borderRadius: '10px' }}>
              <button onClick={() => { setCurrentMonth(m => m === 0 ? 11 : m - 1); if (currentMonth === 0) setCurrentYear(y => y - 1); setSelectedDay(null); }} style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', background: 'transparent', color: cardText, border: 'none', cursor: 'pointer', fontWeight: 900 }}>{'\u2039'}</button>
              <button onClick={() => { const now = new Date(); setCurrentMonth(now.getMonth()); setCurrentYear(now.getFullYear()); setSelectedDay(null); }} style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', background: 'transparent', color: theme.colors.primary, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.7rem' }}>HOJE</button>
              <button onClick={() => { setCurrentMonth(m => m === 11 ? 0 : m + 1); if (currentMonth === 11) setCurrentYear(y => y + 1); setSelectedDay(null); }} style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', background: 'transparent', color: cardText, border: 'none', cursor: 'pointer', fontWeight: 900 }}>{'\u203A'}</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {DAYS.map(day => (
              <div key={day} style={{ padding: '0.8rem 0', textAlign: 'center', fontWeight: 900, fontSize: '0.7rem', opacity: 0.3, letterSpacing: '0.1em' }}>{day}</div>
            ))}
            {cells.map((day, i) => {
              if (!day) return <div key={i} style={{ minHeight: '85px', opacity: 0.05 }} />;

              const items = getEventsForDay(day);
              const holiday = items.find(e => e.type === 'Holiday');
              const postCount = getPostCount(day);
              const isSelected = day === selectedDay;

              return (
                <div
                  key={i}
                  onClick={() => {
                    setSelectedDay(isSelected ? null : day);
                    setModalDay(day);
                  }}
                  style={{
                    minHeight: '85px', padding: '0.6rem',
                    background: holiday
                      ? `${STATUS_COLORS.fixed}08`
                      : isSelected
                        ? `${theme.colors.primary}15`
                        : subBg,
                    border: isSelected
                      ? `2px solid ${theme.colors.primary}`
                      : holiday
                        ? `2px solid ${STATUS_COLORS.fixed}30`
                        : '2px solid transparent',
                    borderRadius: '14px', cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: isToday(day) ? 900 : 700,
                      color: isToday(day) ? theme.colors.primary : 'inherit',
                      ...(isToday(day) ? {
                        background: `${theme.colors.primary}20`,
                        borderRadius: '50%',
                        width: '24px', height: '24px',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      } : {}),
                    }}>{day}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      {holiday && <span title={holiday.title} style={{ fontSize: '0.6rem', color: STATUS_COLORS.fixed }}>{TYPE_ICONS.Holiday}</span>}
                      {postCount > 0 && (
                        <span style={{
                          fontSize: '0.55rem', fontWeight: 900, minWidth: '16px', height: '16px',
                          borderRadius: '8px', background: theme.colors.primary,
                          color: isDark ? '#fff' : '#000', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                        }}>{postCount}</span>
                      )}
                    </div>
                  </div>
                  {/* Event dots with status color */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                    {items.filter(it => it.type !== 'Holiday').slice(0, 4).map((item, idx) => (
                      <div key={idx} style={{
                        width: '20px', height: '20px', borderRadius: '6px',
                        background: STATUS_COLORS[item.status],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '0.6rem', fontWeight: 900,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                      }} title={`${item.type}: ${item.title} (${STATUS_LABELS[item.status]})`}>
                        {TYPE_ICONS[item.type]}
                      </div>
                    ))}
                    {items.filter(it => it.type !== 'Holiday').length > 4 && (
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '6px',
                        background: isDark ? '#555' : '#ccc', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.55rem', fontWeight: 900, color: cardText,
                      }}>+{items.filter(it => it.type !== 'Holiday').length - 4}</div>
                    )}
                  </div>
                  {/* Holiday title below */}
                  {holiday && (
                    <div style={{
                      fontSize: '0.5rem', fontWeight: 700, color: STATUS_COLORS.fixed,
                      marginTop: '0.3rem', lineHeight: 1.2, opacity: 0.8,
                    }}>{holiday.title}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Section */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Day Details */}
          <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.2rem', color: theme.colors.primary }}>DETALHES DO DIA</h3>
            {selectedDay ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{selectedDay} de {MONTHS[currentMonth]}</div>
                {getHolidaysForDay(selectedDay).map((h, i) => (
                  <div key={i} style={{
                    padding: '0.6rem 0.8rem', borderRadius: '10px',
                    background: `${STATUS_COLORS.fixed}15`, borderLeft: `4px solid ${STATUS_COLORS.fixed}`,
                    fontSize: '0.8rem', fontWeight: 700,
                  }}>{TYPE_ICONS.Holiday} {h.title}</div>
                ))}
                {getUserEventsForDay(selectedDay).length === 0 && getHolidaysForDay(selectedDay).length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', background: subBg, borderRadius: '12px', opacity: 0.5, fontSize: '0.85rem' }}>Nenhum conteudo.</div>
                ) : (
                  getUserEventsForDay(selectedDay).map(it => (
                    <div key={it.id} style={{ padding: '1rem', borderRadius: '16px', background: subBg, borderLeft: `4px solid ${STATUS_COLORS[it.status]}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: theme.colors.primary, textTransform: 'uppercase' }}>{it.type}</span>
                          {it.time && <span style={{ fontSize: '0.6rem', opacity: 0.4, fontWeight: 700 }}>{it.time}</span>}
                        </div>
                        <span style={{
                          fontSize: '0.55rem', fontWeight: 800, padding: '0.15rem 0.4rem',
                          borderRadius: '4px', background: `${STATUS_COLORS[it.status]}20`,
                          color: STATUS_COLORS[it.status],
                        }}>{STATUS_LABELS[it.status]}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{it.title}</div>
                    </div>
                  ))
                )}
                <button onClick={() => setModalDay(selectedDay)} style={{
                  width: '100%', padding: '0.8rem', borderRadius: '12px',
                  background: theme.colors.primary, color: isDark ? '#fff' : '#000',
                  fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                  marginTop: '0.5rem', border: 'none',
                }}>ABRIR GERENCIADOR</button>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.3, fontSize: '0.9rem' }}>Selecione um dia no calendario para gerenciar o conteudo.</div>
            )}
          </div>

          {/* Legend */}
          <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem', opacity: 0.4 }}>TIPOS DE CONTEUDO</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              {EVENT_TYPES.map(k => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 700 }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '6px', background: subBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>{TYPE_ICONS[k]}</span>
                  {k}
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1rem', borderTop: `1px solid ${isDark ? '#333' : '#eee'}`, paddingTop: '1rem' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', opacity: 0.4 }}>STATUS</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {EVENT_STATUSES.map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 700 }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: STATUS_COLORS[s] }} />
                    {STATUS_LABELS[s]}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming holidays */}
          <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem', opacity: 0.4 }}>FERIADOS {currentYear}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
              {BR_HOLIDAYS.map((h, i) => {
                const isPast = h.month < currentMonth || (h.month === currentMonth && h.day < today.getDate());
                const isCurrent = h.month === currentMonth;
                return (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.4rem 0.6rem', borderRadius: '8px',
                    background: isCurrent ? `${STATUS_COLORS.fixed}10` : 'transparent',
                    opacity: isPast ? 0.3 : 1,
                  }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{h.title}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.5 }}>
                      {h.day}/{h.month + 1 < 10 ? `0${h.month + 1}` : h.month + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
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
          theme={theme}
          isDark={isDark}
          cardBg={cardBg}
          cardText={cardText}
          subBg={subBg}
        />
      )}
    </div>
  );
};

export default ContentCalendar;
