import React, { useState, useEffect, useCallback } from 'react';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
import { Card } from '../design-system';
import { PlatformIcon } from '../constants/SocialIcons';
import { bffFetch } from '../services/BFFClient';
import { useAppContext } from '../context/AppContext';
import { Clock, Video, FileText, Send, Copy, Wand2 } from 'lucide-react';

interface ActivityHistoryProps {
  division: Division;
}

type HistoryFilter = 'all' | 'copy' | 'video' | 'video_prompt' | 'published';

interface HistoryItem {
  id: number;
  type: string;
  prompt: string;
  result: {
    hook?: string;
    body?: string;
    cta?: string;
    tags?: string[];
    fullText?: string;
    prompt?: string;
    videoUrl?: string;
    error?: string;
  } | null;
  model: string;
  tokens_used: number | null;
  cost_estimate: number | null;
  status: string;
  created_at: string;
}

function detectPlatform(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes('tiktok')) return 'tiktok';
  if (p.includes('linkedin')) return 'linkedin';
  if (p.includes('youtube')) return 'youtube';
  return 'instagram';
}

function formatDate(dateStr: string): { date: string; time: string; relative: string } {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  let relative = '';
  if (diffMin < 1) relative = 'agora';
  else if (diffMin < 60) relative = `${diffMin}min`;
  else if (diffH < 24) relative = `${diffH}h`;
  else if (diffD < 7) relative = `${diffD}d`;
  else relative = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return {
    date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
    time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    relative,
  };
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  copy: { label: 'Copy IA', icon: <FileText size={14} />, color: 'text-purple-400 bg-purple-500/10' },
  video_prompt: { label: 'Prompt Video', icon: <Wand2 size={14} />, color: 'text-blue-400 bg-blue-500/10' },
  video: { label: 'Video IA', icon: <Video size={14} />, color: 'text-emerald-400 bg-emerald-500/10' },
  published: { label: 'Publicado', icon: <Send size={14} />, color: 'text-amber-400 bg-amber-500/10' },
};

