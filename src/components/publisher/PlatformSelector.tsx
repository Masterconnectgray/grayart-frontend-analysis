import React from 'react';
import { PlatformIcon } from '../../constants/SocialIcons';

interface PlatformConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  formats: string[];
  maxDuration: string;
  features: string[];
}

export const PLATFORMS: PlatformConfig[] = [
  { id: 'instagram', name: 'Instagram', icon: 'IG', color: '#E4405F', formats: ['Reels', 'Feed', 'Stories', 'Carrossel'], maxDuration: '90s', features: ['Auto-hashtag', 'Primeiro comentario', 'Alt text'] },
  { id: 'tiktok', name: 'TikTok', icon: 'TT', color: '#000000', formats: ['Video', 'Foto Slideshow'], maxDuration: '3min', features: ['Duet', 'Stitch', 'Trending sounds'] },
  { id: 'linkedin', name: 'LinkedIn', icon: 'LI', color: '#0A66C2', formats: ['Post', 'Artigo', 'Documento', 'Video'], maxDuration: '10min', features: ['Mencoes', 'Newsletter', 'Hashtags B2B'] },
  { id: 'youtube', name: 'YouTube', icon: 'YT', color: '#FF0000', formats: ['Shorts', 'Video Longo'], maxDuration: '60s / ilimitado', features: ['Thumbnail', 'End screen', 'Cards'] },
  { id: 'facebook', name: 'Facebook', icon: 'FB', color: '#1877F2', formats: ['Reels', 'Post', 'Stories', 'Video'], maxDuration: '90s', features: ['Boost', 'Grupo', 'Evento'] },
  { id: 'whatsapp', name: 'WhatsApp', icon: 'WA', color: '#25D366', formats: ['Status', 'Mensagem Broadcast', 'Grupo'], maxDuration: '30s', features: ['Lista transmissao', 'Auto-resposta', 'Catalogo'] },
];

interface PlatformSelectorProps {
  selectedPlatforms: string[];
  onChange: (platforms: string[]) => void;
  isDark: boolean;
  connectedPlatforms?: string[];
  publishablePlatforms?: string[];
}

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  selectedPlatforms,
  onChange,
  isDark,
  connectedPlatforms = [],
  publishablePlatforms = [],
}) => {
  const togglePlatform = (id: string) => {
    onChange(
      selectedPlatforms.includes(id) 
        ? selectedPlatforms.filter(p => p !== id) 
        : [...selectedPlatforms, id]
    );
  };

  const selectAll = () => onChange(PLATFORMS.map(p => p.id));
  const selectNone = () => onChange([]);

  return (
    <div className={`backdrop-blur-md rounded-2xl p-6 mb-6 border transition-colors duration-300
      ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-[#1a1a1a]'}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xs font-extrabold opacity-50 uppercase tracking-widest">
          Destinos da Publicação
        </h3>
        <div className="flex gap-3">
          <button 
            onClick={selectAll} 
            className="text-xs font-bold text-[var(--primary-color)] hover:opacity-80 transition-opacity"
          >
            Selecionar Todas
          </button>
          <button 
            onClick={selectNone} 
            className={`text-xs font-bold transition-opacity ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-black'}`}
          >
            Limpar
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {PLATFORMS.map(p => {
          const isSelected = selectedPlatforms.includes(p.id);
          const isConnected = connectedPlatforms.includes(p.id);
          const canPublishNow = publishablePlatforms.includes(p.id);
          const statusLabel = p.id === 'whatsapp'
            ? 'Fluxo operacional'
            : isConnected
              ? (canPublishNow ? 'Conectada' : 'Disponível para agendar')
              : 'Não conectada';
          return (
            <div
              key={p.id}
              onClick={() => togglePlatform(p.id)}
              className={`p-4 rounded-xl text-center cursor-pointer transition-all duration-300
                ${isSelected ? (isDark ? 'bg-white/10 border-2 shadow-lg -translate-y-1' : 'bg-black/10 border-2 shadow-lg -translate-y-1') 
                             : (isDark ? 'bg-[#2d2d2d] bg-opacity-40 border-2 border-transparent hover:bg-white/5' 
                                       : 'bg-black/5 border-2 border-transparent hover:bg-black/10')}`}
              style={{
                borderColor: isSelected ? p.color : 'transparent',
                backgroundColor: isSelected ? `${p.color}18` : undefined,
                boxShadow: isSelected ? `0 4px 15px ${p.color}33` : 'none'
              }}
            >
              <div 
                className={`w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center transition-all duration-300
                  ${isSelected ? 'opacity-100 scale-110' : 'opacity-40 scale-100'}`}
                style={{ filter: isSelected ? `drop-shadow(0 0 6px ${p.color}99)` : 'none' }}
              >
                <PlatformIcon platformId={p.id} size={32} />
              </div>
              <div className={`text-xs font-bold ${isSelected ? 'opacity-100' : 'opacity-50'}`}>
                {p.name}
              </div>
              <div className="text-[10px] opacity-40 mt-1">
                {p.maxDuration}
              </div>
              <div className={`mt-2 text-[10px] font-bold ${
                p.id === 'whatsapp'
                  ? 'text-emerald-500'
                  : isConnected
                    ? 'text-emerald-500'
                    : 'text-amber-500'
              }`}>
                {statusLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
