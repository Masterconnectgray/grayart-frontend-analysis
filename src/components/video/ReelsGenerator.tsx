import React, { useState, useCallback } from 'react';
import type { Division } from '../../constants/Themes';
import { DIVISIONS } from '../../constants/Themes';
import { CONTENT_TEMPLATES } from '../../constants/ContentTemplates';
import type { Platform } from '../../constants/ContentTemplates';
import { useAppContext } from '../../context/AppContext';
import { PlatformIcon } from '../../constants/SocialIcons';
import { generateCopyWithGemini } from '../../services/GeminiService';
import { bffFetch } from '../../services/BFFClient';
import { Button, Card, StatusBadge, EmptyState } from '../../design-system';
import { Copy, Wand2, Video, Check, MessageSquareDot, RefreshCw, X, ArrowRight, Clock, History } from 'lucide-react';

interface ReelsGeneratorProps {
  division: Division;
}

interface ScriptData {
  hook: string;
  body: string;
  cta: string;
  tags: string[];
}

type PlatformCache = Record<Platform, {
  script: ScriptData | null;
  topic: string;
}>;

const emptyCache: PlatformCache = {
  instagram: { script: null, topic: '' },
  tiktok: { script: null, topic: '' },
  linkedin: { script: null, topic: '' },
  youtube: { script: null, topic: '' },
};

