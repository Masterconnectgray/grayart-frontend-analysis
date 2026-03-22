import React from 'react';
import type { Division } from '../../constants/Themes';
import { DIVISIONS } from '../../constants/Themes';
import { PlatformIcon } from '../../constants/SocialIcons';
import { Button } from '../../design-system';
import { CalendarClock } from 'lucide-react';

const DIVISION_SCHEDULES: Record<Division, { day: string; time: string; platforms: string[]; type: string; bestTime?: string; reason?: string }[]> = {
  'connect-gray': [
    { day: 'Seg', time: '12:00', platforms: ['instagram', 'facebook'], type: 'Reels - Dor', bestTime: '11:30-13:00', reason: 'Pico de almoco - sindicos checam redes' },
    { day: 'Ter', time: '18:30', platforms: ['linkedin'], type: 'Artigo B2B', bestTime: '17:00-19:00', reason: 'Pos-expediente - decisores ativos no LinkedIn' },
    { day: 'Qua', time: '12:00', platforms: ['instagram', 'tiktok'], type: 'Reels - Educacional', bestTime: '11:30-13:00', reason: 'Horario de almoco - engajamento maximo' },
    { day: 'Qui', time: '21:00', platforms: ['instagram', 'facebook', 'whatsapp'], type: 'Stories + Status', bestTime: '20:00-22:00', reason: 'Noite - horario de relaxamento e scroll' },
    { day: 'Sex', time: '12:00', platforms: ['instagram', 'tiktok', 'youtube'], type: 'Reels - Autoridade', bestTime: '11:30-13:00', reason: 'Sexta almoco - compartilhamento alto' },
    { day: 'Sab', time: '10:00', platforms: ['whatsapp'], type: 'Broadcast - Coffee Meet', bestTime: '09:00-11:00', reason: 'Sabado manha - leitura tranquila' },
  ],
  'gray-up': [
    { day: 'Seg', time: '07:30', platforms: ['instagram', 'facebook'], type: 'Reels - Obra', bestTime: '07:00-08:30', reason: 'Inicio de semana - equipes de obra ativas' },
    { day: 'Ter', time: '12:00', platforms: ['linkedin'], type: 'Case tecnico', bestTime: '11:30-13:00', reason: 'Almoco - gestores de facilities online' },
    { day: 'Qua', time: '19:00', platforms: ['instagram', 'tiktok'], type: 'Reels - Educacional', bestTime: '18:00-20:00', reason: 'Pos-trabalho - curiosos de engenharia' },
    { day: 'Qui', time: '12:00', platforms: ['youtube'], type: 'Video - Tour obra', bestTime: '11:30-13:30', reason: 'Almoco estendido - videos longos' },
    { day: 'Sex', time: '07:30', platforms: ['instagram', 'facebook', 'linkedin'], type: 'Post - Resultado', bestTime: '07:00-09:00', reason: 'Sexta cedo - gestores planejam semana' },
    { day: 'Sab', time: '09:00', platforms: ['whatsapp'], type: 'Broadcast - Orcamento', bestTime: '08:30-10:00', reason: 'Sabado manha - leitura de mensagens' },
  ],
  'gray-up-flow': [
    { day: 'Seg', time: '08:00', platforms: ['instagram', 'linkedin'], type: 'Reels - Dor', bestTime: '07:30-09:00', reason: 'Segunda cedo - empresarios planejam semana' },
    { day: 'Qua', time: '12:30', platforms: ['instagram', 'tiktok'], type: 'Reels - Case', bestTime: '12:00-13:00', reason: 'Almoco - donos de empresa checam redes' },
    { day: 'Qui', time: '08:00', platforms: ['linkedin'], type: 'Artigo Lean', bestTime: '07:30-09:00', reason: 'Manha - C-level lendo artigos' },
    { day: 'Sex', time: '20:00', platforms: ['instagram', 'youtube'], type: 'Reels - Educacional', bestTime: '19:00-21:00', reason: 'Sexta noite - conteudo reflexivo' },
    { day: 'Sab', time: '10:00', platforms: ['whatsapp'], type: 'Broadcast - Consultoria', bestTime: '09:00-11:00', reason: 'Sabado manha - empresario relaxado' },
  ],
  'gray-art': [
    { day: 'Seg', time: '10:00', platforms: ['instagram', 'tiktok'], type: 'Reels - Processo', bestTime: '09:30-11:00', reason: 'Segunda manha - designers e MKT online' },
    { day: 'Ter', time: '14:00', platforms: ['instagram', 'facebook'], type: 'Post - Portfolio', bestTime: '13:30-15:00', reason: 'Pos-almoco - alta navegacao visual' },
    { day: 'Qua', time: '10:00', platforms: ['tiktok', 'youtube'], type: 'Reels - Trend', bestTime: '09:30-11:00', reason: 'Quarta manha - peak de trends' },
    { day: 'Qui', time: '21:30', platforms: ['instagram'], type: 'Carrossel - Educacional', bestTime: '20:00-22:00', reason: 'Noite - saves e compartilhamentos altos' },
    { day: 'Sex', time: '14:00', platforms: ['linkedin'], type: 'Case - Branding', bestTime: '13:30-15:30', reason: 'Sexta tarde - cases de sucesso performam' },
    { day: 'Sab', time: '10:00', platforms: ['instagram', 'tiktok'], type: 'Reels - Antes/Depois', bestTime: '09:00-11:00', reason: 'Sabado manha - conteudo leve e visual' },
    { day: 'Dom', time: '20:00', platforms: ['whatsapp'], type: 'Broadcast - Semana', bestTime: '19:00-21:00', reason: 'Domingo noite - preparacao da semana' },
  ],
};

