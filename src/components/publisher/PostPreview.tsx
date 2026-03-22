import React from 'react';
import { PlatformIcon } from '../../constants/SocialIcons';
import type { Division } from '../../constants/Themes';
import { DIVISIONS } from '../../constants/Themes';

interface PostPreviewProps {
  division: Division;
  content: string;
  previewPlatform: 'instagram' | 'tiktok' | 'linkedin' | 'youtube';
  setPreviewPlatform: (p: 'instagram' | 'tiktok' | 'linkedin' | 'youtube') => void;
  contentScore: any;
}

export const PostPreview: React.FC<PostPreviewProps> = ({
  division,
  content,
  previewPlatform,
  setPreviewPlatform,
  contentScore
}) => {
  const theme = DIVISIONS[division];
  const username = theme.name.toLowerCase().replace(/ /g, '');

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex gap-3 mb-6 flex-wrap">
        {(['instagram', 'tiktok', 'linkedin', 'youtube'] as const).map(p => {
          const pColors: Record<string, string> = { instagram: '#E4405F', tiktok: '#010101', linkedin: '#0A66C2', youtube: '#FF0000' };
          const pColor = pColors[p];
          const isSel = previewPlatform === p;
          return (
            <button
              key={p}
              onClick={() => setPreviewPlatform(p)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 border-2
                ${isSel ? 'text-white' : 'text-slate-400 bg-white/5 border-transparent hover:bg-white/10'}`}
              style={{
                backgroundColor: isSel ? pColor : undefined,
                borderColor: isSel ? pColor : 'transparent',
                boxShadow: isSel ? `0 4px 15px ${pColor}44` : 'none'
              }}
            >
              <PlatformIcon platformId={p} size={18} />
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          );
        })}
        {!content && (
          <div className="px-4 py-2 text-xs opacity-50 flex items-center">
            Escreva um conteúdo para visualizar o preview
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Device Mocks */}
        <div className="lg:col-span-7 xl:col-span-8 flex justify-center">
          {previewPlatform === 'instagram' && (
            <div className="w-[380px] bg-[#000] rounded-[24px] border-[8px] border-[#222] overflow-hidden shadow-2xl">
              <div className="px-4 py-2 flex justify-between text-[10px] font-bold opacity-50 text-white">
                <span>9:41</span>
                <div>📶 🔋</div>
              </div>
              <div className="px-4 py-2 flex justify-between items-center border-b border-white/10 text-white">
                <span className="font-serif text-lg italic">Instagram</span>
                <div className="flex gap-3">❤️ ✉️</div>
              </div>
              <div className="p-3 flex items-center gap-3 text-white">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-[2px]">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center font-bold text-xs">G</div>
                </div>
                <div>
                  <div className="font-bold text-xs">{username}</div>
                  <div className="text-[10px] opacity-60">Patinado</div>
                </div>
              </div>
              <div className="aspect-square bg-gradient-to-tr from-white/10 to-white/5 flex flex-col items-center justify-center relative">
              <div className="opacity-30">
                <PlatformIcon platformId="instagram" size={64} />
              </div>
                <div className="text-white text-xs opacity-50 mt-4">Imagem/Vídeo do Post</div>
              </div>
              <div className="p-4 text-white">
                <div className="flex justify-between mb-2">
                  <div className="flex gap-3">❤️ 💬 ✈️</div>
                  <div>🔖</div>
                </div>
                <div className="text-xs font-bold mb-1">2.483 curtidas</div>
                <div className="text-xs leading-relaxed max-h-[100px] overflow-hidden">
                  <b>{username}</b>{' '}
                  {content ? (
                    <span className="opacity-90">{content}</span>
                  ) : (
                    <span className="opacity-40">Seu conteúdo aparecerá aqui...</span>
                  )}
                </div>
                {content && (content.match(/#\w+/g) || []).length > 0 && (
                  <div className="text-xs text-blue-400 mt-1 opacity-80">
                    {(content.match(/#\w+/g) || []).slice(0,5).join(' ')}
                  </div>
                )}
                <div className="text-[10px] opacity-40 mt-2 uppercase">Há 1 hora</div>
              </div>
            </div>
          )}

          {previewPlatform === 'tiktok' && (
            <div className="w-[300px] h-[580px] bg-black rounded-[36px] border-[8px] border-[#111] overflow-hidden relative shadow-2xl text-white">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--primary-color)]/20 to-black flex items-center justify-center">
              <div className="opacity-20">
                <PlatformIcon platformId="tiktok" size={80} />
              </div>
              </div>
              <div className="absolute top-8 left-0 right-0 flex justify-center gap-4 z-10">
                <span className="text-xs opacity-60 font-medium">Seguindo</span>
                <span className="text-xs font-bold border-b-2 border-white pb-1">Para você</span>
              </div>
              <div className="absolute right-3 bottom-24 flex flex-col gap-5 items-center z-10">
                <div className="w-11 h-11 rounded-full bg-[var(--primary-color)] flex items-center justify-center font-bold text-lg border-2 border-white relative">
                  G
                  <div className="absolute -bottom-1.5 w-4 h-4 rounded-full bg-[#fe2c55] flex items-center justify-center text-[10px] font-bold">+</div>
                </div>
                <div className="text-center"><div className="text-xl mb-1">❤️</div><div className="text-[10px]">148K</div></div>
                <div className="text-center"><div className="text-xl mb-1">💬</div><div className="text-[10px]">2.3K</div></div>
                <div className="text-center"><div className="text-xl mb-1">🔖</div><div className="text-[10px]">5K</div></div>
                <div className="text-center"><div className="text-xl mb-1">↗️</div><div className="text-[10px]">892</div></div>
              </div>
              <div className="absolute bottom-16 left-3 right-16 z-10">
                <div className="font-bold text-sm mb-1">@{username}</div>
                <div className="text-xs opacity-90 line-clamp-3 mb-2">{content || 'Seu conteúdo aqui...'}</div>
                <div className="bg-white/10 px-3 py-1.5 rounded-full inline-flex items-center text-[10px] font-bold">
                  🎵 Som original - {theme.name}
                </div>
              </div>
            </div>
          )}

          {previewPlatform === 'linkedin' && (
            <div className="w-[480px] bg-[#1b1f23] rounded-xl border border-[#38434f] overflow-hidden shadow-2xl text-white">
               <div className="bg-[#1b1f23] p-3 border-b border-[#38434f] flex items-center gap-3">
                 <PlatformIcon platformId="linkedin" size={24} />
                 <div className="flex-1 h-7 bg-[#38434f] rounded flex items-center px-3 text-xs opacity-50">Pesquisar</div>
               </div>
               <div className="p-4">
                 <div className="flex gap-3 mb-3">
                   <div className="w-12 h-12 rounded-full bg-[var(--primary-color)] flex items-center justify-center font-bold text-xl">G</div>
                   <div>
                     <div className="font-bold text-sm">Grupo Gray - {theme.name}</div>
                     <div className="text-xs opacity-60">1.842 seguidores</div>
                     <div className="text-[10px] opacity-50">1h • 🌐</div>
                   </div>
                 </div>
                 <div className="text-sm opacity-90 leading-relaxed mb-3 whitespace-pre-wrap line-clamp-4">
                    {content || 'Seu conteúdo LinkedIn aqui...'}
                 </div>
               </div>
               <div className="h-[220px] bg-gradient-to-br from-[var(--primary-color)]/20 to-[var(--primary-color)]/40 flex flex-col items-center justify-center border-y border-[#38434f]">
               <div className="opacity-40">
                 <PlatformIcon platformId="linkedin" size={48} />
               </div>
                 <div className="text-xs font-bold mt-2 opacity-50">Imagem corporativa</div>
               </div>
               <div className="px-4 py-2 border-b border-[#38434f] text-[10px] opacity-60 flex justify-between">
                 <span>👍❤️👏 84 reações</span>
                 <span>12 comentários</span>
               </div>
               <div className="px-2 py-1 flex justify-between opacity-70 text-xs font-bold">
                 <button className="flex-1 py-3 hover:bg-white/5 rounded-md flex justify-center items-center gap-2">👍 Gostei</button>
                 <button className="flex-1 py-3 hover:bg-white/5 rounded-md flex justify-center items-center gap-2">💬 Comentar</button>
                 <button className="flex-1 py-3 hover:bg-white/5 rounded-md flex justify-center items-center gap-2">🔁 Repostar</button>
                 <button className="flex-1 py-3 hover:bg-white/5 rounded-md flex justify-center items-center gap-2">✈️ Enviar</button>
               </div>
            </div>
          )}

          {previewPlatform === 'youtube' && (
            <div className="w-[480px] bg-[#0f0f0f] rounded-2xl overflow-hidden shadow-2xl text-white">
              <div className="aspect-video bg-black relative flex flex-col items-center justify-center">
              <div className="opacity-30">
                <PlatformIcon platformId="youtube" size={64} />
              </div>
                <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold">12:34</div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20"><div className="w-1/3 h-full bg-red-600"></div></div>
              </div>
              <div className="p-4 flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--primary-color)] flex-shrink-0 flex items-center justify-center font-bold">G</div>
                <div>
                  <div className="font-semibold text-sm line-clamp-2 leading-tight mb-1">
                    {content ? content.split('\n')[0] : 'Título do vídeo YouTube'}
                  </div>
                  <div className="text-xs opacity-60">{theme.name} • 12K visualizações • há 2 horas</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Column */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
          <div className="p-5 rounded-2xl bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/30">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm font-bold text-[var(--primary-color)]">SCORE DO CONTEÚDO</div>
              {contentScore && (
                <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold
                  ${contentScore.total >= 70 ? 'border-emerald-500 text-emerald-500' : contentScore.total >= 40 ? 'border-yellow-500 text-yellow-500' : 'border-red-500 text-red-500'}`}>
                  {contentScore.total}
                </div>
              )}
            </div>
            {contentScore ? (
              <div className="space-y-3 relative">
                {contentScore.items.map((item: any, i: number) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-white">{item.label}</span>
                      <span className="font-bold" style={{ color: item.score >= 70 ? '#10b981' : item.score >= 40 ? '#f59e0b' : '#ef4444' }}>{item.score}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-1">
                      <div className="h-full transition-all duration-500 rounded-full" style={{ width: `${item.score}%`, backgroundColor: item.score >= 70 ? '#10b981' : item.score >= 40 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    <div className="text-[10px] text-slate-400 italic">{item.tip}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400">Preencha o conteúdo para ver a análise automática do algoritmo.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
