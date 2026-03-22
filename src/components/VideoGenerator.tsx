import { useState, useEffect, useCallback, useRef } from 'react';
import type { Division } from '../constants/Themes';
import { useAppContext } from '../context/AppContext';
import { Card, Button } from '../design-system';
import { bffFetch } from '../services/BFFClient';
import {
  Video, Download, Play, Loader2, Film, Sparkles,
  RefreshCw, Clock, AlertTriangle, Check,
} from 'lucide-react';

interface VideoGeneratorProps {
  division: Division;
}

type Provider = 'auto' | 'veo' | 'kling' | 'seedance' | 'luma' | 'wan' | 'hunyuan';
type Format = '9:16' | '16:9' | '1:1';
type Duration = 6 | 8;

interface JobStatus {
  id: string;
  status: 'queued' | 'processing' | 'done' | 'completed' | 'failed';
  progress: number;
  step: string;
  provider: string;
  videoUrl?: string;
  error?: string;
}

interface HistoryItem {
  id: string;
  prompt: string;
  provider: string;
  format: string;
  duration: number;
  status: 'done' | 'failed' | 'processing';
  videoUrl?: string;
  error?: string;
  createdAt: string;
}

const PROVIDER_COLORS: Record<string, string> = {
  veo: '#3b82f6',
  kling: '#8B5CF6',
  seedance: '#f97316',
  luma: '#6366f1',
  wan: '#10b981',
  hunyuan: '#06b6d4',
  auto: '#25D366',
};

const PROVIDER_LABELS: Record<string, string> = {
  veo: 'Veo 3.1',
  kling: 'Kling 3.0',
  seedance: 'Seedance 2.0',
  luma: 'Luma',
  wan: 'Wan 2.1',
  hunyuan: 'Hunyuan',
  auto: 'Automatico',
};

function ProviderBadge({ provider }: { provider: string }) {
  const lower = provider.toLowerCase();
  const key = lower.includes('veo') ? 'veo'
    : lower.includes('kling') ? 'kling'
    : lower.includes('seedance') ? 'seedance'
    : lower.includes('luma') ? 'luma'
    : lower.includes('wan') ? 'wan'
    : lower.includes('hunyuan') ? 'hunyuan' : 'auto';
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: PROVIDER_COLORS[key] }}
    >
      <Sparkles size={12} />
      Gerado com {PROVIDER_LABELS[key] ?? provider}
    </span>
  );
}

