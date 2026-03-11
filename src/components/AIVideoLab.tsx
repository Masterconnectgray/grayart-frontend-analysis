import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
import { SOCIAL_FORMATS } from '../constants/VideoTemplates';
import { useAppContext } from '../context/AppContext';
import {
  generateVideoPrompt,
  startVideoGeneration,
  pollVideoStatus,
  checkApiAccess,
} from '../services/GeminiService';

interface AIVideoLabProps {
  division: Division;
}

interface VideoProject {
  id: number;
  name: string;
  duration: number;
  format: string;
  status: 'ready' | 'processing' | 'failed' | 'generating';
  tools: string[];
  thumbnail: string;
  createdAt: string;
  fromCopy?: boolean;
  script?: string;
  videoUrl?: string;
  operationName?: string;
  aiGenerated?: boolean;
  videoPrompt?: string;
}

type ToolCategory = 'create' | 'enhance' | 'captions' | 'fx';

interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  provider: 'CapCut' | 'Canva' | 'InShot' | 'Adobe' | 'Veo 3' | 'Gemini';
  icon: string;
}

const TOOLS: Tool[] = [
  { id: 'v-veo3', name: 'Veo 3 — Geração IA', description: 'Cria vídeo real com Google Veo 3', category: 'create', provider: 'Veo 3', icon: '🎬' },
  { id: 'v-kenburns', name: 'Movimento Ken Burns', description: 'Transições suaves em fotos estáticas', category: 'create', provider: 'Adobe', icon: '🖼️' },
  { id: 'v-slideshow', name: 'Slideshow Inteligente', description: 'Montagem rítmica de fotos', category: 'create', provider: 'InShot', icon: '📽️' },
  { id: 'v-animate', name: 'Animação IA', description: 'IA anima rostos e fundos de fotos', category: 'create', provider: 'Canva', icon: '✨' },
  { id: 'e-autocut', name: 'Corte Dinâmico IA', description: 'Remove silêncios e otimiza retenção', category: 'enhance', provider: 'CapCut', icon: '✂️' },
  { id: 'e-color', name: 'Gradação de Cor', description: 'Look cinematográfico automático', category: 'enhance', provider: 'Adobe', icon: '🎨' },
  { id: 'e-audio', name: 'Limpeza de Áudio', description: 'Remove ruído e nivela vozes', category: 'enhance', provider: 'Adobe', icon: '🎙️' },
  { id: 'c-auto', name: 'Legendas Virais', description: 'Estilo TikTok palavra por palavra', category: 'captions', provider: 'CapCut', icon: '💬' },
  { id: 'c-cta', name: 'CTAs Dinâmicos', description: 'Chamadas de ação animadas', category: 'captions', provider: 'Canva', icon: '🚀' },
  { id: 'f-trans', name: 'Transições Pro', description: 'Cortes invisíveis e transições modernas', category: 'fx', provider: 'CapCut', icon: '🎞️' },
  { id: 'f-logo', name: 'Watermark Division', description: 'Insere logo da divisão com opacidade', category: 'fx', provider: 'Canva', icon: '🏷️' },
];

const CATEGORY_MAP: Record<ToolCategory, string> = {
  create: 'Produção',
  enhance: 'Refinamento',
  captions: 'Legendas/CTA',
  fx: 'Finalização',
};

const PROVIDER_COLORS: Record<string, string> = {
  'CapCut': '#00FF9D',
  'Canva': '#7d2ae8',
  'InShot': '#ff4d4d',
  'Adobe': '#ff0000',
  'Veo 3': '#4285F4',
  'Gemini': '#34A853',
};

const VEO_STEPS = [
  { label: 'ANALISANDO SCRIPT COM GEMINI...', detail: 'Interpretando contexto e tom do script' },
  { label: 'GERANDO PROMPT CINEMATOGRÁFICO...', detail: 'Criando diretrizes visuais para o Veo 3' },
  { label: 'ENVIANDO PARA VEO 3...', detail: 'Transmitindo prompt para a nuvem Google' },
  { label: 'RENDERIZANDO CENAS...', detail: 'IA gerando frames e composicao visual' },
  { label: 'CODIFICANDO VÍDEO H.264...', detail: 'Comprimindo com qualidade cinematografica' },
  { label: 'APLICANDO GRADAÇÃO DE COR...', detail: 'Color grading automatico profissional' },
  { label: 'OTIMIZANDO PARA A PLATAFORMA...', detail: 'Ajustando resolucao e bitrate final' },
  { label: 'FINALIZANDO EXPORTAÇÃO...', detail: 'Preparando arquivo para download' },
];

