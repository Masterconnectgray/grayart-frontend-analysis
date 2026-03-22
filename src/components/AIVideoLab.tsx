import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
import { SOCIAL_FORMATS } from '../constants/VideoTemplates';
import { useAppContext } from '../context/AppContext';
import { Card } from '../design-system';
import {
  generateVideoPrompt,
  startVideoGeneration,
  pollVideoStatus,
  checkApiAccess,
} from '../services/GeminiService';
import { bffFetch } from '../services/BFFClient';
import { FileVideo, Upload, Check, AlertTriangle, Download, X, Film, Scissors, Type, Sparkles, Youtube, Instagram, MonitorPlay, Zap, RefreshCw, Mic, Volume2, Loader2 } from 'lucide-react';

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
  icon: React.ReactNode;
}

const TOOLS: Tool[] = [
  { id: 'v-veo3', name: 'Veo 3 — Geração IA', description: 'Cria vídeo real com Google Veo 3', category: 'create', provider: 'Veo 3', icon: <Film size={24} /> },
  { id: 'v-kenburns', name: 'Movimento Ken Burns', description: 'Transições suaves em fotos estáticas', category: 'create', provider: 'Adobe', icon: <MonitorPlay size={24} /> },
  { id: 'v-slideshow', name: 'Slideshow Inteligente', description: 'Montagem rítmica de fotos', category: 'create', provider: 'InShot', icon: <FileVideo size={24} /> },
  { id: 'v-animate', name: 'Animação IA', description: 'IA anima rostos e fundos de fotos', category: 'create', provider: 'Canva', icon: <Sparkles size={24} /> },
  { id: 'e-autocut', name: 'Corte Dinâmico IA', description: 'Remove silêncios e otimiza retenção', category: 'enhance', provider: 'CapCut', icon: <Scissors size={24} /> },
  { id: 'e-color', name: 'Gradação de Cor', description: 'Look cinematográfico automático', category: 'enhance', provider: 'Adobe', icon: <Zap size={24} /> },
  { id: 'e-audio', name: 'Limpeza de Áudio', description: 'Remove ruído e nivela vozes', category: 'enhance', provider: 'Adobe', icon: <RefreshCw size={24} /> },
  { id: 'c-auto', name: 'Legendas Virais', description: 'Estilo TikTok palavra por palavra', category: 'captions', provider: 'CapCut', icon: <Type size={24} /> },
  { id: 'c-cta', name: 'CTAs Dinâmicos', description: 'Chamadas de ação animadas', category: 'captions', provider: 'Canva', icon: <Youtube size={24} /> },
  { id: 'f-trans', name: 'Transições Pro', description: 'Cortes invisíveis e transições modernas', category: 'fx', provider: 'CapCut', icon: <Instagram size={24} /> },
  { id: 'f-logo', name: 'Watermark Division', description: 'Insere logo da divisão com opacidade', category: 'fx', provider: 'Canva', icon: <X size={24} /> }, // Placeholder icon
];

const CATEGORY_MAP: Record<ToolCategory, string> = {
  create: 'Produção',
  enhance: 'Refinamento',
  captions: 'Legendas/CTA',
  fx: 'Finalização',
};

