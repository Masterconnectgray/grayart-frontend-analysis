import React, { useState } from 'react';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
import { CONTENT_TEMPLATES } from '../constants/ContentTemplates';
import type { Platform } from '../constants/ContentTemplates';
import { useAppContext } from '../context/AppContext';
import { PlatformIcon } from '../constants/SocialIcons';

interface ReelsGeneratorProps {
  division: Division;
}

const ReelsGenerator: React.FC<ReelsGeneratorProps> = ({ division }) => {
  const { addNotification, sendCopyToVideoLab } = useAppContext();
  const [activePlatform, setActivePlatform] = useState<Platform>('instagram');
  const [generatedScript, setGeneratedScript] = useState<{
    hook: string;
    body: string;
    cta: string;
    tags: string[];
  } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [sendingToVideo, setSendingToVideo] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prevDivision, setPrevDivision] = useState(division);

  if (division !== prevDivision) {
    setPrevDivision(division);
    setGeneratedScript(null);
  }

  const template = CONTENT_TEMPLATES[division];
  const theme = DIVISIONS[division];
  const isDark = division !== 'gray-art';
  const cardBg = isDark ? '#1e1e1e' : '#fff';
  const cardText = isDark ? '#fff' : '#1a1a1a';
  const subBg = isDark ? '#2d2d2d' : '#f0f2f5';

  const platforms: { id: Platform; name: string; icon: string }[] = [
    { id: 'instagram', name: 'Instagram', icon: 'IG' },
    { id: 'tiktok', name: 'TikTok', icon: 'TT' },
    { id: 'linkedin', name: 'LinkedIn', icon: 'LI' },
    { id: 'youtube', name: 'YouTube', icon: 'YT' },
  ];

  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const generateScript = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const pd = template.platforms[activePlatform];
      setGeneratedScript({
        hook: pick(pd.hooks),
        body: pick(pd.body),
        cta: pick(pd.cta),
        tags: pd.tags,
      });
      addNotification(`Conteúdo para ${activePlatform} gerado!`, 'success');
      setIsGenerating(false);
    }, 600);
  };

  const copyToClipboard = async () => {
    if (!generatedScript) return;
    const text = `[${activePlatform.toUpperCase()}] ${theme.name}\nPúblico: ${template.audience}\n\nGANCHO: ${generatedScript.hook}\nCONTEÚDO: ${generatedScript.body}\nCTA: ${generatedScript.cta}\nTAGS: ${generatedScript.tags.map(t => '#' + t).join(' ')}`;
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

  // ✅ NOVO: Envia copy para o Vídeo IA Lab com animação de feedback
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

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {platforms.map(p => (
          <button
            key={p.id}
            onClick={() => { setActivePlatform(p.id); setGeneratedScript(null); }}
            style={{
              padding: '0.6rem 1.2rem', borderRadius: '10px',
              backgroundColor: activePlatform === p.id ? theme.colors.primary : subBg,
              color: activePlatform === p.id ? (isDark ? '#fff' : '#000') : (isDark ? '#aaa' : '#666'),
              fontWeight: 700, fontSize: '0.8rem',
              display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap',
            }}
          >
            <PlatformIcon platformId={p.id} size={16} /> {p.name}
          </button>
        ))}
      </div>

      <div className="reels-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
          <h2 style={{ marginBottom: '1rem', fontWeight: 800, fontSize: '1.1rem' }}>
            Criar para <span style={{ color: theme.colors.primary }}>{activePlatform}</span>
          </h2>
          <p style={{ opacity: 0.5, marginBottom: '1.5rem', fontSize: '0.8rem' }}>
            Conteúdo estratégico otimizado para o algoritmo.
          </p>

          <div style={{ marginBottom: '1.2rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.4, marginBottom: '0.3rem', textTransform: 'uppercase' }}>Público-Alvo</div>
            <div style={{ padding: '0.8rem', borderRadius: '8px', background: subBg, fontSize: '0.8rem' }}>
              {template.audience}
            </div>
          </div>

          <button
            onClick={generateScript}
            disabled={isGenerating}
            style={{
              width: '100%', padding: '1rem', borderRadius: '12px',
              backgroundColor: theme.colors.primary,
              color: isDark ? '#fff' : '#000',
              fontWeight: 800, fontSize: '0.9rem',
              opacity: isGenerating ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            {isGenerating ? (
              <>
                <span style={{
                  display: 'inline-block', width: '16px', height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid currentColor',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                }} />
                GERANDO...
              </>
            ) : 'GERAR CONTEUDO'}
          </button>

          {/* ✅ NOVO: Botão Transformar em Vídeo — aparece quando há copy gerada */}
          {generatedScript && (
            <button
              onClick={handleSendToVideoLab}
              disabled={sendingToVideo}
              style={{
                width: '100%', padding: '1rem', borderRadius: '12px',
                marginTop: '0.8rem',
                background: sendingToVideo
                  ? `${theme.colors.primary}88`
                  : `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary || '#7c3aed'})`,
                color: '#fff',
                fontWeight: 800, fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: `0 8px 25px ${theme.colors.primary}44`,
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transform: sendingToVideo ? 'scale(0.97)' : 'scale(1)',
              }}
            >
              {sendingToVideo ? (
                <>
                  <span style={{
                    display: 'inline-block', width: '16px', height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff',
                    borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                  }} />
                  ENVIANDO PARA O VÍDEO IA...
                </>
              ) : (
                <>🎬 TRANSFORMAR EM VÍDEO IA</>
              )}
            </button>
          )}

          {generatedScript && (
            <div style={{
              marginTop: '0.8rem', padding: '0.6rem 0.8rem',
              borderRadius: '8px', background: isDark ? '#ffffff08' : '#f8f8f8',
              fontSize: '0.7rem', opacity: 0.5, textAlign: 'center',
              border: `1px dashed ${isDark ? '#333' : '#ddd'}`
            }}>
              💡 Clique em "Transformar" para enviar a copy direto para o Vídeo IA
            </div>
          )}
        </div>

        <div className="premium-card" style={{
          backgroundColor: cardBg, color: cardText,
          border: generatedScript ? 'none' : `2px dashed ${isDark ? '#333' : '#ddd'}`,
          minHeight: '300px',
          display: 'flex', flexDirection: 'column',
          justifyContent: generatedScript ? 'flex-start' : 'center',
        }}>
          {!generatedScript ? (
            <div style={{ textAlign: 'center', opacity: 0.3 }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Clique em "Gerar"</div>
              <p style={{ fontSize: '0.8rem' }}>O conteudo aparece aqui</p>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>SCRIPT</h3>
                <button
                  onClick={copyToClipboard}
                  style={{
                    padding: '0.4rem 0.8rem', borderRadius: '6px',
                    border: `1px solid ${theme.colors.primary}`,
                    color: copyFeedback ? '#22c55e' : theme.colors.primary,
                    fontWeight: 700, fontSize: '0.7rem',
                    background: copyFeedback ? '#22c55e18' : 'transparent',
                  }}
                >
                  {copyFeedback ? 'COPIADO!' : 'COPIAR'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ borderLeft: `3px solid ${theme.colors.primary}`, paddingLeft: '0.8rem' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, opacity: 0.4 }}>GANCHO</span>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{generatedScript.hook}</p>
                </div>
                <div style={{ borderLeft: '3px solid #888', paddingLeft: '0.8rem' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, opacity: 0.4 }}>CORPO</span>
                  <p style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{generatedScript.body}</p>
                </div>
                <div style={{ borderLeft: '3px solid #22c55e', paddingLeft: '0.8rem' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, opacity: 0.4 }}>CTA</span>
                  <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>{generatedScript.cta}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {generatedScript.tags.map(tag => (
                    <span key={tag} style={{ color: theme.colors.primary, fontSize: '0.75rem', fontWeight: 600 }}>#{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ReelsGenerator;
