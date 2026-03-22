import { useState, useRef, lazy, Suspense } from 'react';
import type { Division } from '../constants/Themes';
import { Card } from '../design-system';
import { Film, Clapperboard, Server, ExternalLink, Check, X as XIcon, Clock } from 'lucide-react';

const VideoGenerator = lazy(() => import('./VideoGenerator'));
const VideoComposer = lazy(() => import('./VideoComposer'));

interface VideoHubProps {
  division: Division;
}

type VideoMode = 'clip' | 'composer' | 'providers';

interface Provider {
  name: string;
  tier: string;
  api: 'integrado' | 'beta' | 'pago' | 'manual' | 'self-host';
  quality: number;
  bestFor: string;
  status: 'ativo' | 'pendente' | 'manual';
  color: string;
  url?: string;
}

const PROVIDERS: Provider[] = [
  {
    name: 'Veo 3.1 (Google)',
    tier: 'Billing ativo — $375 saldo',
    api: 'integrado',
    quality: 5,
    bestFor: 'Clip unico + Video composto no GrayArt',
    status: 'ativo',
    color: '#3b82f6',
    url: 'https://ai.google.dev',
  },
  {
    name: 'Kling 3.0 (PiAPI)',
    tier: '66 creditos/dia (~180 videos/mes) sem cartao',
    api: 'integrado',
    quality: 5,
    bestFor: 'Fallback automatico quando Veo esgota',
    status: 'ativo',
    color: '#8B5CF6',
    url: 'https://piapi.ai',
  },
  {
    name: 'Seedance 2.0 (PiAPI)',
    tier: 'Creditos via PiAPI',
    api: 'integrado',
    quality: 5,
    bestFor: 'Fallback 3 — danca e movimento corporal',
    status: 'ativo',
    color: '#f59e0b',
    url: 'https://piapi.ai',
  },
  {
    name: 'Luma Dream Machine (PiAPI)',
    tier: 'Creditos via PiAPI',
    api: 'integrado',
    quality: 4,
    bestFor: 'Fallback 4 — estilo cinematico e transicoes',
    status: 'ativo',
    color: '#6366f1',
    url: 'https://piapi.ai',
  },
  {
    name: 'Wan 2.1 (PiAPI)',
    tier: 'Creditos via PiAPI',
    api: 'integrado',
    quality: 4,
    bestFor: 'Fallback 5 — open source, boa qualidade geral',
    status: 'ativo',
    color: '#10b981',
    url: 'https://piapi.ai',
  },
  {
    name: 'HunyuanVideo (PiAPI)',
    tier: 'Creditos via PiAPI',
    api: 'integrado',
    quality: 4,
    bestFor: 'Fallback 6 — ultimo recurso, estilo Tencent',
    status: 'ativo',
    color: '#06b6d4',
    url: 'https://piapi.ai',
  },
];

const API_BADGE: Record<string, { label: string; class: string }> = {
  integrado: { label: 'INTEGRADO', class: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  beta: { label: 'BETA', class: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  pago: { label: 'API PAGA', class: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  manual: { label: 'MANUAL', class: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  'self-host': { label: 'SELF-HOST', class: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
};

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  ativo: { label: 'ATIVO', class: 'bg-emerald-500/15 text-emerald-400' },
  pendente: { label: 'PENDENTE', class: 'bg-amber-500/15 text-amber-400' },
  manual: { label: 'MANUAL', class: 'bg-slate-500/15 text-slate-400' },
};

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`w-3 h-3 rounded-sm ${i < count ? 'bg-amber-400' : 'bg-black/10 dark:bg-white/10'}`} />
      ))}
    </div>
  );
}