const ReelsGenerator: React.FC<ReelsGeneratorProps> = ({ division }) => {
  const { addNotification, sendCopyToVideoLab } = useAppContext();
  const [activePlatform, setActivePlatform] = useState<Platform>('instagram');

  // Cache por plataforma — nao perde ao trocar
  const [platformCache, setPlatformCache] = useState<PlatformCache>({ ...emptyCache });

  const [generatedScript, _setGeneratedScript] = useState<ScriptData | null>(null);

  // Wrapper que tambem salva no cache da plataforma ativa
  const setGeneratedScript = useCallback((script: ScriptData | null) => {
    _setGeneratedScript(script);
    if (script) {
      setPlatformCache(prev => ({
        ...prev,
        [activePlatform]: { ...prev[activePlatform], script },
      }));
    }
  }, [activePlatform]);
  const [previousScript, setPreviousScript] = useState<ScriptData | null>(null);
  const [refinedScript, setRefinedScript] = useState<ScriptData | null>(null);

  const [copyFeedback, setCopyFeedback] = useState(false);
  const [sendingToVideo, setSendingToVideo] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  const [useAI, setUseAI] = useState(true);

  // Refinement states
  const [isRefining, setIsRefining] = useState(false);
  const [refinementFeedback, setRefinementFeedback] = useState('');
  const [isRefinementLoading, setIsRefinementLoading] = useState(false);

  // Historico de copies
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<Array<{
    id: number;
    created_at: string;
    result: { hook?: string; body?: string; cta?: string; tags?: string[]; fullText?: string } | null;
    prompt: string;
  }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const resp = await bffFetch('/ai/jobs');
      if (resp.ok) {
        const data = await resp.json() as { jobs: Array<{ id: number; type: string; created_at: string; result: any; prompt: string; status: string }> };
        const copies = data.jobs
          .filter(j => j.type === 'copy' && j.status === 'completed' && j.result?.hook)
          .map(j => ({ id: j.id, created_at: j.created_at, result: j.result, prompt: j.prompt }));
        setHistoryItems(copies);
      }
    } catch { /* silencioso */ }
    finally { setHistoryLoading(false); }
  }, []);

  const loadCopyFromHistory = useCallback((item: typeof historyItems[0]) => {
    if (!item.result) return;
    setGeneratedScript({
      hook: item.result.hook || '',
      body: item.result.body || '',
      cta: item.result.cta || '',
      tags: item.result.tags || [],
    });
    setPreviousScript(null);
    setRefinedScript(null);
    setIsRefining(false);
    setShowHistory(false);
    addNotification('Copy do historico carregada!', 'success');
  }, [addNotification]);

  const [prevDivision, setPrevDivision] = useState(division);

  if (division !== prevDivision) {
    setPrevDivision(division);
    _setGeneratedScript(null);
    setPreviousScript(null);
    setRefinedScript(null);
    setIsRefining(false);
    setPlatformCache({ ...emptyCache });
  }

  const template = CONTENT_TEMPLATES[division];
  const theme = DIVISIONS[division];

  const platforms: { id: Platform; name: string; icon: string }[] = [
    { id: 'instagram', name: 'Instagram', icon: 'IG' },
    { id: 'tiktok', name: 'TikTok', icon: 'TT' },
    { id: 'linkedin', name: 'LinkedIn', icon: 'LI' },
    { id: 'youtube', name: 'YouTube', icon: 'YT' },
  ];

  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const generateScript = async () => {
    setIsGenerating(true);
    setPreviousScript(null);
    setRefinedScript(null);
    setIsRefining(false);

    if (useAI) {
      try {
        const result = await generateCopyWithGemini(division, activePlatform, customTopic || undefined);
        setGeneratedScript({
          hook: result.hook,
          body: result.body,
          cta: result.cta,
          tags: result.tags,
        });
        addNotification(`Conteúdo IA para ${activePlatform} gerado com Gemini!`, 'success');
      } catch (err) {
        addNotification(`Erro na IA, usando template local: ${err}`, 'info');
        const pd = template.platforms[activePlatform];
        setGeneratedScript({
          hook: pick(pd.hooks),
          body: pick(pd.body),
          cta: pick(pd.cta),
          tags: pd.tags,
        });
      }
    } else {
      const pd = template.platforms[activePlatform];
      setGeneratedScript({
        hook: pick(pd.hooks),
        body: pick(pd.body),
        cta: pick(pd.cta),
        tags: pd.tags,
      });
      addNotification(`Conteúdo para ${activePlatform} gerado!`, 'success');
    }

    setIsGenerating(false);
  };

  const handleRefine = async () => {
    if (!generatedScript || !refinementFeedback.trim()) return;
    setIsRefinementLoading(true);

    try {
      const contextPrompt = `Versão original a ser melhorada:\nGANCHO: ${generatedScript.hook}\nCORPO: ${generatedScript.body}\nCTA: ${generatedScript.cta}\n\nFEEDBACK/DIRETRIZ PARA MELHORIA: ${refinementFeedback}\n\nReescreva o conteúdo aplicando exatamente as melhorias solicitadas acima.`;
      
      const result = await generateCopyWithGemini(division, activePlatform, contextPrompt);
      setPreviousScript(generatedScript);
      setRefinedScript({
        hook: result.hook,
        body: result.body,
        cta: result.cta,
        tags: result.tags,
      });
      addNotification('Variação melhorada gerada com sucesso. Analise e decida.', 'info');
    } catch (err) {
      addNotification(`Erro ao refinar com Gemini: ${err}`, 'error');
    } finally {
      setIsRefinementLoading(false);
    }
  };

  const acceptRefinement = () => {
    if (refinedScript) {
      setGeneratedScript(refinedScript);
      setPreviousScript(null);
      setRefinedScript(null);
      setIsRefining(false);
      setRefinementFeedback('');
      addNotification('Alterações aceitas!', 'success');
    }
  };

  const discardRefinement = () => {
    setPreviousScript(null);
    setRefinedScript(null);
    addNotification('Alterações descartadas.', 'info');
  };

  const getCopyText = (script: ScriptData | null) => {
    if (!script) return '';
    return `[${activePlatform.toUpperCase()}] ${theme.name}\nPúblico: ${template.audience}\n\nGANCHO: ${script.hook}\nCONTEÚDO: ${script.body}\nCTA: ${script.cta}\nTAGS: ${script.tags.map(t => '#' + t).join(' ')}`;
  };

  const copyToClipboard = async () => {
    if (!generatedScript) return;
    const text = getCopyText(generatedScript);
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(true);
      addNotification('Copiado para a área de transferência!', 'success');
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopyFeedback(true);
      addNotification('Copiado para a área de transferência!', 'success');
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const handleSendToVideoLab = () => {
    if (!generatedScript) return;
    setSendingToVideo(true);

    const fullText = `GANCHO: ${generatedScript.hook}\n\nCONTEÚDO: ${generatedScript.body}\n\nCTA: ${generatedScript.cta}`;

    setTimeout(() => {
      sendCopyToVideoLab({
        hook: generatedScript.hook,
        body: generatedScript.body,
        cta: generatedScript.cta,
        tags: generatedScript.tags,
        platform: activePlatform,
        fullText,
      });
      addNotification('🎬 Copy enviada para o Vídeo IA! Redirecionando...', 'success');
      setSendingToVideo(false);
    }, 800);
  };
  
  const ScriptContentDisplay = ({ script, title, isRefined = false }: { script: ScriptData, title?: string, isRefined?: boolean }) => (
    <div className={`flex flex-col gap-5 ${isRefined ? 'p-4 rounded-xl bg-[var(--primary-color)]/5 border border-[var(--primary-color)]/20' : ''}`}>
      {title && <h4 className={`text-xs font-black tracking-widest uppercase mb-1 ${isRefined ? 'text-[var(--primary-color)]' : 'opacity-50'}`}>{title}</h4>}
      <div className="border-l-4 border-[var(--primary-color)] pl-4 py-1">
        <span className="text-[10px] font-bold opacity-50 block mb-1.5 uppercase tracking-wider">GANCHO</span>
        <p className="font-bold text-sm sm:text-base leading-snug">{script.hook}</p>
      </div>
      <div className="border-l-4 border-slate-500 pl-4 py-1">
        <span className="text-[10px] font-bold opacity-50 block mb-1.5 uppercase tracking-wider">CORPO</span>
        <p className="text-xs sm:text-sm leading-relaxed opacity-90">{script.body}</p>
      </div>
      <div className="border-l-4 border-emerald-500 pl-4 py-1">
        <span className="text-[10px] font-bold opacity-50 block mb-1.5 uppercase tracking-wider">CTA</span>
        <p className="font-bold text-xs sm:text-sm leading-snug">{script.cta}</p>
      </div>
      <div className="flex gap-2 flex-wrap mt-2">
        {script.tags.map(tag => (
          <span key={tag} className="text-[var(--primary-color)] text-[10px] sm:text-xs font-bold px-2 py-1 rounded-md bg-[var(--primary-color)]/10">
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide items-center">
        {platforms.map(p => {
          const isActive = activePlatform === p.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                // Salvar script atual no cache antes de trocar
                setPlatformCache(prev => ({
                  ...prev,
                  [activePlatform]: { script: generatedScript, topic: customTopic },
                }));
                setActivePlatform(p.id);
                // Restaurar do cache da nova plataforma
                const cached = platformCache[p.id];
                setGeneratedScript(cached?.script || null);
                setCustomTopic(cached?.topic || '');
                setPreviousScript(null);
                setRefinedScript(null);
                setIsRefining(false);
                setShowHistory(false);
              }}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 whitespace-nowrap
                ${isActive && !showHistory
                  ? 'bg-[var(--primary-color)] text-[var(--card-bg)] shadow-lg'
                  : 'bg-[var(--sub-bg)] text-slate-400 hover:text-[var(--card-text)]'}`}
            >
              <PlatformIcon platformId={p.id} size={16} /> {p.name}
            </button>
          );
        })}
        <div className="ml-auto">
          <button
            onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadHistory(); }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap
              ${showHistory ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--sub-bg)] text-slate-400 hover:text-[var(--card-text)]'}`}
          >
            <History size={14} /> Historico
          </button>
        </div>
      </div>

      {/* Historico de copies */}
      {showHistory && (
        <Card className="mb-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Clock size={14} className="text-amber-400" />
              Historico de Copies Geradas
            </h3>
            <button onClick={() => setShowHistory(false)} className="opacity-40 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
          {historyLoading ? (
            <div className="text-center py-6 text-xs opacity-40">Carregando historico...</div>
          ) : historyItems.length === 0 ? (
            <div className="text-center py-6 text-xs opacity-40">Nenhuma copy gerada ainda. Gere a primeira!</div>
          ) : (
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
              {historyItems.filter(item => {
                const p = item.prompt.toLowerCase();
                if (activePlatform === 'tiktok') return p.includes('tiktok');
                if (activePlatform === 'linkedin') return p.includes('linkedin');
                if (activePlatform === 'youtube') return p.includes('youtube');
                return p.includes('instagram') || (!p.includes('tiktok') && !p.includes('linkedin') && !p.includes('youtube'));
              }).map(item => {
                const date = new Date(item.created_at);
                const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const platform = item.prompt.toLowerCase().includes('tiktok') ? 'tiktok'
                  : item.prompt.toLowerCase().includes('linkedin') ? 'linkedin'
                  : item.prompt.toLowerCase().includes('youtube') ? 'youtube'
                  : 'instagram';
                return (
                  <button
                    key={item.id}
                    onClick={() => loadCopyFromHistory(item)}
                    onDoubleClick={() => loadCopyFromHistory(item)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[var(--sub-bg)] hover:bg-[var(--primary-color)]/10 transition-all text-left group cursor-pointer"
                  >
                    <PlatformIcon platformId={platform} size={20} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{item.result?.hook || 'Copy sem titulo'}</p>
                      <p className="text-[10px] opacity-40 truncate">{item.result?.body?.substring(0, 60)}...</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-bold opacity-60">{dateStr}</div>
                      <div className="text-[10px] opacity-30">{timeStr}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
        
        {/* Left Column - Input Panel */}
        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="text-lg font-extrabold mb-4">
              Criar para <span className="text-[var(--primary-color)]">{activePlatform}</span>
            </h2>
            <p className="text-sm opacity-50 mb-6 font-medium">
              Conteúdo estratégico otimizado para o algoritmo.
            </p>

            <div className="mb-5">
              <div className="text-[11px] font-black opacity-90 mb-2 uppercase tracking-widest text-[var(--primary-color)] shadow-sm">Público-Alvo</div>
              <div className="p-4 rounded-xl bg-black/5 dark:bg-black/40 border-2 border-[var(--primary-color)]/20 shadow-inner text-sm font-bold opacity-90">
                {template.audience}
              </div>
            </div>

            <div className="mb-6">
              <div className="text-[11px] font-black opacity-90 mb-2 uppercase tracking-widest text-[var(--primary-color)] shadow-sm">Tema / Assunto (opcional)</div>
              <input
                type="text"
                value={customTopic}
                onChange={e => setCustomTopic(e.target.value)}
                placeholder="Ex: Coffee Meet de março..."
                className="w-full p-4 rounded-xl bg-black/5 dark:bg-black/40 border-2 border-[var(--primary-color)]/20 text-[var(--card-text)] text-sm font-bold shadow-inner focus:outline-none focus:border-[var(--primary-color)] focus:ring-4 focus:ring-[var(--primary-color)]/20 transition-all placeholder:opacity-40"
              />
            </div>

            <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-[var(--sub-bg)] border border-white/5 dark:border-black/5">
              <span className="text-xs font-bold uppercase tracking-wider">Gemini IA</span>
              <button
                onClick={() => setUseAI(!useAI)}
                className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${useAI ? 'bg-[var(--primary-color)]' : 'bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-300 ${useAI ? 'left-[22px]' : 'left-[2px]'}`} />
              </button>
            </div>

            <Button
              size="lg"
              fullWidth
              onClick={generateScript}
              loading={isGenerating}
              icon={Wand2}
            >
              GERAR CONTEÚDO
            </Button>
          </Card>
          
          {generatedScript && !refinedScript && (
             <Card className="!bg-[var(--primary-color)]/5 border border-[var(--primary-color)]/20 animate-in slide-in-from-left-4">
               <h3 className="text-xs font-black uppercase tracking-widest text-[var(--primary-color)] mb-3 flex items-center gap-2">
                 <MessageSquareDot size={14} /> Refinar Copy com IA
               </h3>
               <p className="text-xs opacity-70 mb-3 font-medium">
                 O conteúdo não ficou ideal? Peça ao Gemini para ajustar o tom, focar em um benefício ou reescrever.
               </p>
               {isRefining ? (
                 <div className="animate-in fade-in zoom-in-95 duration-200">
                   <textarea
                     value={refinementFeedback}
                     onChange={e => setRefinementFeedback(e.target.value)}
                     placeholder="Ex: Deixe o gancho mais intimidador, reduza para 3 linhas, foque em preço..."
                     rows={3}
                     className="w-full p-4 rounded-xl bg-black/5 dark:bg-black/40 text-sm font-bold border-2 border-[var(--primary-color)]/40 focus:outline-none focus:border-[var(--primary-color)] focus:ring-4 focus:ring-[var(--primary-color)]/20 shadow-inner transition-all resize-y mb-4 placeholder:opacity-40"
                     autoFocus
                   />
                   <div className="flex gap-2">
                     <Button size="sm" fullWidth onClick={handleRefine} loading={isRefinementLoading} icon={Wand2} className="!bg-[var(--primary-color)] !text-[var(--card-bg)]">
                       TENTAR NOVAMENTE
                     </Button>
                     <Button size="sm" variant="ghost" onClick={() => { setIsRefining(false); setRefinementFeedback(''); }} disabled={isRefinementLoading}>
                       <X size={16} />
                     </Button>
                   </div>
                 </div>
               ) : (
                 <Button size="sm" variant="secondary" fullWidth onClick={() => setIsRefining(true)} icon={RefreshCw}>
                   PEDIR ALTERAÇÃO...
                 </Button>
               )}
             </Card>
          )}

          {generatedScript && !refinedScript && (
            <div className="animate-in slide-in-from-bottom-4">
              <Button
                size="lg"
                fullWidth
                onClick={handleSendToVideoLab}
                loading={sendingToVideo}
                icon={Video}
                className="!bg-gradient-to-r !from-[var(--primary-color)] !to-purple-600 !text-white !border-none shadow-xl shadow-[var(--primary-color)]/20 hover:scale-[1.02] active:scale-95"
              >
                TRANSFORMAR EM VÍDEO IA
              </Button>
              <div className="mt-3 text-[10px] opacity-50 text-center font-bold tracking-widest uppercase">
                Enviar direto para renderização Veo 3
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Results Area */}
        <Card className={`flex flex-col ${!generatedScript ? 'justify-center min-h-[400px]' : ''} ${!generatedScript ? 'border-2 border-dashed border-white/10 dark:border-black/10 !bg-transparent shadow-none' : ''}`}>
          {!generatedScript ? (
            <div className="flex-1 flex flex-col justify-center min-h-[400px]">
              <EmptyState
                icon={Wand2}
                title="Área de Criação"
                description='Preencha os dados e clique em "Gerar Conteúdo"'
                className="border-none !bg-transparent"
              />
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-300 h-full flex flex-col">
              
              {!refinedScript ? (
                <>
                  <div className="flex justify-between items-center mb-6 border-b border-[var(--sub-bg)] pb-4">
                    <h3 className="text-sm font-black tracking-widest uppercase flex items-center gap-2">
                      <Wand2 size={16} className="text-[var(--primary-color)]" /> Resultado Final
                    </h3>
                    <Button
                      size="sm"
                      variant={copyFeedback ? 'primary' : 'secondary'}
                      onClick={copyToClipboard}
                      icon={copyFeedback ? Check : Copy}
                      className={copyFeedback ? '!bg-emerald-500/20 !text-emerald-500 !border-emerald-500/50' : ''}
                    >
                      {copyFeedback ? 'COPIADO!' : 'COPIAR SCRIPT'}
                    </Button>
                  </div>
                  
                  <div className="flex-1">
                    <ScriptContentDisplay script={generatedScript} />
                  </div>
                </>
              ) : (
                <div className="flex flex-col h-full animate-in slide-in-from-right-4">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                       <StatusBadge status="warning" label="Modo Comparação" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={discardRefinement} icon={X} className="!text-red-500 hover:!bg-red-500/10">
                        DESCARTAR
                      </Button>
                      <Button size="sm" onClick={acceptRefinement} icon={Check} className="!bg-emerald-500 !text-white hover:!bg-emerald-600 shadow-lg shadow-emerald-500/20 text-xs px-4">
                        ACEITAR MUDANÇAS
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-[11px] font-bold text-amber-500 mb-6 flex items-center gap-2">
                    <MessageSquareDot size={14} /> Feedback Aplicado: "{refinementFeedback}"
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                    {/* Linha Original */}
                    <div className="opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                       <ScriptContentDisplay script={previousScript as ScriptData} title="Versão Original" />
                    </div>
                    
                    {/* Divider visual em Telas Grandes */}
                    <div className="hidden md:flex flex-col items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 w-8 h-8 bg-[var(--card-bg)] rounded-full border border-[var(--primary-color)]/30 text-[var(--primary-color)]">
                      <ArrowRight size={16} />
                    </div>
                    
                    {/* Linha Modificada */}
                    <div className="relative">
                       <ScriptContentDisplay script={refinedScript} title="Nova Versão (Gemini AI)" isRefined />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ReelsGenerator;