const PROVIDER_COLORS: Record<string, string> = {
  'CapCut': 'text-emerald-500 bg-emerald-500/10',
  'Canva': 'text-purple-500 bg-purple-500/10',
  'InShot': 'text-red-500 bg-red-500/10',
  'Adobe': 'text-rose-500 bg-rose-500/10',
  'Veo 3': 'text-blue-500 bg-blue-500/10',
  'Gemini': 'text-green-500 bg-green-500/10',
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
  { id: 24, label: '24 (Cinema)' },
  { id: 30, label: '30 (Padrão)' },
  { id: 60, label: '60 (Fluido)' },
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

const AIVideoLab: React.FC<AIVideoLabProps> = ({ division }) => {
  const { addNotification, incrementVideos, stats, generatedCopy, setGeneratedCopy } = useAppContext();
  const theme = DIVISIONS[division];

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
  const [, setActiveVideo] = useState<VideoProject | null>(null);

  // TTS Kokoro
  const [ttsGenerating, setTtsGenerating] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [ttsVoice, setTtsVoice] = useState('af_heart');
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    checkApiAccess().then(status => {
      setApiStatus(status);
      if (!status.quotaOk) setQuotaWarning(true);
    });
  }, []);

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
      setTimeout(() => scriptAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
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

  const toggleTool = (id: string) => setSelectedTools(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  const clearScript = () => {
    setScriptText('');
    setGeneratedCopy(null);
    setCopyBannerVisible(false);
    setGeneratedPrompt('');
    setShowGeneratedPrompt(false);
  };

  const generateTTS = useCallback(async () => {
    if (!scriptText.trim()) {
      addNotification('Escreva um script antes de gerar narração.', 'error');
      return;
    }

    setTtsGenerating(true);
    try {
      const response = await bffFetch('/ai-service/tts', {
        method: 'POST',
        body: JSON.stringify({ text: scriptText, voice: ttsVoice, speed: 1.0 }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'Erro ao gerar narração');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (ttsAudioUrl) URL.revokeObjectURL(ttsAudioUrl);
      setTtsAudioUrl(url);
      addNotification('Narração gerada com Kokoro TTS (custo zero)', 'success');
    } catch (err) {
      addNotification(`Erro TTS: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setTtsGenerating(false);
    }
  }, [scriptText, ttsVoice, ttsAudioUrl, addNotification]);

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

        let attempt = 0;
        let pollErrors = 0;
        const maxAttempts = 36;
        const maxPollErrors = 5;

        pollingRef.current = setInterval(async () => {
          attempt++;
          const stepIdx = Math.min(3 + Math.floor(attempt / 5), 7);
          const prog = Math.min(40 + attempt * 1.5, 95);
          setGeneratingStep(stepIdx);
          setGeneratingProgress(prog);
          setGeneratingStepLabel(VEO_STEPS[stepIdx].label);

          try {
            const result = await pollVideoStatus(operationName);
            pollErrors = 0;
            if (result.done) {
              if (pollingRef.current) clearInterval(pollingRef.current);
              setGeneratingProgress(100);
              setGeneratingStep(7);
              setGeneratingStepLabel(VEO_STEPS[7].label);

              if (result.videoUrl) {
                setProjects(prev => prev.map(p =>
                  p.id === tempProject.id ? { ...p, status: 'ready', videoUrl: result.videoUrl } : p
                ));
                incrementVideos();
                setGeneratedCopy(null);
                addNotification('Video gerado pelo Veo 3! Clique para assistir.', 'success');
              } else if (result.error) {
                setProjects(prev => prev.map(p =>
                  p.id === tempProject.id ? { ...p, status: 'failed' } : p
                ));
                addNotification(`Erro na geracao: ${result.error}`, 'error');
              }

              setIsGenerating(false);
            }
          } catch (pollErr) {
            pollErrors++;
            console.warn(`Polling error ${pollErrors}/${maxPollErrors}:`, pollErr);
            if (pollErrors >= maxPollErrors) {
              if (pollingRef.current) clearInterval(pollingRef.current);
              setIsGenerating(false);
              setProjects(prev => prev.map(p =>
                p.id === tempProject.id ? { ...p, status: 'failed' } : p
              ));
              addNotification('Erro de conexao ao verificar status do video. Tente novamente.', 'error');
            }
          }

          if (attempt >= maxAttempts) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsGenerating(false);
            addNotification('Timeout. Verifique a fila de projetos.', 'error');
          }
        }, 5000);

      } else {
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

  return (
    <div className="animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        
        {copyBannerVisible && (
          <div className="lg:col-span-2 animate-in slide-in-from-top-4">
            <div className="p-4 rounded-2xl flex items-center gap-4 bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/30">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary-color)] flex items-center justify-center text-xl shrink-0 text-[var(--card-bg)] shadow-lg shadow-[var(--primary-color)]/20">🎬</div>
              <div className="flex-1">
                <div className="font-black text-sm text-[var(--primary-color)] uppercase tracking-wide">Copy recebida do Gerador!</div>
                <div className="text-xs font-medium opacity-70 mt-0.5">
                  Script injetado. Ferramentas Veo 3 + Gemini pré-selecionadas. Clique em <strong className="text-[var(--primary-color)]">GERAR VÍDEO IA</strong>.
                </div>
              </div>
              <button onClick={() => setCopyBannerVisible(false)} className="opacity-50 hover:opacity-100 font-bold p-2 text-lg"><X size={20} /></button>
            </div>
          </div>
        )}

        {quotaWarning && (
          <div className="lg:col-span-2 p-4 rounded-2xl flex items-center gap-4 bg-amber-500/10 border border-amber-500/30 text-amber-500">
            <AlertTriangle className="shrink-0" size={24} />
            <div className="flex-1 text-xs">
              <span className="font-black uppercase tracking-wider block mb-1">Quota Free Tier Atingida</span>
              <span className="font-medium opacity-80 leading-relaxed">
                Para gerar vídeos reais com Veo 3, ative o billing em <a href="https://console.cloud.google.com/billing" target="_blank" rel="noreferrer" className="underline font-bold hover:text-amber-400">console.cloud.google.com/billing</a>.
                O Gemini gera os prompts e o Veo 3 produz os vídeos. Enquanto isso, o sistema funciona em modo simulação premium.
              </span>
            </div>
            <button onClick={() => setQuotaWarning(false)} className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-500 text-[10px] font-black hover:bg-amber-500 hover:text-white transition-colors uppercase tracking-widest shrink-0">OK</button>
          </div>
        )}

        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4 mb-2">
            <div>
              <h2 className="text-2xl font-black flex items-center gap-3">
                Laboratório <span className="text-[var(--primary-color)]">IA</span>
                <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-1 rounded-md font-black tracking-widest uppercase border border-blue-500/20">
                  VEO 3 + GEMINI
                </span>
              </h2>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <p className="opacity-50 font-bold">Geração de vídeo real com IA para {theme.name}</p>
                <div className="bg-[var(--primary-color)]/10 px-2.5 py-1 rounded-md font-black text-[var(--primary-color)] uppercase tracking-widest">
                  Total: {stats.videosCreated}
                </div>
              </div>
            </div>
            
            {apiStatus && (
              <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest">
                <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${apiStatus.gemini ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>
                  GEMINI {apiStatus.gemini ? <Check size={12}/> : <X size={12}/>}
                </div>
                <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${apiStatus.veo ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' : 'bg-amber-500/10 text-amber-500 border-amber-500/30'}`}>
                  VEO 3 {apiStatus.veo ? <Check size={12}/> : <Zap size={12}/>}
                </div>
              </div>
            )}
          </div>

          <Card className={`transition-colors duration-300 border-2 ${scriptText ? 'border-[var(--primary-color)]/30' : 'border-transparent'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Type size={16} className="text-[var(--primary-color)]" />
                SCRIPT DO VÍDEO
                {scriptText && generatedCopy && (
                  <span className="ml-2 text-[10px] bg-[var(--primary-color)] text-[var(--card-bg)] px-2 py-0.5 rounded font-black uppercase tracking-widest">Do Gerador</span>
                )}
              </h3>
              {scriptText && (
                <button onClick={clearScript} className="px-3 py-1.5 rounded-lg bg-[var(--sub-bg)] text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">
                  Limpar
                </button>
              )}
            </div>
            <textarea
              ref={scriptAreaRef}
              value={scriptText}
              onChange={e => setScriptText(e.target.value)}
              placeholder='Escreva o script ou tema do vídeo aqui...\n\nExemplo: "Síndicos que usam manutenção preventiva economizam R$3.400/mês vs corretiva de emergência. Coffee Meet — a rede que conecta síndicos aos melhores fornecedores."\n\nO Gemini transforma em prompt cinematográfico e o Veo 3 gera o vídeo real.'
              rows={scriptText ? 8 : 6}
              className="w-full p-4 rounded-xl bg-[var(--sub-bg)] border border-[var(--sub-bg)] focus:border-[var(--primary-color)]/50 focus:ring-2 ring-[var(--primary-color)]/20 outline-none text-sm font-medium leading-relaxed resize-y min-h-[120px] transition-all"
            />
            {!scriptText && (
              <div className="mt-3 text-[11px] font-medium opacity-50 text-center flex items-center justify-center gap-1.5">
                <Sparkles size={12} className="text-[var(--primary-color)]"/>
                Acesse <strong className="text-[var(--primary-color)] opacity-80">Gerador</strong> → gere copy → clique <strong className="text-[var(--primary-color)] opacity-80">Transformar em Vídeo</strong> para auto-preencher
              </div>
            )}
          </Card>

          {showGeneratedPrompt && generatedPrompt && (
            <Card className="animate-in fade-in bg-blue-500/5 border border-blue-500/20 !p-4">
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-6 h-6 rounded-md bg-blue-500 text-white flex items-center justify-center font-black text-xs">G</div>
                <span className="font-black text-[10px] text-blue-500 uppercase tracking-widest">Prompt Cinematográfico — Gerado pelo Gemini</span>
              </div>
              <p className="text-xs font-medium opacity-80 leading-relaxed italic border-l-2 border-blue-500/30 pl-3">
                "{generatedPrompt}"
              </p>
            </Card>
          )}

          <Card>
            <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
              {(Object.keys(CATEGORY_MAP) as ToolCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-[var(--primary-color)] text-[var(--card-bg)] shadow-md shadow-[var(--primary-color)]/20' : 'bg-[var(--sub-bg)] text-slate-400 hover:text-[var(--card-text)]'}`}
                >
                  {CATEGORY_MAP[cat].toUpperCase()}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TOOLS.filter(t => t.category === activeCategory).map(tool => {
                const isSelected = selectedTools.includes(tool.id);
                return (
                  <div
                    key={tool.id}
                    onClick={() => toggleTool(tool.id)}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative group ${isSelected ? 'bg-[var(--primary-color)]/10 border-[var(--primary-color)]' : 'bg-[var(--sub-bg)] border-transparent hover:border-[var(--primary-color)]/30'}`}
                  >
                    <div className="mb-3 text-[var(--primary-color)] opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all">{tool.icon}</div>
                    <div className="font-black text-sm mb-1">{tool.name}</div>
                    <div className="text-[11px] font-medium opacity-60 leading-tight">{tool.description}</div>
                    <span className={`absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${PROVIDER_COLORS[tool.provider] || 'bg-slate-500/10 text-slate-500'}`}>
                      {tool.provider}
                    </span>
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-[var(--primary-color)] text-[var(--card-bg)] rounded-full flex items-center justify-center shadow-md">
                        <Check size={12} strokeWidth={4} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {projects.length > 0 && (
            <Card>
              <h3 className="text-xs font-black tracking-widest uppercase opacity-70 mb-4 flex items-center gap-2">
                <FileVideo size={14}/> Projetos Gerados
              </h3>
              <div className="flex flex-col gap-3">
                {projects.map(p => (
                  <div key={p.id} className="bg-[var(--sub-bg)] p-3 rounded-xl flex items-center gap-4 relative group hover:ring-1 ring-[var(--primary-color)]/30 transition-all">
                    {p.aiGenerated && (
                      <div className="absolute -top-2 left-4 px-2 py-0.5 bg-blue-500 text-white text-[9px] font-black rounded uppercase shadow-sm z-10">
                        Veo 3 + Gemini
                      </div>
                    )}
                    {p.fromCopy && (
                      <div className={`absolute -top-2 ${p.aiGenerated ? 'left-[90px]' : 'left-4'} px-2 py-0.5 bg-[var(--primary-color)] text-[var(--card-bg)] text-[9px] font-black rounded uppercase shadow-sm z-10`}>
                        Gerador
                      </div>
                    )}
                    
                    <div className="relative w-24 h-[54px] rounded-lg overflow-hidden shrink-0 bg-black/20" onClick={() => p.status === 'ready' && setActiveVideo(p)}>
                       <img src={p.thumbnail} alt="thumb" className={`w-full h-full object-cover transition-opacity ${p.status === 'generating' ? 'opacity-30' : 'opacity-100 group-hover:opacity-80'}`} />
                       {p.status === 'generating' && (
                         <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <RefreshCw size={16} className="text-white animate-spin" />
                         </div>
                       )}
                       {p.status === 'ready' && p.videoUrl && (
                         <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                           <MonitorPlay size={20} />
                         </div>
                       )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{p.name}</div>
                      <div className="text-[10px] opacity-50 font-medium tracking-wide mt-0.5">
                        {p.format} • {p.duration}s • {p.createdAt}
                      </div>
                      <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
                        {p.tools.map((t, i) => (
                           <span key={i} className="whitespace-nowrap bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 px-1.5 py-0.5 rounded text-[9px] font-black opacity-70">
                             {t}
                           </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 shrink-0">
                      {p.status === 'ready' && p.videoUrl && (
                        <button onClick={() => setActiveVideo(p)} className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider hover:bg-blue-600 transition-colors flex items-center gap-1.5">
                          <MonitorPlay size={12}/> Assistir
                        </button>
                      )}
                      {p.status === 'ready' && (
                        <button onClick={() => {
                          const blob = new Blob([`Projeto: ${p.name}\nFormato: ${p.format}\nDuracao: ${p.duration}s\nFerramentas: ${p.tools.join(', ')}\nCriado: ${p.createdAt}\n${p.videoPrompt ? `\nPROMPT IA:\n${p.videoPrompt}` : ''}\n${p.script ? `\nSCRIPT:\n${p.script}` : ''}`], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; a.download = `${p.name.replace(/\s+/g, '_')}.txt`; a.click();
                          URL.revokeObjectURL(url);
                        }} className="px-3 py-1.5 rounded-lg bg-[var(--primary-color)]/10 text-[var(--primary-color)] hover:bg-[var(--primary-color)] hover:text-[var(--card-bg)] text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5">
                           <Download size={12}/> Exportar
                        </button>
                      )}
                      {p.status === 'generating' && (
                        <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 text-[10px] font-black flex items-center gap-1.5 whitespace-nowrap">
                           <RefreshCw size={10} className="animate-spin" /> Adicionando FX
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <h3 className="text-xs font-black tracking-widest uppercase opacity-70 mb-5 flex items-center gap-2">
              <Sparkles size={14}/> Configuração Veo 3
            </h3>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black tracking-widest uppercase opacity-50">Duração</span>
                <span className="text-lg font-black text-[var(--primary-color)]">{duration}s</span>
              </div>
              <input type="range" min="1" max="60" step="1" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full accent-[var(--primary-color)] h-1.5 bg-[var(--sub-bg)] rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[var(--primary-color)] [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all cursor-pointer" />
              <div className="flex justify-between mt-2 px-1">
                {DURATION_MARKS.map(m => (
                  <span key={m} onClick={() => setDuration(m)} className={`text-[9px] font-black cursor-pointer transition-colors ${duration === m ? 'text-[var(--primary-color)]' : 'opacity-40 hover:opacity-100'}`}>{m}s</span>
                ))}
              </div>
              <div className="mt-2 text-[linear-gradient] text-[9px] font-medium opacity-40 text-center uppercase tracking-wider">
                1-8s: Clipes curtos • 9-30s: Reels • 31-60s: Completo
              </div>
            </div>

            <div className="mb-6">
              <span className="text-[10px] font-black tracking-widest uppercase opacity-50 block mb-3">Resolução</span>
              <div className="grid grid-cols-3 gap-2">
                {RESOLUTION_OPTIONS.map(res => (
                  <button key={res.id} onClick={() => setResolution(res.id)} className={`px-2 py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${resolution === res.id ? 'bg-[var(--primary-color)]/10 border-[var(--primary-color)]/50 text-[var(--primary-color)]' : 'bg-[var(--sub-bg)] border-transparent opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}>
                    <span className="text-xs font-black">{res.id.toUpperCase()}</span>
                    <span className="text-[9px] font-bold opacity-70 tracking-wider mix-blend-multiply dark:mix-blend-screen">{res.width}x{res.height}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <span className="text-[10px] font-black tracking-widest uppercase opacity-50 block mb-3">Frame Rate</span>
              <div className="grid grid-cols-3 gap-2">
                {FPS_OPTIONS.map(f => (
                  <button key={f.id} onClick={() => setFps(f.id)} className={`px-2 py-3 rounded-xl border font-black text-[10px] uppercase transition-all ${fps === f.id ? 'bg-[var(--primary-color)]/10 border-[var(--primary-color)]/50 text-[var(--primary-color)]' : 'bg-[var(--sub-bg)] border-transparent opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[var(--sub-bg)] rounded-xl text-center mb-6">
               <span className="text-[10px] font-black tracking-widest uppercase opacity-50 mr-2">Tamanho Est:</span>
               <span className="text-sm font-black text-[var(--primary-color)]">{estimateFileSize(duration, resolution, fps)}</span>
            </div>

            <div className="mb-6">
              <span className="text-[10px] font-black tracking-widest uppercase opacity-50 block mb-3">Formato de Saída</span>
              <div className="flex flex-col gap-2">
                {SOCIAL_FORMATS.slice(0, 4).map(fmt => (
                  <button key={fmt.id} onClick={() => setFormat(fmt.id)} className={`px-4 py-3 rounded-xl border flex items-center gap-3 transition-all ${format === fmt.id ? 'bg-[var(--primary-color)]/10 border-[var(--primary-color)]/50 text-[var(--primary-color)]' : 'bg-[var(--sub-bg)] border-transparent opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}>
                    <span className="text-lg opacity-70">{fmt.icon}</span>
                    <span className="text-xs font-black">{fmt.label}</span>
                    <span className="ml-auto text-[10px] font-bold opacity-50 tracking-widest">{fmt.ratio}</span>
                  </button>
                ))}
              </div>
            </div>

            <input ref={fileInputRef} type="file" multiple accept="video/*,image/*" className="hidden" onChange={e => { const files = Array.from(e.target.files || []); setUploadedFiles(files.map(f => f.name)); addNotification(`${files.length} arquivo(s) carregado(s)`, 'info'); }} />
            <div onClick={() => fileInputRef.current?.click()} className={`p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors mb-6 group ${uploadedFiles.length > 0 ? 'bg-[var(--primary-color)]/5 border-[var(--primary-color)]/40 text-[var(--primary-color)]' : 'bg-[var(--sub-bg)] border-black/10 dark:border-white/10 opacity-70 hover:opacity-100 hover:border-[var(--primary-color)]/30'}`}>
              {uploadedFiles.length > 0 ? (
                <>
                  <Check size={24} strokeWidth={3} className="text-[var(--primary-color)] drop-shadow-md" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{uploadedFiles.length} Arquivo(s) ✓</span>
                </>
              ) : (
                <>
                  <Upload size={24} className="opacity-50 group-hover:text-[var(--primary-color)] group-hover:opacity-100 transition-colors" />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Referências de imagem (Opcional)</span>
                </>
              )}
            </div>

            {scriptText && (
              <div className="p-4 rounded-xl bg-[var(--sub-bg)] mb-6">
                <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-3 border-b border-black/5 dark:border-white/5 pb-2">Resumo Workflow</div>
                <div className="flex flex-col gap-2 text-[11px] font-medium">
                  <div className="flex items-center gap-2 text-[var(--primary-color)]"><Check size={12}/> Script: {scriptText.length} caracteres</div>
                  <div className="flex items-center gap-2 opacity-80"><Check size={12}/> Gemini gera prompt cinemático</div>
                  <div className="flex items-center gap-2 text-blue-500"><Check size={12}/> Veo 3 renderiza {duration}s</div>
                  <div className="flex items-center gap-2 opacity-60"><Check size={12}/> {SOCIAL_FORMATS.find(f => f.id === format)?.label} ({resolution.toUpperCase()} @ {fps}fps)</div>
                </div>
              </div>
            )}

            <button
              onClick={runAIGeneration}
              disabled={isGenerating || !scriptText.trim()}
              className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${isGenerating ? 'bg-[var(--sub-bg)] text-slate-500 cursor-not-allowed border border-black/5 dark:border-white/5' : scriptText.trim() ? 'bg-[var(--primary-color)] text-[var(--card-bg)] shadow-xl shadow-[var(--primary-color)]/30 hover:brightness-110 hover:-translate-y-0.5' : 'bg-[var(--sub-bg)] text-slate-400 opacity-60 cursor-not-allowed'}`}
            >
              {isGenerating ? (
                <><RefreshCw className="animate-spin" size={18}/> Gerando IA...</>
              ) : (
                <><Sparkles size={18}/> Gerar com Veo 3</>
              )}
            </button>

            {/* Narração TTS — Kokoro */}
            {scriptText.trim() && (
              <div className="mt-4 p-4 rounded-xl bg-[var(--sub-bg)] border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mic size={14} className="text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Narração Kokoro TTS</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">GRÁTIS</span>
                  </div>
                  <select
                    value={ttsVoice}
                    onChange={e => setTtsVoice(e.target.value)}
                    className="text-[10px] bg-black/20 border border-white/10 rounded-lg px-2 py-1 outline-none"
                  >
                    <option value="af_heart">Heart (feminina)</option>
                    <option value="af_bella">Bella (feminina)</option>
                    <option value="af_sarah">Sarah (feminina)</option>
                    <option value="am_adam">Adam (masculina)</option>
                    <option value="am_michael">Michael (masculina)</option>
                    <option value="bf_emma">Emma (BR feminina)</option>
                    <option value="bm_george">George (BR masculina)</option>
                  </select>
                </div>

                <button
                  onClick={generateTTS}
                  disabled={ttsGenerating}
                  className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${ttsGenerating ? 'bg-emerald-500/10 text-emerald-400/50 cursor-not-allowed' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
                >
                  {ttsGenerating ? (
                    <><Loader2 size={14} className="animate-spin" /> Gerando narração...</>
                  ) : (
                    <><Volume2 size={14} /> Gerar Narração PT-BR</>
                  )}
                </button>

                {ttsAudioUrl && (
                  <div className="mt-3">
                    <audio ref={ttsAudioRef} controls className="w-full h-8" src={ttsAudioUrl} />
                    <a
                      href={ttsAudioUrl}
                      download="narracao-grayart.wav"
                      className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-bold text-emerald-400 opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <Download size={12} /> Baixar WAV
                    </a>
                  </div>
                )}
              </div>
            )}
          </Card>

          {isGenerating && (
            <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30 !p-5">
              <div className="flex justify-between items-center mb-4">
                 <span className="text-xs font-black uppercase tracking-widest text-blue-500/80">Veo 3 Engine processing</span>
                 <span className="text-xl font-black text-blue-500">{Math.round(generatingProgress)}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden mb-3 relative">
                <div className="absolute top-0 left-0 bottom-0 w-full opacity-20 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.8),transparent)] -translate-x-full animate-[shimmer_1.5s_infinite]" />
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 transition-all duration-700 ease-out relative overflow-hidden" style={{ width: `${generatingProgress}%` }}>
                   <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)50%,rgba(255,255,255,0.15)75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[stripes_1s_linear_infinite]" />
                </div>
              </div>
              <div className="flex items-center gap-2 font-black text-[10px] text-blue-500 uppercase tracking-widest mt-4">
                 <RefreshCw size={12} className="animate-spin"/> {generatingStepLabel || 'Inicializando cluster GPU...'}
              </div>
              <div className="text-[10px] font-medium opacity-60 mt-1 pl-5">
                 {VEO_STEPS[generatingStep]?.detail}
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
};

export default AIVideoLab;