const ActivityHistory: React.FC<ActivityHistoryProps> = ({ division }) => {
  const { addNotification, sendCopyToVideoLab, historyFilter } = useAppContext();
  const theme = DIVISIONS[division];
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<HistoryFilter>(
    (historyFilter === 'copy' || historyFilter === 'video' || historyFilter === 'video_prompt') ? historyFilter : 'all'
  );

  useEffect(() => {
    if (historyFilter === 'copy' || historyFilter === 'video' || historyFilter === 'video_prompt') {
      setFilter(historyFilter as HistoryFilter);
    }
  }, [historyFilter]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await bffFetch('/ai/jobs');
      if (resp.ok) {
        const data = await resp.json() as { jobs: HistoryItem[] };
        setItems(data.jobs.filter(j => j.status === 'completed' || j.status === 'failed' || j.status === 'processing'));
      }
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter);

  const stats = {
    copies: items.filter(i => i.type === 'copy').length,
    videos: items.filter(i => i.type === 'video').length,
    prompts: items.filter(i => i.type === 'video_prompt').length,
    totalTokens: items.reduce((s, i) => s + (i.tokens_used || 0), 0),
    totalCost: items.reduce((s, i) => s + (i.cost_estimate || 0), 0),
  };

  const handleUseCopy = (item: HistoryItem) => {
    if (!item.result?.hook) return;
    sendCopyToVideoLab({
      hook: item.result.hook,
      body: item.result.body || '',
      cta: item.result.cta || '',
      tags: item.result.tags || [],
      platform: detectPlatform(item.prompt),
      fullText: item.result.fullText || `${item.result.hook}\n\n${item.result.body}\n\n${item.result.cta}`,
    });
    addNotification('Copy enviada para o Video IA!', 'success');
  };

  const handleCopyText = (item: HistoryItem) => {
    const text = item.result?.fullText
      || `${item.result?.hook || ''}\n\n${item.result?.body || ''}\n\n${item.result?.cta || ''}\n\n${(item.result?.tags || []).map(t => '#' + t).join(' ')}`;
    navigator.clipboard.writeText(text).then(() => addNotification('Copiado!', 'success'));
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* Stats resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Copies IA', value: stats.copies, color: 'text-purple-400', border: 'border-purple-400/30' },
          { label: 'Videos IA', value: stats.videos, color: 'text-emerald-400', border: 'border-emerald-400/30' },
          { label: 'Prompts IA', value: stats.prompts, color: 'text-blue-400', border: 'border-blue-400/30' },
          { label: 'Tokens IA', value: stats.totalTokens > 1000 ? `${(stats.totalTokens / 1000).toFixed(1)}k` : stats.totalTokens, color: 'text-amber-400', border: 'border-amber-400/30' },
          { label: 'Investimento', value: `$${stats.totalCost.toFixed(3)}`, color: 'text-red-400', border: 'border-red-400/30' },
        ].map((s, i) => (
          <div key={i} className={`p-6 rounded-2xl bg-black/5 dark:bg-black/40 border-2 ${s.border} shadow-inner flex flex-col justify-center transition-all hover:-translate-y-1 hover:bg-black/10`}>
            <div className={`text-4xl font-black drop-shadow-md ${s.color}`}>{s.value}</div>
            <div className="text-[10px] opacity-70 font-black uppercase tracking-widest mt-2 text-[var(--card-text)]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {([
          { id: 'all' as const, label: 'Tudo' },
          { id: 'copy' as const, label: 'Copies' },
          { id: 'video' as const, label: 'Videos' },
          { id: 'video_prompt' as const, label: 'Prompts' },
        ]).map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap
              ${filter === f.id ? 'bg-[var(--primary-color)] text-[var(--card-bg)]' : 'bg-[var(--sub-bg)] text-slate-400 hover:text-white'}`}
          >
            {f.label} {f.id !== 'all' && `(${items.filter(i => i.type === f.id).length})`}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-sm opacity-40">Carregando historico...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Clock size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm opacity-40">Nenhum registro encontrado.</p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(item => {
            const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.copy;
            const { date, time, relative } = formatDate(item.created_at);
            const platform = detectPlatform(item.prompt);
            const isExpanded = expandedId === item.id;

            return (
              <Card
                key={item.id}
                padding="p-0"
                className={`cursor-pointer transition-all hover:border-[var(--primary-color)]/30 ${isExpanded ? 'border-[var(--primary-color)]/30' : ''}`}
              >
                <div
                  className="p-5 flex items-center gap-4"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <div className="shrink-0 p-1.5 bg-black/5 dark:bg-white/5 rounded-xl">
                    <PlatformIcon platformId={platform} size={28} />
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${typeConfig.color}`}>
                    {typeConfig.icon} {typeConfig.label}
                  </div>
                  {item.status === 'failed' && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/15 text-red-400">FALHOU</span>
                  )}
                  {item.status === 'processing' && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 animate-pulse">PROCESSANDO</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">
                      {item.type === 'copy' ? (item.result?.hook || 'Copy') :
                       item.type === 'video' ? 'Video gerado' :
                       item.type === 'video_prompt' ? (item.result?.prompt?.substring(0, 60) || 'Prompt') :
                       'Registro'}
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-center justify-center pl-4 border-l-2 border-black/5 dark:border-white/5 ml-2 min-w-[80px]">
                    <div className="text-[11px] font-black opacity-80 uppercase tracking-widest text-[var(--primary-color)] mb-1">{relative}</div>
                    <div className="text-[10px] font-bold opacity-60 whitespace-nowrap bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded text-[var(--card-text)]">{date}</div>
                    <div className="text-[9px] font-black opacity-40 mt-1 tracking-widest uppercase">{time}</div>
                  </div>
                </div>

                {isExpanded && item.result && (
                  <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3 animate-in fade-in duration-200">
                    {item.type === 'copy' && item.result.hook && (
                      <>
                        <div className="space-y-2 text-sm">
                          <div className="border-l-4 border-[var(--primary-color)] pl-3">
                            <span className="text-[9px] font-bold opacity-40 uppercase">Hook</span>
                            <p className="font-bold text-xs">{item.result.hook}</p>
                          </div>
                          <div className="border-l-4 border-slate-500 pl-3">
                            <span className="text-[9px] font-bold opacity-40 uppercase">Body</span>
                            <p className="text-xs opacity-80 whitespace-pre-line">{item.result.body}</p>
                          </div>
                          <div className="border-l-4 border-emerald-500 pl-3">
                            <span className="text-[9px] font-bold opacity-40 uppercase">CTA</span>
                            <p className="font-bold text-xs">{item.result.cta}</p>
                          </div>
                          {item.result.tags && (
                            <div className="flex gap-1.5 flex-wrap">
                              {item.result.tags.map(t => (
                                <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--primary-color)]/10 text-[var(--primary-color)]">#{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCopyText(item); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 transition-all"
                          >
                            <Copy size={12} /> Copiar texto
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUseCopy(item); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-black transition-all hover:brightness-110"
                            style={{ backgroundColor: theme.colors.primary }}
                          >
                            <Video size={12} /> Usar no Video IA
                          </button>
                        </div>
                      </>
                    )}

                    {item.type === 'video' && item.result.videoUrl && (
                      <div>
                        <video src={item.result.videoUrl} controls className="w-full max-h-64 rounded-xl" />
                      </div>
                    )}
                    {item.type === 'video' && item.result.error && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-xs font-bold text-red-400">
                          {item.result.error === 'QUOTA_EXCEEDED'
                            ? 'Quota do Veo 3 esgotada — ative billing no Google Cloud ou aguarde reset da quota gratuita'
                            : `Erro: ${item.result.error}`}
                        </p>
                      </div>
                    )}
                    {item.type === 'video' && !item.result.videoUrl && !item.result.error && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <p className="text-xs font-bold text-amber-400">Video em processamento ou sem resultado disponivel</p>
                      </div>
                    )}

                    {item.type === 'video_prompt' && item.result.prompt && (
                      <p className="text-xs opacity-70 italic border-l-2 border-blue-500/30 pl-3">
                        "{item.result.prompt}"
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-[9px] opacity-30">
                      <span>Modelo: {item.model}</span>
                      {item.tokens_used && <span>{item.tokens_used} tokens</span>}
                      {item.cost_estimate && <span>${item.cost_estimate.toFixed(4)}</span>}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivityHistory;
