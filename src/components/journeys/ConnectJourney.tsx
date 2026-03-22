import React, { useState } from 'react';
import type { Division } from '../../constants/Themes';
import InstagramIntegrations from '../InstagramIntegrations';
import WhatsAppConnect from '../WhatsAppConnect';
import EditingToolsConnect from '../EditingToolsConnect';
import { Link2, MessageCircle, Scissors } from 'lucide-react';

type ConnectTab = 'instagram' | 'whatsapp' | 'editing';

export const ConnectJourney: React.FC<{ division: Division }> = ({ division }) => {
  const [tab, setTab] = useState<ConnectTab>('instagram');

  const tabs = [
    { id: 'instagram' as ConnectTab, label: 'Redes Sociais', icon: Link2 },
    { id: 'whatsapp' as ConnectTab, label: 'WhatsApp', icon: MessageCircle },
    { id: 'editing' as ConnectTab, label: 'Ferramentas de Edi\u00e7\u00e3o', icon: Scissors },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto scrollbar-none">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 font-semibold text-sm transition-all rounded-lg whitespace-nowrap ${
              tab === t.id ? 'bg-[var(--primary-color)] text-[#1a1a1a]' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'instagram' && <InstagramIntegrations division={division} />}
        {tab === 'whatsapp' && <WhatsAppConnect division={division} />}
        {tab === 'editing' && <EditingToolsConnect division={division} />}
      </div>
    </div>
  );
};

export default ConnectJourney;