interface ScheduleCalendarProps {
  division: Division;
  scheduleDate: string;
  scheduleTime: string;
  postContent: string;
  scheduleSuccess: boolean;
  onDateChange: (val: string) => void;
  onTimeChange: (val: string) => void;
  onContentChange: (val: string) => void;
  onSchedule: () => void;
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  division,
  scheduleDate,
  scheduleTime,
  postContent,
  scheduleSuccess,
  onDateChange,
  onTimeChange,
  onContentChange,
  onSchedule
}) => {
  const theme = DIVISIONS[division];
  const schedule = DIVISION_SCHEDULES[division] || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-base font-bold mb-5">AGENDAMENTO</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold opacity-50 block mb-2">DATA</label>
            <input 
              type="date" 
              value={scheduleDate} 
              onChange={e => onDateChange(e.target.value)} 
              className="w-full p-3 rounded-xl bg-black/20 border-none text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]" 
            />
          </div>
          <div>
            <label className="text-xs font-bold opacity-50 block mb-2">HORA</label>
            <input 
              type="time" 
              value={scheduleTime} 
              onChange={e => onTimeChange(e.target.value)} 
              className="w-full p-3 rounded-xl bg-black/20 border-none text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]" 
            />
          </div>
        </div>
        <textarea
          value={postContent}
          onChange={e => onContentChange(e.target.value)}
          placeholder="Conteúdo para agendar..."
          rows={4}
          className="w-full p-4 rounded-xl bg-black/20 border-none text-white text-sm resize-none mb-4 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
        />
        <Button 
          fullWidth
          size="lg"
          onClick={onSchedule}
          className={scheduleSuccess ? '!bg-emerald-500 !text-white' : ''}
          icon={scheduleSuccess ? undefined : CalendarClock}
        >
          {scheduleSuccess ? 'AGENDADO COM SUCESSO!' : 'CONFIRMAR AGENDAMENTO'}
        </Button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-base font-bold mb-1">CRONOGRAMA ESTRATÉGICO</h3>
        <p className="text-xs opacity-50 mb-4">Horários recomendados para {theme.name}</p>
        <div className="flex flex-col gap-3">
          {schedule.map((item, i) => (
            <div 
              key={i} 
              className="p-3 border border-white/5 rounded-xl bg-black/20 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => onTimeChange(item.time)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-1 rounded bg-[var(--primary-color)]/20 text-[var(--primary-color)] text-[10px] font-bold">
                    {item.day}
                  </span>
                  <span className="font-bold text-sm">{item.time}</span>
                  {item.bestTime && <span className="text-[10px] opacity-50 font-semibold">({item.bestTime})</span>}
                </div>
                <div className="text-xs opacity-70 mt-1">{item.type}</div>
                {item.reason && <div className="text-[10px] opacity-50 mt-0.5 italic">{item.reason}</div>}
              </div>
              <div className="flex gap-1">
                {item.platforms.map(pId => (
                  <span key={pId} className="flex items-center justify-center w-7 h-7 rounded-lg overflow-hidden bg-white/5">
                    <PlatformIcon platformId={pId} size={20} />
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
