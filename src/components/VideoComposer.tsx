import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Button } from '../design-system';
import { bffFetch } from '../services/BFFClient';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
import { Film, Clock, Play, Download, Loader2, Check, RefreshCw, Sliders, Mic } from 'lucide-react';

interface VideoComposerProps {
  division: Division;
}

type Format = '9:16' | '16:9' | '1:1';
type JobStatus = 'idle' | 'previewing' | 'generating' | 'stitching' | 'done' | 'error';

interface Scene {
  index: number;
  prompt: string;
  status: 'pending' | 'generating' | 'done' | 'failed';
}

interface JobState {
  id: string;
  status: JobStatus;
  scenes: Scene[];
  videoUrl?: string;
  error?: string;
  provider?: string;
}

const SCENE_DURATION = 6;
const MARKS = [6, 12, 18, 30, 60, 90];

export default function VideoComposer({ division }: VideoComposerProps) {
  const theme = DIVISIONS[division];
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(30);
  const [format, setFormat] = useState<Format>('9:16');
  const [narration, setNarration] = useState(false);
  const [previewScenes, setPreviewScenes] = useState<Scene[]>([]);
  const [job, setJob] = useState<JobState | null>(null);
  const [status, setStatus] = useState<JobStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const sceneCount = Math.max(1, Math.round(duration / SCENE_DURATION));

  const fetchPreview = useCallback(async (text: string) => {
    if (text.trim().length < 10) { setPreviewScenes([]); return; }
    setStatus('previewing');
    try {
      const res = await bffFetch(`/video-composer/script?prompt=${encodeURIComponent(text)}&duration=${duration}&format=${format}`);
      const data = await res.json();
      setPreviewScenes((data.scenes || []).map((s: any, i: number) => ({
        index: i + 1, prompt: s.prompt || s.text || '', status: 'pending' as const
      })));
    } catch { /* silent */ }
    setStatus('idle');
  }, [duration, format]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPreview(prompt), 2000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [prompt, fetchPreview]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const startCompose = async () => {
    setStatus('generating');
    try {
      const res = await bffFetch('/video-composer/compose', {
        method: 'POST',
        body: JSON.stringify({ prompt, totalDuration: duration, format })
      });
      const data = await res.json();
      const jobId = data.jobId || data.id;
      setJob({ id: jobId, status: 'generating', scenes: previewScenes.map(s => ({ ...s, status: 'pending' })) });
      pollRef.current = setInterval(() => pollStatus(jobId), 5000);
    } catch (e: any) {
      setStatus('error');
      setJob(prev => prev ? { ...prev, status: 'error', error: e.message } : null);
    }
  };

  const pollStatus = async (jobId: string) => {
    try {
      const res = await bffFetch(`/video-composer/status/${jobId}`);
      const data = await res.json();
      const scenes: Scene[] = (data.scenes || []).map((s: any, i: number) => ({
        index: i + 1,
        prompt: s.prompt || '',
        status: s.status === 'completed' ? 'done' : s.status || 'pending',
      }));
      const jStatus: JobStatus = data.status === 'stitching' ? 'stitching'
        : (data.status === 'done' || data.status === 'completed') ? 'done'
        : data.status === 'error' ? 'error' : 'generating';

      setJob({ id: jobId, status: jStatus, scenes, videoUrl: data.videoUrl, error: data.error, provider: data.provider });
      setStatus(jStatus);

      if (jStatus === 'done' || jStatus === 'error') {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch { /* keep polling */ }
  };

  const retryScene = async (sceneIndex: number) => {
    if (!job) return;
    await bffFetch(`/video-composer/status/${job.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ retryScene: sceneIndex })
    });
  };

  const isGenerating = status === 'generating' || status === 'stitching';
  const isDone = status === 'done';
  const doneScenesCount = job?.scenes.filter(s => s.status === 'done').length || 0;
  const totalScenes = job?.scenes.length || sceneCount;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Controls */}
      <Card variant="elevated">
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wider font-medium">
            <Film className="w-4 h-4" /> Video Composer — {theme.name}
          </div>

          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Descreva o conceito do video..."
            rows={4}
            disabled={isGenerating}
            className="w-full p-4 rounded-xl bg-black/5 dark:bg-black/40 text-[var(--card-text)] text-sm font-bold border-2 border-[var(--primary-color)]/20 shadow-inner focus:outline-none focus:border-[var(--primary-color)] focus:ring-4 focus:ring-[var(--primary-color)]/20 transition-all resize-none min-h-[120px] placeholder:opacity-40"
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60 flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Duracao
              </span>
              <span className="text-sm font-bold" style={{ color: theme.colors.primary }}>{duration}s</span>
            </div>
            <input
              type="range" min={6} max={90} step={6} value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              disabled={isGenerating}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10"
              style={{ accentColor: theme.colors.primary }}
            />
            <div className="flex justify-between mt-1 text-[10px] text-white/30">
              {MARKS.map(m => <span key={m}>{m}s</span>)}
            </div>
            <p className="text-xs text-white/40 mt-2">
              {sceneCount} cena{sceneCount > 1 ? 's' : ''} de {SCENE_DURATION}s cada — tempo estimado: ~{sceneCount * 40}s ({Math.ceil(sceneCount * 40 / 60)}min)
            </p>
          </div>

          <div className="flex gap-2">
            {(['9:16', '16:9', '1:1'] as Format[]).map(f => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                disabled={isGenerating}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  format === f
                    ? 'text-[#1a1a1a] font-bold'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
                style={format === f ? { backgroundColor: theme.colors.primary } : undefined}
              >
                {f === '9:16' ? '9:16 Vertical' : f === '16:9' ? '16:9 Horizontal' : '1:1 Quadrado'}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-white/60">
              <Mic className="w-4 h-4" />
              <span>Adicionar narracao</span>
              <div
                onClick={() => !isGenerating && setNarration(!narration)}
                className={`w-10 h-5 rounded-full transition-colors relative ${narration ? '' : 'bg-white/10'}`}
                style={narration ? { backgroundColor: theme.colors.primary } : undefined}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${narration ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </label>
            <Sliders className="w-4 h-4 text-white/20" />
          </div>

          <Button
            variant="primary" size="lg" fullWidth icon={Play}
            disabled={prompt.trim().length < 10 || isGenerating}
            loading={status === 'previewing'}
            onClick={startCompose}
          >
            COMPOR VIDEO ({duration}s — {sceneCount} cenas)
          </Button>
        </div>
      </Card>

      {/* Scene Preview (before compose) */}
      {previewScenes.length > 0 && !isGenerating && !isDone && (
        <Card variant="default" padding="p-4">
          <p className="text-xs text-white/40 mb-3">Pre-visualizacao do roteiro ({previewScenes.length} cenas)</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {previewScenes.map(s => (
              <div key={s.index} className="min-w-[80px] max-w-[80px] bg-white/5 rounded-lg p-2 text-center flex-shrink-0">
                <span className="text-[10px] font-bold text-white/50">#{s.index}</span>
                <p className="text-[9px] text-white/40 mt-1 line-clamp-3">{s.prompt}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Generation Progress */}
      {(isGenerating || isDone || status === 'error') && job && (
        <Card variant="elevated" padding="p-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-white">
                  {status === 'stitching' ? 'Montando video final...' : status === 'done' ? 'Video pronto!' : status === 'error' ? 'Erro na composicao' : `Gerando cenas — ${doneScenesCount}/${totalScenes}`}
                </span>
                <p className="text-[10px] text-white/40 mt-0.5">
                  {status === 'generating' && `Cada cena leva ~40s. Estimativa: ${Math.max(0, (totalScenes - doneScenesCount) * 40)}s restantes`}
                  {status === 'stitching' && 'FFmpeg unindo os clips no servidor...'}
                  {status === 'done' && 'Pronto para download e publicacao'}
                </p>
              </div>
              {job.provider && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40">
                  Gerado com {job.provider || 'Veo 3.1'}
                </span>
              )}
            </div>

            {!isDone && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-white/50">{Math.round((doneScenesCount / totalScenes) * 100)}%</span>
                  <span className="text-white/30">{doneScenesCount}/{totalScenes} cenas</span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                    style={{
                      width: `${Math.max(2, (doneScenesCount / totalScenes) * 100)}%`,
                      backgroundColor: status === 'error' ? '#ef4444' : '#25D366'
                    }}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)50%,rgba(255,255,255,0.15)75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[stripes_1s_linear_infinite]" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 overflow-x-auto pb-2">
              {job.scenes.map(s => (
                <div
                  key={s.index}
                  className={`min-w-[80px] max-w-[80px] rounded-lg p-2 text-center flex-shrink-0 border ${
                    s.status === 'done' ? 'border-[#25D366]/30 bg-[#25D366]/5'
                    : s.status === 'generating' ? 'border-[#f59e0b]/30 bg-[#f59e0b]/5 animate-pulse'
                    : s.status === 'failed' ? 'border-[#ef4444]/30 bg-[#ef4444]/5'
                    : 'border-white/5 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <span className="text-[10px] font-bold text-white/50">#{s.index}</span>
                    {s.status === 'done' && <Check className="w-3 h-3 text-[#25D366]" />}
                    {s.status === 'generating' && <Loader2 className="w-3 h-3 text-[#f59e0b] animate-spin" />}
                    {s.status === 'failed' && (
                      <button onClick={() => retryScene(s.index)} title="Tentar novamente">
                        <RefreshCw className="w-3 h-3 text-[#ef4444] hover:text-red-300 cursor-pointer" />
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-white/40 line-clamp-2">{s.prompt}</p>
                </div>
              ))}
            </div>

            {status === 'stitching' && (
              <div className="flex items-center justify-center gap-2 text-sm text-[#f59e0b]">
                <Loader2 className="w-4 h-4 animate-spin" />
                Montando video final...
              </div>
            )}

            {status === 'error' && job.error && (
              <p className="text-sm text-[#ef4444]">{job.error}</p>
            )}
          </div>
        </Card>
      )}

      {/* Result */}
      {isDone && job?.videoUrl && (
        <Card variant="elevated" padding="p-5">
          <div className="space-y-4">
            <video
              src={job.videoUrl}
              controls
              className="w-full rounded-xl bg-black"
              style={{ aspectRatio: format === '9:16' ? '9/16' : format === '16:9' ? '16/9' : '1/1', maxHeight: 500 }}
            />

            <div className="flex gap-3">
              <a
                href={`/api/video-composer/download/${job.id}`}
                download
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-semibold text-base bg-[#25D366] text-[#1a1a1a] hover:opacity-90 transition-all active:scale-95"
              >
                <Download className="w-5 h-5" /> Baixar Video
              </a>
              <Button variant="secondary" size="lg" icon={Film}>
                Publicar nas Redes
              </Button>
            </div>

            <details className="text-sm text-white/50">
              <summary className="cursor-pointer hover:text-white/70 transition-colors">
                Detalhes: {duration}s, {job.scenes.length} cenas, {format}, {job.provider || 'Veo 3.1'}
              </summary>
              <ul className="mt-2 space-y-1 pl-4">
                {job.scenes.map(s => (
                  <li key={s.index} className="text-xs text-white/30">
                    <span className="text-white/50 font-medium">Cena {s.index}:</span> {s.prompt}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </Card>
      )}
    </div>
  );
}