const RESOLUTION_OPTIONS = [
  { id: '720p', label: '720p (HD)', width: 1280, height: 720, multiplier: 1 },
  { id: '1080p', label: '1080p (Full HD)', width: 1920, height: 1080, multiplier: 2.25 },
  { id: '4k', label: '4K (Ultra HD)', width: 3840, height: 2160, multiplier: 9 },
];

const FPS_OPTIONS = [
  { id: 24, label: '24 fps (Cinema)' },
  { id: 30, label: '30 fps (Padrao)' },
  { id: 60, label: '60 fps (Fluido)' },
];

const DURATION_MARKS = [1, 5, 15, 30, 45, 60];

function estimateFileSize(duration: number, resolution: string, fps: number): string {
  const res = RESOLUTION_OPTIONS.find(r => r.id === resolution);
  const baseMbPerSec = 0.5;
  const fpsMultiplier = fps / 30;
  const mb = duration * baseMbPerSec * (res?.multiplier || 1) * fpsMultiplier;
  if (mb < 1) return `${Math.round(mb * 1024)} KB`;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}

// ─── Componente ────────────────────────────────────────────────────────────────

const AIVideoLab: React.FC<AIVideoLabProps> = ({ division }) => {
  const { addNotification, incrementVideos, stats, generatedCopy, setGeneratedCopy } = useAppContext();
  const theme = DIVISIONS[division];
  const isDark = division !== 'gray-art';

  const [activeCategory, setActiveCategory] = useState<ToolCategory>('create');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [duration, setDuration] = useState(6);
  const [resolution, setResolution] = useState('1080p');
  const [fps, setFps] = useState(30);
  const [format, setFormat] = useState(SOCIAL_FORMATS[0].id);
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Script / Prompt
  const [scriptText, setScriptText] = useState('');
  const [copyBannerVisible, setCopyBannerVisible] = useState(false);
  const scriptAreaRef = useRef<HTMLTextAreaElement>(null);

  // Estado de geração IA
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState(0);
  const [generatingStepLabel, setGeneratingStepLabel] = useState('');
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [showGeneratedPrompt, setShowGeneratedPrompt] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ gemini: boolean; veo: boolean; quotaOk: boolean } | null>(null);
  const [quotaWarning, setQuotaWarning] = useState(false);

  // Player de vídeo
  const [activeVideo, setActiveVideo] = useState<VideoProject | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Verificar API ao montar ─────────────────────────────────────────────────
  useEffect(() => {
    checkApiAccess().then(status => {
      setApiStatus(status);
      if (!status.quotaOk) setQuotaWarning(true);
    });
  }, []);

  // ─── Injetar copy do gerador ─────────────────────────────────────────────────
  useEffect(() => {
    if (generatedCopy) {
      const formatted = `🎬 SCRIPT — ${generatedCopy.platform.toUpperCase()}\n\n📌 GANCHO:\n${generatedCopy.hook}\n\n📝 CONTEÚDO:\n${generatedCopy.body}\n\n🚀 CTA:\n${generatedCopy.cta}\n\n🏷️ TAGS: ${generatedCopy.tags.map(t => '#' + t).join(' ')}`;
      setScriptText(formatted);
      setCopyBannerVisible(true);
      setSelectedTools(['v-veo3', 'c-auto', 'c-cta']);
      const platformFormatMap: Record<string, string> = {
        instagram: 'reels', tiktok: 'tiktok', youtube: 'youtube-shorts', linkedin: 'youtube-landscape',
      };
      const targetFormat = platformFormatMap[generatedCopy.platform];
      if (targetFormat) {
        const found = SOCIAL_FORMATS.find(f => f.id === targetFormat);
        if (found) setFormat(found.id);
      }
      setTimeout(() => {
        scriptAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      setTimeout(() => setCopyBannerVisible(false), 7000);
    }
  }, [generatedCopy]);

  useEffect(() => {
    setSelectedTools([]);
    setActiveCategory('create');
    setProjects([]);
    setUploadedFiles([]);
    setGeneratedPrompt('');
    setShowGeneratedPrompt(false);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [division]);

  const toggleTool = (id: string) => {
    setSelectedTools(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const clearScript = () => {
    setScriptText('');
    setGeneratedCopy(null);
    setCopyBannerVisible(false);
    setGeneratedPrompt('');
    setShowGeneratedPrompt(false);
  };

  // ─── Geração REAL com Veo 3 + Gemini ────────────────────────────────────────
  const runAIGeneration = useCallback(async () => {
    if (!scriptText.trim()) {
      addNotification('⚠️ Escreva um script antes de gerar o vídeo.', 'error');
      return;
    }

    setIsGenerating(true);
    setGeneratingStep(0);
    setGeneratingProgress(5);
    setGeneratingStepLabel(VEO_STEPS[0].label);

    try {
      // ── Passo 1: Gerar prompt cinematográfico com Gemini ────────────────────
      setGeneratingStep(1);
      setGeneratingProgress(15);
      setGeneratingStepLabel(VEO_STEPS[1].label);

      const selectedFormat = SOCIAL_FORMATS.find(f => f.id === format);
      const aspectRatio = selectedFormat?.ratio === '16:9' ? '16:9' as const : '9:16' as const;

      let videoPrompt = '';
      try {
        videoPrompt = await generateVideoPrompt(division, scriptText, format);
        setGeneratedPrompt(videoPrompt);
        setShowGeneratedPrompt(true);
      } catch {
        // Se Gemini falhou por quota, usa prompt fallback baseado na divisão
        const fallbacks: Record<Division, string> = {
          'connect-gray': 'Professional building manager in modern condominium lobby, networking with service providers, cinematic 9:16, warm lighting, dynamic camera movement, corporate aesthetic',
          'gray-up': 'Elevator modernization technician installing new components in modern building, close-up tools and technology, cinematic lighting, professional 9:16 format',
          'gray-up-flow': 'Business consultant reviewing process charts with entrepreneur in modern office, dynamic camera, professional atmosphere, cinematic 9:16',
          'gray-art': 'Creative designer working on brand identity at modern studio, digital displays showing colorful designs, cinematic 9:16, vibrant colors',
        };
        videoPrompt = fallbacks[division];
        setGeneratedPrompt(videoPrompt);
        setShowGeneratedPrompt(true);
        addNotification('⚡ Usando prompt otimizado (Gemini com quota limitada)', 'info');
      }

      // ── Passo 2: Iniciar geração no Veo 3 ─────────────────────────────────
      setGeneratingStep(2);
      setGeneratingProgress(30);
      setGeneratingStepLabel(VEO_STEPS[2].label);

      let operationName = '';
      let useRealVideo = true;

      try {
        operationName = await startVideoGeneration(videoPrompt, aspectRatio, duration);
        addNotification('🎬 Vídeo enviado para o Veo 3! Aguardando renderização...', 'info');
      } catch (veoErr) {
        const errMsg = String(veoErr);
        if (errMsg.includes('QUOTA_EXCEEDED')) {
          setQuotaWarning(true);
          useRealVideo = false;
          addNotification('⚠️ Quota do Veo 3 atingida. Ativando modo simulação premium...', 'info');
        } else {
          throw veoErr;
        }
      }

      if (useRealVideo && operationName) {
        // ── Passo 3–7: Polling com progresso visual ─────────────────────────
        setGeneratingStep(3);
        setGeneratingProgress(40);
        setGeneratingStepLabel(VEO_STEPS[3].label);

        const tempProject: VideoProject = {
          id: Date.now(),
          name: `${DIVISIONS[division].name} — Vídeo IA ${projects.length + 1}`,
          duration,
          format: selectedFormat?.label || 'Reels',
          status: 'generating',
          tools: ['Veo 3', 'Gemini'],
          thumbnail: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=200&h=120&auto=format&fit=crop',
          createdAt: new Date().toLocaleTimeString(),
          fromCopy: !!generatedCopy,
          script: scriptText,
          operationName,
          aiGenerated: true,
          videoPrompt,
        };
        setProjects(prev => [tempProject, ...prev]);

        // Polling a cada 5 segundos
        let attempt = 0;
        const maxAttempts = 36; // máx 3 minutos

        pollingRef.current = setInterval(async () => {
          attempt++;
          const stepIdx = Math.min(3 + Math.floor(attempt / 5), 7);
          const prog = Math.min(40 + attempt * 1.5, 95);
          setGeneratingStep(stepIdx);
          setGeneratingProgress(prog);
          setGeneratingStepLabel(VEO_STEPS[stepIdx].label);

          try {
            const result = await pollVideoStatus(operationName);
            if (result.done) {
              if (pollingRef.current) clearInterval(pollingRef.current);
              setGeneratingProgress(100);
              setGeneratingStep(7);
              setGeneratingStepLabel(VEO_STEPS[7].label);

              if (result.videoUrl) {
                setProjects(prev => prev.map(p =>
                  p.id === tempProject.id
                    ? { ...p, status: 'ready', videoUrl: result.videoUrl }
                    : p
                ));
                incrementVideos();
                setGeneratedCopy(null);
                addNotification('🎉 Vídeo gerado pelo Veo 3! Clique para assistir.', 'success');
              } else if (result.error) {
                setProjects(prev => prev.map(p =>
                  p.id === tempProject.id ? { ...p, status: 'failed' } : p
                ));
                addNotification(`❌ Erro na geração: ${result.error}`, 'error');
              }

              setIsGenerating(false);
            }
          } catch {
            // silencia erros de polling intermediários
          }

          if (attempt >= maxAttempts) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsGenerating(false);
            addNotification('⏱️ Timeout. Verifique a fila de projetos.', 'error');
          }
        }, 5000);

      } else {
        // ── Modo simulação premiun (quota esgotada) ─────────────────────────
        const steps = [3, 4, 5, 6, 7];
        const progs = [50, 65, 75, 88, 100];
        for (let i = 0; i < steps.length; i++) {
          await new Promise(r => setTimeout(r, 900));
          setGeneratingStep(steps[i]);
          setGeneratingProgress(progs[i]);
          setGeneratingStepLabel(VEO_STEPS[steps[i]].label);
        }

        const newProj: VideoProject = {
          id: Date.now(),
          name: `${DIVISIONS[division].name} — Simulação IA ${projects.length + 1}`,
          duration,
          format: selectedFormat?.label || 'Reels',
          status: 'ready',
          tools: ['Gemini (Prompt)', 'Simulação Veo 3'],
          thumbnail: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=200&h=120&auto=format&fit=crop',
          createdAt: new Date().toLocaleTimeString(),
          fromCopy: !!generatedCopy,
          script: scriptText,
          aiGenerated: true,
          videoPrompt,
        };
        setProjects(prev => [newProj, ...prev]);
        incrementVideos();
        setGeneratedCopy(null);
        addNotification('✅ Projeto salvo! Ative o billing no Google Cloud para gerar vídeos reais com Veo 3.', 'info');
        setIsGenerating(false);
      }

    } catch (err) {
      setIsGenerating(false);
      if (pollingRef.current) clearInterval(pollingRef.current);
      addNotification(`❌ Erro: ${String(err)}`, 'error');
    }
  }, [scriptText, division, format, duration, generatedCopy, projects.length, addNotification, incrementVideos, setGeneratedCopy]);

  // ─── Estilos ─────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>

      {/* ── Banner Copy Recebida ────────────────────────────────────────────── */}
      {copyBannerVisible && (
        <div style={{
          gridColumn: '1 / -1',
          background: `linear-gradient(135deg, ${theme.colors.primary}22, ${theme.colors.primary}08)`,
          border: `1px solid ${theme.colors.primary}44`,
          borderRadius: '16px', padding: '1rem 1.5rem',
          display: 'flex', alignItems: 'center', gap: '1rem',
          animation: 'slideInBanner 0.5s ease',
        }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: theme.colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>🎬</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: theme.colors.primary }}>Copy recebida do Gerador!</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.2rem' }}>
              Script injetado. Ferramentas Veo 3 + Gemini pré-selecionadas. Clique em <strong>GERAR VÍDEO IA</strong>.
            </div>
          </div>
          <button onClick={() => setCopyBannerVisible(false)} style={{ background: 'none', color: 'inherit', opacity: 0.4, fontWeight: 800, padding: '0.2rem 0.4rem' }}>×</button>
        </div>
      )}

      {/* ── Status API ────────────────────────────────────────────────────────── */}
      {quotaWarning && (
        <div style={{
          gridColumn: '1 / -1',
          background: 'linear-gradient(135deg, #f59e0b15, #f59e0b05)',
          border: '1px solid #f59e0b44',
          borderRadius: '14px', padding: '0.8rem 1.2rem',
          display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '1.2rem' }}>⚡</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.8rem' }}>QUOTA FREE TIER ATINGIDA — </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
              Para gerar vídeos reais com Veo 3, ative o billing em{' '}
              <a href="https://console.cloud.google.com/billing" target="_blank" rel="noreferrer" style={{ color: '#f59e0b' }}>console.cloud.google.com/billing</a>.
              O Gemini gera os prompts e o Veo 3 produz os vídeos. Enquanto isso, o sistema funciona em modo simulação.
            </span>
          </div>
          <button onClick={() => setQuotaWarning(false)} style={{ background: '#f59e0b22', color: '#f59e0b', border: 'none', borderRadius: '8px', padding: '0.3rem 0.7rem', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>OK</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
              Laboratório <span style={{ color: theme.colors.primary }}>IA</span>
              <span style={{ marginLeft: '0.8rem', fontSize: '0.7rem', background: '#4285F415', color: '#4285F4', padding: '0.2rem 0.6rem', borderRadius: '8px', fontWeight: 900, letterSpacing: '1px' }}>
                VEO 3 + GEMINI
              </span>
            </h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>Geração de vídeo real com IA para {theme.name}</p>
              <div style={{ background: `${theme.colors.primary}22`, padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, color: theme.colors.primary }}>
                TOTAL: {stats.videosCreated}
              </div>
            </div>
          </div>

          {/* Status API */}
          {apiStatus && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ padding: '0.3rem 0.7rem', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, background: apiStatus.gemini ? '#22c55e15' : '#ef444415', color: apiStatus.gemini ? '#22c55e' : '#ef4444', border: `1px solid ${apiStatus.gemini ? '#22c55e33' : '#ef444433'}` }}>
                GEMINI {apiStatus.gemini ? '✓' : '✗'}
              </div>
              <div style={{ padding: '0.3rem 0.7rem', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, background: apiStatus.veo ? '#4285F415' : '#f59e0b15', color: apiStatus.veo ? '#4285F4' : '#f59e0b', border: `1px solid ${apiStatus.veo ? '#4285F433' : '#f59e0b33'}` }}>
                VEO 3 {apiStatus.veo ? '✓' : '⚡'}
              </div>
            </div>
          )}
        </div>

        {/* ── Campo de Script ─────────────────────────────────────────────── */}
        <div className="premium-card" style={{ background: isDark ? '#141428' : '#f8f8ff', border: `1px solid ${scriptText ? theme.colors.primary + '44' : 'transparent'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800 }}>
              📝 SCRIPT DO VÍDEO
              {scriptText && generatedCopy && (
                <span style={{ marginLeft: '0.6rem', fontSize: '0.6rem', fontWeight: 900, background: theme.colors.primary, color: '#fff', padding: '0.15rem 0.4rem', borderRadius: '6px' }}>DO GERADOR</span>
              )}
            </h3>
            {scriptText && (
              <button onClick={clearScript} style={{ background: isDark ? '#2d2d3e' : '#eee', color: isDark ? '#aaa' : '#666', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700 }}>
                LIMPAR
              </button>
            )}
          </div>
          <textarea
            ref={scriptAreaRef}
            value={scriptText}
            onChange={e => setScriptText(e.target.value)}
            placeholder={`Escreva o script ou tema do vídeo aqui...\n\nExemplo: "Síndicos que usam manutenção preventiva economizam R$3.400/mês vs corretiva de emergência. Coffee Meet — a rede que conecta síndicos aos melhores fornecedores."\n\nO Gemini transforma em prompt cinematográfico e o Veo 3 gera o vídeo real.`}
            rows={scriptText ? 8 : 6}
            style={{
              width: '100%', padding: '1rem', borderRadius: '12px',
              background: isDark ? '#0d0d1a' : '#fff',
              border: `1px solid ${scriptText ? theme.colors.primary + '33' : (isDark ? '#2d2d2d' : '#e5e5e5')}`,
              color: isDark ? '#e0e0e0' : '#1a1a1a', fontSize: '0.82rem',
              lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit', transition: 'border-color 0.3s',
            }}
          />
          {!scriptText && (
            <div style={{ marginTop: '0.8rem', fontSize: '0.7rem', opacity: 0.4, textAlign: 'center' }}>
              💡 Acesse <strong>🎬 Gerador</strong> → gere copy → clique <strong>"Transformar em Vídeo"</strong> para auto-preencher
            </div>
          )}
        </div>

        {/* ── Prompt gerado pelo Gemini ─────────────────────────────────────── */}
        {showGeneratedPrompt && generatedPrompt && (
          <div className="animate-fade-in premium-card" style={{ background: isDark ? '#0d1428' : '#f0f7ff', border: '1px solid #4285F433' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>G</div>
              <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#4285F4' }}>PROMPT CINEMATOGRÁFICO — GERADO PELO GEMINI</span>
            </div>
            <p style={{ fontSize: '0.8rem', opacity: 0.75, lineHeight: 1.6, fontStyle: 'italic' }}>{generatedPrompt}</p>
          </div>
        )}

        {/* ── Ferramentas ──────────────────────────────────────────────────── */}
        <div className="premium-card">
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {(Object.keys(CATEGORY_MAP) as ToolCategory[]).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '12px',
                  background: activeCategory === cat ? theme.colors.primary : 'rgba(255,255,255,0.05)',
                  color: activeCategory === cat ? (isDark ? '#fff' : '#000') : (isDark ? '#666' : '#aaa'),
                  fontSize: '0.75rem', fontWeight: 700,
                }}
              >
                {CATEGORY_MAP[cat]}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {TOOLS.filter(t => t.category === activeCategory).map(tool => (
              <div
                key={tool.id}
                onClick={() => toggleTool(tool.id)}
                style={{
                  padding: '1.2rem', borderRadius: '16px',
                  background: selectedTools.includes(tool.id) ? `${theme.colors.primary}15` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selectedTools.includes(tool.id) ? theme.colors.primary : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 0.3s ease', position: 'relative',
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{tool.icon}</div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.2rem' }}>{tool.name}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{tool.description}</div>
                <span style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '0.6rem', fontWeight: 900, color: PROVIDER_COLORS[tool.provider] || '#888', letterSpacing: '1px' }}>
                  {tool.provider.toUpperCase()}
                </span>
                {selectedTools.includes(tool.id) && (
                  <div style={{ position: 'absolute', top: '-8px', right: '-8px', background: theme.colors.primary, borderRadius: '50%', color: '#fff', padding: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Fila de Projetos ─────────────────────────────────────────────── */}
        {projects.length > 0 && (
          <div className="premium-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem' }}>PROJETOS GERADOS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {projects.map(p => (
                <div key={p.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', position: 'relative' }}>
                  {p.aiGenerated && (
                    <div style={{ position: 'absolute', top: '-8px', left: '12px', background: '#4285F4', color: '#fff', fontSize: '0.55rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>VEO 3 + GEMINI</div>
                  )}
                  {p.fromCopy && (
                    <div style={{ position: 'absolute', top: '-8px', left: p.aiGenerated ? '110px' : '12px', background: theme.colors.primary, color: '#fff', fontSize: '0.55rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>DO GERADOR</div>
                  )}
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img src={p.thumbnail} alt="thumb" style={{ width: '90px', height: '56px', borderRadius: '8px', objectFit: 'cover', opacity: p.status === 'generating' ? 0.4 : 1 }} />
                      {p.status === 'generating' && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: '24px', height: '24px', border: '3px solid #4285F4', borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        </div>
                      )}
                      {p.status === 'ready' && p.videoUrl && (
                        <div
                          onClick={() => setActiveVideo(p)}
                          style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          <span style={{ fontSize: '1.5rem' }}>▶</span>
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '0.2rem' }}>{p.format} • {p.duration}s • {p.createdAt}</div>
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                        {p.tools.map((t, i) => (
                          <span key={i} style={{ fontSize: '0.6rem', padding: '0.2rem 0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>{t}</span>
                        ))}
                      </div>
                      {p.status === 'generating' && (
                        <div style={{ marginTop: '0.4rem', fontSize: '0.65rem', color: '#4285F4', fontWeight: 700 }}>⏳ Processando no Veo 3...</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {p.status === 'ready' && p.videoUrl && (
                        <button
                          onClick={() => setActiveVideo(p)}
                          style={{ background: '#4285F4', color: '#fff', padding: '0.5rem 0.8rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }}
                        >
                          ▶ ASSISTIR
                        </button>
                      )}
                      {(p.status === 'ready') && (
                        <button
                          onClick={() => {
                            const blob = new Blob([
                              `Projeto: ${p.name}\nFormato: ${p.format}\nDuracao: ${p.duration}s\nFerramentas: ${p.tools.join(', ')}\nCriado: ${p.createdAt}\n${p.videoPrompt ? `\nPROMPT IA:\n${p.videoPrompt}` : ''}\n${p.script ? `\nSCRIPT:\n${p.script}` : ''}`
                            ], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = `${p.name.replace(/\s+/g, '_')}.txt`; a.click();
                            URL.revokeObjectURL(url);
                          }}
                          style={{ background: theme.colors.primary, color: isDark ? '#fff' : '#000', padding: '0.5rem 0.8rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }}
                        >
                          EXPORTAR
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Coluna Direita: Configuração + Progresso ────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="premium-card">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1.2rem', opacity: 0.7 }}>CONFIGURAÇÃO VEO 3</h3>

          {/* Duracao */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.8rem' }}>
              <span>DURACAO</span>
              <span style={{ color: theme.colors.primary, fontSize: '1rem' }}>{duration}s</span>
            </div>
            <input
              type="range" min="1" max="60" step="1" value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              style={{ width: '100%', accentColor: theme.colors.primary }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', padding: '0 2px' }}>
              {DURATION_MARKS.map(m => (
                <span
                  key={m}
                  onClick={() => setDuration(m)}
                  style={{
                    fontSize: '0.55rem', fontWeight: 700, cursor: 'pointer',
                    color: duration === m ? theme.colors.primary : (isDark ? '#555' : '#aaa'),
                    transition: 'color 0.2s',
                  }}
                >
                  {m}s
                </span>
              ))}
            </div>
            <div style={{ fontSize: '0.6rem', opacity: 0.4, textAlign: 'center', marginTop: '0.3rem' }}>
              1-8s: clipe curto | 9-30s: Reels/Shorts | 31-60s: video completo
            </div>
          </div>

          {/* Resolucao */}
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.4 }}>RESOLUCAO</span>
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem' }}>
              {RESOLUTION_OPTIONS.map(res => (
                <button
                  key={res.id}
                  onClick={() => setResolution(res.id)}
                  style={{
                    flex: 1, padding: '0.6rem 0.3rem', borderRadius: '10px',
                    background: resolution === res.id ? `${theme.colors.primary}20` : 'rgba(255,255,255,0.03)',
                    border: resolution === res.id ? `1px solid ${theme.colors.primary}` : '1px solid transparent',
                    color: resolution === res.id ? theme.colors.primary : '#666',
                    fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <div>{res.id.toUpperCase()}</div>
                  <div style={{ fontSize: '0.5rem', opacity: 0.5, marginTop: '0.15rem' }}>{res.width}x{res.height}</div>
                </button>
              ))}
            </div>
          </div>

          {/* FPS */}
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.4 }}>FRAME RATE</span>
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem' }}>
              {FPS_OPTIONS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFps(f.id)}
                  style={{
                    flex: 1, padding: '0.6rem 0.3rem', borderRadius: '10px',
                    background: fps === f.id ? `${theme.colors.primary}20` : 'rgba(255,255,255,0.03)',
                    border: fps === f.id ? `1px solid ${theme.colors.primary}` : '1px solid transparent',
                    color: fps === f.id ? theme.colors.primary : '#666',
                    fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Estimativa de tamanho */}
          <div style={{
            padding: '0.6rem', borderRadius: '8px',
            background: isDark ? '#ffffff06' : '#f5f5f5',
            marginBottom: '1.5rem', textAlign: 'center',
            fontSize: '0.7rem', fontWeight: 700, opacity: 0.6,
          }}>
            Tamanho estimado: <span style={{ color: theme.colors.primary }}>{estimateFileSize(duration, resolution, fps)}</span>
          </div>

          {/* Formato */}
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.4 }}>FORMATO DE SAÍDA</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.8rem' }}>
              {SOCIAL_FORMATS.slice(0, 4).map(fmt => (
                <button
                  key={fmt.id}
                  onClick={() => setFormat(fmt.id)}
                  style={{
                    padding: '0.8rem', borderRadius: '10px',
                    background: format === fmt.id ? `${theme.colors.primary}20` : 'rgba(255,255,255,0.03)',
                    border: format === fmt.id ? `1px solid ${theme.colors.primary}` : '1px solid transparent',
                    color: format === fmt.id ? theme.colors.primary : '#666',
                    fontSize: '0.8rem', fontWeight: 700, justifyContent: 'flex-start',
                  }}
                >
                  <span style={{ opacity: 0.5, marginRight: '0.5rem' }}>{fmt.icon}</span>
                  {fmt.label}
                  <span style={{ float: 'right', fontSize: '0.6rem', opacity: 0.4 }}>{fmt.ratio}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Upload */}
          <input ref={fileInputRef} type="file" multiple accept="video/*,image/*" style={{ display: 'none' }} onChange={e => { const files = Array.from(e.target.files || []); setUploadedFiles(files.map(f => f.name)); addNotification(`${files.length} arquivo(s) carregado(s)`, 'info'); }} />
          <div onClick={() => fileInputRef.current?.click()} style={{ padding: '1rem', borderRadius: '12px', border: `1px dashed ${uploadedFiles.length > 0 ? theme.colors.primary : 'rgba(255,255,255,0.1)'}`, textAlign: 'center', marginBottom: '1rem', cursor: 'pointer', transition: 'all 0.3s' }}>
            {uploadedFiles.length > 0 ? (
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: theme.colors.primary }}>{uploadedFiles.length} ARQUIVO(S) ✓</div>
            ) : (
              <>
                <div style={{ fontSize: '1.5rem' }}>📂</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: '0.5rem', opacity: 0.5 }}>REFERÊNCIAS DE IMAGEM (OPCIONAL)</div>
              </>
            )}
          </div>

          {/* Resumo */}
          {scriptText && (
            <div style={{ padding: '0.8rem', borderRadius: '10px', background: isDark ? '#ffffff06' : '#f5f5f5', marginBottom: '1rem', fontSize: '0.7rem' }}>
              <div style={{ fontWeight: 700, opacity: 0.4, marginBottom: '0.4rem' }}>WORKFLOW VEO 3</div>
              <div style={{ color: theme.colors.primary }}>✓ Script: {scriptText.length} caracteres</div>
              <div style={{ opacity: 0.6 }}>✓ Gemini: gera prompt cinematográfico</div>
              <div style={{ color: '#4285F4' }}>✓ Veo 3: renderiza video {duration}s</div>
              <div style={{ opacity: 0.5 }}>✓ Formato: {SOCIAL_FORMATS.find(f => f.id === format)?.label}</div>
              <div style={{ opacity: 0.5 }}>✓ Qualidade: {resolution.toUpperCase()} @ {fps}fps</div>
              <div style={{ opacity: 0.5 }}>✓ Tamanho: ~{estimateFileSize(duration, resolution, fps)}</div>
            </div>
          )}

          {/* Botão Principal */}
          <button
            onClick={runAIGeneration}
            disabled={isGenerating || !scriptText.trim()}
            style={{
              width: '100%', padding: '1.2rem', borderRadius: '16px',
              background: isGenerating
                ? '#333'
                : scriptText.trim()
                  ? `linear-gradient(135deg, #4285F4, ${theme.colors.primary})`
                  : '#222',
              color: isGenerating ? '#666' : scriptText.trim() ? '#fff' : '#444',
              fontWeight: 900, fontSize: '0.9rem',
              boxShadow: scriptText.trim() ? '0 10px 30px rgba(66,133,244,0.4)' : 'none',
              transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              cursor: isGenerating || !scriptText.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {isGenerating ? '⏳ GERANDO...' : '🎬 GERAR VÍDEO COM VEO 3'}
          </button>
        </div>

        {/* ── Progresso Veo 3 ─────────────────────────────────────────────── */}
        {isGenerating && (
          <div className="premium-card" style={{ border: '1px solid #4285F444', background: isDark ? 'linear-gradient(135deg, #0d1428, #141428)' : 'linear-gradient(135deg, #f0f4ff, #f8f8ff)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>VEO 3 ENGINE</span>
              <span style={{ color: '#4285F4', fontWeight: 900, fontSize: '1.1rem' }}>{Math.round(generatingProgress)}%</span>
            </div>

            {/* Barra de progresso com gradiente suave */}
            <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden', position: 'relative' }}>
              <div style={{
                height: '100%', width: `${generatingProgress}%`,
                background: 'linear-gradient(90deg, #4285F4 0%, #34A853 40%, #FBBC05 70%, #EA4335 100%)',
                borderRadius: '5px',
                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 0 12px rgba(66,133,244,0.4)',
              }} />
            </div>

            {/* Tempo estimado */}
            <div style={{ marginTop: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: 600 }}>
                Tempo estimado: ~{Math.max(1, Math.ceil((100 - generatingProgress) / 8))}s restantes
              </div>
              <div style={{ fontSize: '0.6rem', opacity: 0.3 }}>
                Etapa {generatingStep + 1}/{VEO_STEPS.length}
              </div>
            </div>

            {/* Label do passo atual */}
            <div style={{ marginTop: '0.8rem', padding: '0.6rem', borderRadius: '8px', background: isDark ? '#4285F40a' : '#4285F408' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#4285F4', letterSpacing: '0.5px' }}>
                {generatingStepLabel}
              </div>
              <div style={{ fontSize: '0.62rem', opacity: 0.45, marginTop: '0.2rem' }}>
                {VEO_STEPS[generatingStep]?.detail || ''}
              </div>
            </div>

            {/* Indicadores de etapas */}
            <div style={{ marginTop: '0.8rem', display: 'flex', gap: '4px' }}>
              {VEO_STEPS.map((step, i) => (
                <div key={i} title={step.label} style={{
                  flex: 1, height: '4px', borderRadius: '2px',
                  background: i < generatingStep ? '#4285F4' : i === generatingStep ? 'linear-gradient(90deg, #4285F4, #34A853)' : 'rgba(255,255,255,0.08)',
                  transition: 'background 0.4s ease',
                  boxShadow: i === generatingStep ? '0 0 6px rgba(66,133,244,0.5)' : 'none',
                }} />
              ))}
            </div>
          </div>
        )}

        {!isGenerating && projects.length === 0 && (
          <div className="premium-card" style={{ textAlign: 'center', opacity: 0.4, border: '1px dashed rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎬</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Geração Real com Veo 3</div>
            <div style={{ fontSize: '0.7rem', marginTop: '0.3rem' }}>Escreva um script e gere um vídeo real com IA</div>
          </div>
        )}
      </div>

      {/* ── Player Modal ─────────────────────────────────────────────────────── */}
      {activeVideo && activeVideo.videoUrl && (
        <div
          onClick={() => setActiveVideo(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '400px', width: '100%' }}>
            <video controls autoPlay style={{ width: '100%', borderRadius: '16px', boxShadow: '0 30px 80px rgba(0,0,0,0.8)' }} src={activeVideo.videoUrl} />
            <div style={{ marginTop: '1rem', textAlign: 'center', color: '#fff', fontSize: '0.85rem', fontWeight: 700, opacity: 0.7 }}>
              {activeVideo.name}
            </div>
            <button onClick={() => setActiveVideo(null)} style={{ position: 'absolute', top: '-12px', right: '-12px', background: '#fff', color: '#000', width: '30px', height: '30px', borderRadius: '50%', fontWeight: 900, fontSize: '1rem', cursor: 'pointer' }}>×</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInBanner { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AIVideoLab;