export default function VideoHub({ division }: VideoHubProps) {
  const [mode, setMode] = useState<VideoMode>('clip');
  const mountedRef = useRef({ clip: true, composer: false });

  if (mode === 'composer') mountedRef.current.composer = true;
  if (mode === 'clip') mountedRef.current.clip = true;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setMode('clip')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            mode === 'clip'
              ? 'bg-[var(--primary-color)] text-[var(--card-bg)] shadow-lg'
              : 'bg-[var(--sub-bg)] text-slate-400 hover:text-white'
          }`}
        >
          <Film size={16} />
          Clip Unico (6s)
        </button>
        <button
          onClick={() => setMode('composer')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            mode === 'composer'
              ? 'bg-[var(--primary-color)] text-[var(--card-bg)] shadow-lg'
              : 'bg-[var(--sub-bg)] text-slate-400 hover:text-white'
          }`}
        >
          <Clapperboard size={16} />
          Video Composto (6-90s)
        </button>
        <button
          onClick={() => setMode('providers')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            mode === 'providers'
              ? 'bg-[var(--primary-color)] text-[var(--card-bg)] shadow-lg'
              : 'bg-[var(--sub-bg)] text-slate-400 hover:text-white'
          }`}
        >
          <Server size={16} />
          Provedores IA
        </button>
      </div>

      {mode === 'providers' ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PROVIDERS.map((p, i) => {
              const apiBadge = API_BADGE[p.api];
              const statusBadge = STATUS_BADGE[p.status];
              return (
                <div key={i} className="rounded-[3rem] overflow-hidden bg-[var(--card-bg)] border border-[var(--card-border)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.12)] transition-all duration-700 group flex flex-col items-center text-center p-12">
                  {/* Status Badge Top Right */}
                  <div className="absolute top-8 right-8">
                    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black shadow-sm uppercase tracking-widest ${statusBadge.class}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Icon/Pill Indicator */}
                  <div className="w-16 h-1.5 rounded-full mb-8 opacity-40" style={{ backgroundColor: p.color, boxShadow: `0 0 20px ${p.color}60` }} />

                  {/* Title and Badge Row */}
                  <div className="space-y-4 w-full flex flex-col items-center">
                    <div className="flex items-center justify-center gap-3">
                      <span className="font-black text-4xl tracking-tighter" style={{ color: p.color, textShadow: `0 0 30px ${p.color}20` }}>{p.name}</span>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="opacity-20 hover:opacity-100 transition-all p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-2xl">
                          <ExternalLink size={20} />
                        </a>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-center gap-4">
                      <span className={`px-4 py-1 rounded-lg border-2 text-[10px] font-black tracking-[0.2em] uppercase ${apiBadge.class}`}>
                        {apiBadge.label}
                      </span>
                      <Stars count={p.quality} />
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="mt-10 pt-8 border-t border-[var(--card-border)] w-full max-w-sm space-y-3">
                    <p className="text-xl font-black text-[var(--text-color)] leading-tight tracking-tight">{p.tier}</p>
                    <p className="text-sm text-[var(--text-color)] opacity-40 font-bold italic tracking-wide">{p.bestFor}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <Card variant="default" padding="p-4">
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs opacity-60">
                <p className="font-bold text-amber-400 mb-1">Quotas diarias</p>
                <p>Veo 3.1: reseta meia-noite Pacific Time. PiAPI (Kling, Seedance, Luma, Wan, Hunyuan): creditos compartilhados.
                Modo "Automatico" tenta todos em cadeia: Veo → Kling → Seedance → Luma → Wan → Hunyuan.</p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card padding="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Check size={14} className="text-emerald-400" />
                <span className="text-xs font-bold">Integrados no GrayArt</span>
              </div>
              <p className="text-[11px] text-white/60">6 providers integrados com fallback automatico. Veo (Google) + 5 via PiAPI (Kling, Seedance, Luma, Wan, Hunyuan).</p>
            </Card>
            <Card padding="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-amber-400" />
                <span className="text-xs font-bold">Fallback automatico</span>
              </div>
              <p className="text-[11px] text-white/60">Todos os 6 providers estao ativos. Cadeia de fallback garante que pelo menos um gera o video.</p>
            </Card>
            <Card padding="p-4">
              <div className="flex items-center gap-2 mb-2">
                <XIcon size={14} className="text-slate-400" />
                <span className="text-xs font-bold">Cooldown inteligente</span>
              </div>
              <p className="text-[11px] text-white/60">Cooldown de 10min por provider com quota esgotada. Providers sao tentados em ordem ate um funcionar.</p>
            </Card>
          </div>
        </div>
      ) : (
        <Suspense fallback={<div className="text-center py-12 text-sm opacity-40">Carregando...</div>}>
          <div style={{ display: mode === 'clip' ? 'block' : 'none' }}>
            {mountedRef.current.clip && <VideoGenerator division={division} />}
          </div>
          <div style={{ display: mode === 'composer' ? 'block' : 'none' }}>
            {mountedRef.current.composer && <VideoComposer division={division} />}
          </div>
        </Suspense>
      )}
    </div>
  );
}
