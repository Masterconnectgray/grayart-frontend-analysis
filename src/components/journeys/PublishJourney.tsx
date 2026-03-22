import React, { useState } from 'react';
import type { Division } from '../../constants/Themes';
import MultiChannelPublisher from '../MultiChannelPublisher';
import ContentCalendar from '../ContentCalendar';
import FeedPreview from '../FeedPreview';
import { Send, Calendar, LayoutGrid } from 'lucide-react';

export const PublishJourney: React.FC<{ division: Division }> = ({ division }) => {
  const [tab, setTab] = useState<'publisher' | 'calendar' | 'feed'>('publisher');
  const isDark = division !== 'gray-art';

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className={`flex flex-wrap items-center gap-2 border-b pb-4 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
        <button 
          onClick={() => setTab('publisher')} 
          className={`flex items-center gap-2 px-4 py-2 font-semibold text-sm transition-all rounded-lg ${
            tab === 'publisher' ? (isDark ? 'bg-[var(--primary-color)] text-[#1a1a1a]' : 'bg-[var(--primary-color)] text-white shadow-md') : (isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-black hover:bg-black/5')
          }`}
        >
          <Send className="w-4 h-4" />
          Publicador
        </button>
        <button 
          onClick={() => setTab('calendar')} 
          className={`flex items-center gap-2 px-4 py-2 font-semibold text-sm transition-all rounded-lg ${
            tab === 'calendar' ? (isDark ? 'bg-[var(--primary-color)] text-[#1a1a1a]' : 'bg-[var(--primary-color)] text-white shadow-md') : (isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-black hover:bg-black/5')
          }`}
        >
          <Calendar className="w-4 h-4" />
          Calendário
        </button>
        <button 
          onClick={() => setTab('feed')} 
          className={`flex items-center gap-2 px-4 py-2 font-semibold text-sm transition-all rounded-lg ${
            tab === 'feed' ? (isDark ? 'bg-[var(--primary-color)] text-[#1a1a1a]' : 'bg-[var(--primary-color)] text-white shadow-md') : (isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-black hover:bg-black/5')
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Grid Feed
        </button>
      </div>
      
      <div>
        {tab === 'publisher' && <MultiChannelPublisher division={division} />}
        {tab === 'calendar' && <ContentCalendar division={division} />}
        {tab === 'feed' && <FeedPreview division={division} />}
      </div>
    </div>
  );
};

export default PublishJourney;
