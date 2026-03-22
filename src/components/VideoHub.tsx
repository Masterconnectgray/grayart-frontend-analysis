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
    name: 'Seedance 2.0 (Dreamina/CapCut)',
    tier: 'Creditos diarios gratuitos',
    api: 'beta',
    quality: 5,
    bestFor: 'Testes manuais — qualidade excelente',
    status: 'pendente',
    color: '#f59e0b',
    url: 'https://dreamina.capcut.com',
  },
  {
    name: 'Luma Dream Machine',
    tier: '30 videos/mes gratis',
    api: 'pago',
    quality: 4,
    bestFor: 'Testes manuais — estilo cinematico',
    status: 'manual',
    color: '#6366f1',
    url: 'https://lumalabs.ai/dream-machine',
  },
  {
    name: 'Wan 2.1 (Open Source)',
    tier: 'Gratuito se auto-hospedado',
    api: 'self-host',
    quality: 4,
    bestFor: 'Servidor proprio — sem limites',
    status: 'pendente',
    color: '#10b981',
    url: 'https://github.com/Wan-Video/wan2.1',
  },
  {
    name: 'HunyuanVideo (Tencent)',
    tier: 'Gratuito se auto-hospedado',
    api: 'self-host',
    quality: 4,
    bestFor: 'Servidor proprio — sem limites',
    status: 'pendente',
    color: '#06b6d4',
    url: 'https://github.com/Tencent/HunyuanVideo',
  },
  {
    name: 'Google AI Studio',
    tier: 'Acesso manual gratuito (UI)',
    api: 'manual',
    quality: 5,
    bestFor: 'Testes manuais via interface web',
    status: 'manual',
    color: '#4285f4',
    url: 'https://aistudio.google.com',
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
        <div key={i} className={`w-3 h-3 rounded-sm ${i < count ? 'bg-amber-400' : 'bg-white/10'}`} />
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
                <Card key={i} variant="elevated" padding="p-5" className="hover:border-white/10 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-2 h-full min-h-[80px] rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base">{p.name}</span>
                          {p.url && (
                            <a href={p.url} target="_blank" rel="noopener noreferrer" className="opacity-30 hover:opacity-70 transition">
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded border text-[9px] font-bold ${apiBadge.class}`}>
                          {apiBadge.label}
                        </span>
                        <Stars count={p.quality} />
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm opacity-80">{p.tier}</p>
                        <p className="text-xs opacity-40">{p.bestFor}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card variant="default" padding="p-4">
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs opacity-60">
                <p className="font-bold text-amber-400 mb-1">Quotas diarias</p>
                <p>Veo 3.1: reseta meia-noite Pacific Time. Kling: reseta diariamente.
                Modo "Automatico" tenta Veo primeiro e cai pro Kling se quota esgotar.</p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card padding="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Check size={14} className="text-emerald-400" />
                <span className="text-xs font-bold">Integrados no GrayArt</span>
              </div>
              <p className="text-[11px] opacity-40">Veo 3.1 + Kling 3.0 funcionam automaticamente. Selecione "Automatico" pra fallback inteligente.</p>
            </Card>
            <Card padding="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-amber-400" />
                <span className="text-xs font-bold">Proximos a integrar</span>
              </div>
              <p className="text-[11px] opacity-40">Seedance 2.0 e Wan 2.1 estao na fila. Self-host no VPS quando necessario.</p>
            </Card>
            <Card padding="p-4">
              <div className="flex items-center gap-2 mb-2">
                <XIcon size={14} className="text-slate-400" />
                <span className="text-xs font-bold">Acesso manual</span>
              </div>
              <p className="text-[11px] opacity-40">Luma e Google AI Studio: use direto no site deles pra testes rapidos sem API.</p>
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