export default function VideoGenerator({ division: _division }: VideoGeneratorProps) {
  const { addNotification } = useAppContext();
  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState<Provider>('auto');
  const [format, setFormat] = useState<Format>('9:16');
  const [duration, setDuration] = useState<Duration>(6);

  const [generating, setGenerating] = useState(false);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [currentVideo, setCurrentVideo] = useState<{ url: string; provider: string } | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await bffFetch('/video-v2/history');
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.jobs ?? data.items ?? [];
      setHistory(items.map((item: any) => ({
        id: item.id,
        prompt: item.prompt || '',
        status: item.status === 'completed' ? 'done' : item.status,
        provider: item.model?.includes('seedance') ? 'seedance' : item.model?.includes('luma') ? 'luma' : item.model?.includes('wan') ? 'wan' : item.model?.includes('hunyuan') ? 'hunyuan' : item.model?.includes('kling') ? 'kling' : 'veo',
        videoUrl: item.result?.videoUrl || null,
        createdAt: item.created_at || item.createdAt,
      })));
    } catch {
      /* silently ignore history fetch errors */
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const pollStatus = useCallback((jobId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await bffFetch(`/video-v2/status/${jobId}`);
        const data: JobStatus = await res.json();
        
        setJob(prev => {
          // If backend doesn't provide progress, simulate a small increment up to 95%
          const currentProgress = prev?.progress ?? 0;
          const backendProgress = typeof data.progress === 'number' ? data.progress : undefined;
          
          let nextProgress = backendProgress ?? (currentProgress + (95 - currentProgress) * 0.1);
          if (data.status === 'done') nextProgress = 100;
          if (data.status === 'failed') nextProgress = currentProgress;

          return {
            ...data,
            progress: nextProgress
          };
        });

        if ((data.status === 'done' || data.status === 'completed') && data.videoUrl) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setGenerating(false);
          setCurrentVideo({ url: data.videoUrl, provider: data.provider });
          fetchHistory();
          addNotification(`Video gerado com ${PROVIDER_LABELS[data.provider] ?? data.provider}! Salvo no historico.`, 'success');
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setGenerating(false);
          setError(data.error ?? 'Falha na geracao do video');
          fetchHistory();
        }
      } catch {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setGenerating(false);
        setError('Erro ao consultar status');
      }
    }, 5000);
  }, [fetchHistory]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    setCurrentVideo(null);
    setJob(null);

    try {
      const res = await bffFetch('/video-v2/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt, format, duration, provider }),
      });
      const data = await res.json();
      if (data.job_id || data.jobId || data.id) {
        const id = data.job_id ?? data.jobId ?? data.id;
        setJob({ id, status: 'queued', progress: 0, step: 'Na fila...', provider: provider === 'auto' ? 'auto' : provider });
        pollStatus(id);
      } else {
        throw new Error(data.error ?? 'Resposta inesperada');
      }
    } catch (e: any) {
      setGenerating(false);
      setError(e.message ?? 'Erro ao iniciar geracao');
    }
  };

  const selectHistoryItem = (item: HistoryItem) => {
    if (item.status === 'done' && item.videoUrl) {
      setCurrentVideo({ url: item.videoUrl, provider: item.provider });
      setPrompt(item.prompt);
    }
  };

  const providerRow1: { value: Provider; label: string }[] = [
    { value: 'auto', label: 'Automatico' },
    { value: 'veo', label: 'Veo 3.1' },
    { value: 'kling', label: 'Kling 3.0' },
  ];
  const providerRow2: { value: Provider; label: string }[] = [
    { value: 'seedance', label: 'Seedance' },
    { value: 'luma', label: 'Luma' },
    { value: 'wan', label: 'Wan 2.1' },
    { value: 'hunyuan', label: 'Hunyuan' },
  ];

  const formatOptions: { value: Format; label: string; sub: string }[] = [
    { value: '9:16', label: '9:16 Vertical', sub: 'Reels / TikTok' },
    { value: '16:9', label: '16:9 Horizontal', sub: 'YouTube' },
    { value: '1:1', label: '1:1 Quadrado', sub: '' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left — Controls */}
      <div className="space-y-5">
        <Card title="Gerar Video" subtitle="6 providers: Veo + Kling + Seedance + Luma + Wan + Hunyuan">
          {/* Prompt */}
          <textarea
            className="w-full p-4 rounded-xl bg-[var(--input-bg)] text-[var(--text-color)] text-sm font-bold border-2 border-[var(--primary-color)]/20 shadow-inner focus:outline-none focus:border-[var(--primary-color)] focus:ring-4 focus:ring-[var(--primary-color)]/20 transition-all resize-none min-h-[120px] placeholder:opacity-50"
            placeholder="Descreva o video que voce quer gerar..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={generating}
          />

          {/* Provider */}
          <div className="mt-4">
            <label className="text-xs text-[var(--text-color)] opacity-60 uppercase tracking-wide mb-2 block">Provider</label>
            <div className="flex gap-2">
              {providerRow1.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setProvider(opt.value)}
                  disabled={generating}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all border ${
                    provider === opt.value
                      ? 'text-white border-transparent'
                      : 'bg-[var(--input-bg)] text-[var(--text-color)] opacity-60 border-[var(--card-border)] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  style={provider === opt.value ? { backgroundColor: PROVIDER_COLORS[opt.value] } : undefined}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              {providerRow2.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setProvider(opt.value)}
                  disabled={generating}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    provider === opt.value
                      ? 'text-white border-transparent'
                      : 'bg-[var(--input-bg)] text-[var(--text-color)] opacity-60 border-[var(--card-border)] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  style={provider === opt.value ? { backgroundColor: PROVIDER_COLORS[opt.value] } : undefined}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div className="mt-4">
            <label className="text-xs text-[var(--text-color)] opacity-60 uppercase tracking-wide mb-2 block">Formato</label>
            <div className="flex gap-2">
              {formatOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFormat(opt.value)}
                  disabled={generating}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all border ${
                    format === opt.value
                      ? 'bg-[var(--primary-color)] text-[#1a1a1a] border-transparent'
                      : 'bg-[var(--input-bg)] text-[var(--text-color)] opacity-60 border-[var(--card-border)] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <div>{opt.label}</div>
                  {opt.sub && <div className="text-[10px] font-normal opacity-70">{opt.sub}</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="mt-4">
            <label className="text-xs text-[var(--text-color)] opacity-60 uppercase tracking-wide mb-2 block">Duracao</label>
            <div className="flex gap-2">
              {([6, 8] as Duration[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  disabled={generating}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all border ${
                    duration === d
                      ? 'bg-[var(--primary-color)] text-[#1a1a1a] border-transparent'
                      : 'bg-[var(--input-bg)] text-[var(--text-color)] opacity-60 border-[var(--card-border)] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              <Clock size={11} className="inline mr-1" />
              Veo 3: 6s ou 8s | Kling/Seedance: 5s no plano gratuito
            </p>
          </div>

          {/* Generate */}
          <Button
            size="lg"
            fullWidth
            className="mt-5 !bg-[#25D366] !text-white hover:!bg-[#1da851]"
            icon={generating ? undefined : Film}
            loading={generating}
            disabled={generating || !prompt.trim()}
            onClick={handleGenerate}
          >
            {generating ? (job?.step ?? 'Iniciando...') : 'GERAR VIDEO'}
          </Button>

          {error && (
            <div className="mt-3 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}
        </Card>
      </div>

      {/* Right — Result + History */}
      <div className="space-y-5">
        {/* Video Player / Progress */}
        <Card title="Resultado">
          {generating && job ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <ProviderBadge provider={job.provider} />
                <span className="text-xs text-[var(--text-color)] opacity-40">{Math.round(job.progress)}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${job.progress}%`,
                    backgroundColor: PROVIDER_COLORS[job.provider] ?? '#25D366',
                  }}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--text-color)] opacity-40">
                <Loader2 size={14} className="animate-spin" />
                {job.step}
              </div>
            </div>
          ) : currentVideo ? (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden bg-black">
                <video
                  src={currentVideo.url}
                  controls
                  className="w-full max-h-[400px] object-contain"
                />
              </div>
              <div className="flex items-center justify-between">
                <ProviderBadge provider={currentVideo.provider} />
                <div className="flex gap-2">
                  <a
                    href={currentVideo.url}
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition"
                  >
                    <Download size={14} />
                    Download
                  </a>
                  <Button size="sm" variant="secondary" icon={RefreshCw}>
                    Publicar nas Redes
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Video size={48} strokeWidth={1} />
              <p className="mt-3 text-sm">Nenhum video gerado ainda</p>
              <p className="text-xs text-slate-600 mt-1">Preencha o prompt e clique em Gerar</p>
            </div>
          )}
        </Card>

        {/* History */}
        <Card
          title="Historico"
          headerAction={
            <button onClick={fetchHistory} className="text-slate-400 hover:text-white transition">
              <RefreshCw size={16} className={historyLoading ? 'animate-spin' : ''} />
            </button>
          }
        >
          {historyLoading && history.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <Loader2 size={20} className="animate-spin mr-2" />
              Carregando...
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Nenhum video no historico</p>
          ) : (
            <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectHistoryItem(item)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition text-left group"
                >
                  <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                    {item.status === 'done' ? (
                      <Play size={18} className="text-[#25D366]" />
                    ) : item.status === 'failed' ? (
                      <AlertTriangle size={18} className="text-red-400" />
                    ) : (
                      <Loader2 size={18} className="text-slate-400 animate-spin" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-color)] truncate">{item.prompt}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <ProviderBadge provider={item.provider} />
                      <span className="text-[10px] text-[var(--text-color)] opacity-40">
                        {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {item.status === 'failed' && item.error && (
                      <p className="text-xs text-red-400 mt-1 truncate">{item.error}</p>
                    )}
                  </div>
                  {item.status === 'done' && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <Check size={16} className="text-[#25D366]" />
                      {item.videoUrl && (
                        <a href={item.videoUrl} download onClick={e => e.stopPropagation()} className="text-[9px] font-bold text-white/40 hover:text-white transition">
                          <Download size={12} />
                        </a>
                      )}
                    </div>
                  )}
                  {item.status === 'failed' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPrompt(item.prompt); handleGenerate(); }}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 text-[10px] font-bold hover:bg-amber-500/25 transition shrink-0 flex items-center gap-1"
                    >
                      <RefreshCw size={10} /> Refazer
                    </button>
                  )}
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
