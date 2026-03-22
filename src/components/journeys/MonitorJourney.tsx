import React, { useState, lazy, Suspense } from 'react';
import type { Division } from '../../constants/Themes';
import PlatformMonitor from '../PlatformMonitor';
import { BarChart3, Activity } from 'lucide-react';

const SocialAnalytics = lazy(() => import('../SocialAnalytics'));

export const MonitorJourney: React.FC<{ division: Division }> = ({ division }) => {
  const [tab, setTab] = useState<'analytics' | 'monitor'>('analytics');

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
        <button 
          onClick={() => setTab('analytics')} 
          className={`flex items-center gap-2 px-4 py-2 font-semibold text-sm transition-all rounded-lg ${
            tab === 'analytics' ? 'bg-[var(--primary-color)] text-[#1a1a1a]' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Analytics Geral
        </button>
        <button 
          onClick={() => setTab('monitor')} 
          className={`flex items-center gap-2 px-4 py-2 font-semibold text-sm transition-all rounded-lg ${
            tab === 'monitor' ? 'bg-[var(--primary-color)] text-[#1a1a1a]' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Activity className="w-4 h-4" />
          Monitor de Plataforma
        </button>
      </div>
      
      <div>
        {tab === 'analytics' && <Suspense fallback={<div className="text-center py-12 opacity-40 text-sm">Carregando analytics...</div>}><SocialAnalytics division={division} /></Suspense>}
        {tab === 'monitor' && <PlatformMonitor division={division} />}
      </div>
    </div>
  );
};

export default MonitorJourney;
