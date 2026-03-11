import React, { useState, useEffect, useMemo } from 'react';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
import { CONTENT_TEMPLATES } from '../constants/ContentTemplates';
import { useAppContext } from '../context/AppContext';
import { PlatformIcon } from '../constants/SocialIcons';
import { registerPublish, schedulePost, listScheduledPosts, isFlowConfigured } from '../services/FlowAPIService';

interface MultiChannelPublisherProps {
  division: Division;
}

interface PlatformConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  formats: string[];
  maxDuration: string;
  features: string[];
}

interface ScheduledPost {
  id: number;
  platforms: string[];
  date: string;
  time: string;
  content: string;
  status: 'agendado' | 'publicado' | 'falhou';
  division: Division;
  backendId?: string;
}

const PLATFORMS: PlatformConfig[] = [
  { id: 'instagram', name: 'Instagram', icon: 'IG', color: '#E4405F', formats: ['Reels', 'Feed', 'Stories', 'Carrossel'], maxDuration: '90s', features: ['Auto-hashtag', 'Primeiro comentario', 'Alt text'] },
  { id: 'tiktok', name: 'TikTok', icon: 'TT', color: '#000000', formats: ['Video', 'Foto Slideshow'], maxDuration: '3min', features: ['Duet', 'Stitch', 'Trending sounds'] },
  { id: 'linkedin', name: 'LinkedIn', icon: 'LI', color: '#0A66C2', formats: ['Post', 'Artigo', 'Documento', 'Video'], maxDuration: '10min', features: ['Mencoes', 'Newsletter', 'Hashtags B2B'] },
  { id: 'youtube', name: 'YouTube', icon: 'YT', color: '#FF0000', formats: ['Shorts', 'Video Longo'], maxDuration: '60s / ilimitado', features: ['Thumbnail', 'End screen', 'Cards'] },
  { id: 'facebook', name: 'Facebook', icon: 'FB', color: '#1877F2', formats: ['Reels', 'Post', 'Stories', 'Video'], maxDuration: '90s', features: ['Boost', 'Grupo', 'Evento'] },
  { id: 'whatsapp', name: 'WhatsApp', icon: 'WA', color: '#25D366', formats: ['Status', 'Mensagem Broadcast', 'Grupo'], maxDuration: '30s', features: ['Lista transmissao', 'Auto-resposta', 'Catalogo'] },
];

const DIVISION_SCHEDULES: Record<Division, { day: string; time: string; platforms: string[]; type: string; bestTime?: string; reason?: string }[]> = {
  'connect-gray': [
    { day: 'Seg', time: '12:00', platforms: ['instagram', 'facebook'], type: 'Reels - Dor', bestTime: '11:30-13:00', reason: 'Pico de almoco - sindicos checam redes' },
    { day: 'Ter', time: '18:30', platforms: ['linkedin'], type: 'Artigo B2B', bestTime: '17:00-19:00', reason: 'Pos-expediente - decisores ativos no LinkedIn' },
    { day: 'Qua', time: '12:00', platforms: ['instagram', 'tiktok'], type: 'Reels - Educacional', bestTime: '11:30-13:00', reason: 'Horario de almoco - engajamento maximo' },
    { day: 'Qui', time: '21:00', platforms: ['instagram', 'facebook', 'whatsapp'], type: 'Stories + Status', bestTime: '20:00-22:00', reason: 'Noite - horario de relaxamento e scroll' },
    { day: 'Sex', time: '12:00', platforms: ['instagram', 'tiktok', 'youtube'], type: 'Reels - Autoridade', bestTime: '11:30-13:00', reason: 'Sexta almoco - compartilhamento alto' },
    { day: 'Sab', time: '10:00', platforms: ['whatsapp'], type: 'Broadcast - Coffee Meet', bestTime: '09:00-11:00', reason: 'Sabado manha - leitura tranquila' },
  ],
  'gray-up': [
    { day: 'Seg', time: '07:30', platforms: ['instagram', 'facebook'], type: 'Reels - Obra', bestTime: '07:00-08:30', reason: 'Inicio de semana - equipes de obra ativas' },
    { day: 'Ter', time: '12:00', platforms: ['linkedin'], type: 'Case tecnico', bestTime: '11:30-13:00', reason: 'Almoco - gestores de facilities online' },
    { day: 'Qua', time: '19:00', platforms: ['instagram', 'tiktok'], type: 'Reels - Educacional', bestTime: '18:00-20:00', reason: 'Pos-trabalho - curiosos de engenharia' },
    { day: 'Qui', time: '12:00', platforms: ['youtube'], type: 'Video - Tour obra', bestTime: '11:30-13:30', reason: 'Almoco estendido - videos longos' },
    { day: 'Sex', time: '07:30', platforms: ['instagram', 'facebook', 'linkedin'], type: 'Post - Resultado', bestTime: '07:00-09:00', reason: 'Sexta cedo - gestores planejam semana' },
    { day: 'Sab', time: '09:00', platforms: ['whatsapp'], type: 'Broadcast - Orcamento', bestTime: '08:30-10:00', reason: 'Sabado manha - leitura de mensagens' },
  ],
  'gray-up-flow': [
    { day: 'Seg', time: '08:00', platforms: ['instagram', 'linkedin'], type: 'Reels - Dor', bestTime: '07:30-09:00', reason: 'Segunda cedo - empresarios planejam semana' },
    { day: 'Qua', time: '12:30', platforms: ['instagram', 'tiktok'], type: 'Reels - Case', bestTime: '12:00-13:00', reason: 'Almoco - donos de empresa checam redes' },
    { day: 'Qui', time: '08:00', platforms: ['linkedin'], type: 'Artigo Lean', bestTime: '07:30-09:00', reason: 'Manha - C-level lendo artigos' },
    { day: 'Sex', time: '20:00', platforms: ['instagram', 'youtube'], type: 'Reels - Educacional', bestTime: '19:00-21:00', reason: 'Sexta noite - conteudo reflexivo' },
    { day: 'Sab', time: '10:00', platforms: ['whatsapp'], type: 'Broadcast - Consultoria', bestTime: '09:00-11:00', reason: 'Sabado manha - empresario relaxado' },
  ],
  'gray-art': [
    { day: 'Seg', time: '10:00', platforms: ['instagram', 'tiktok'], type: 'Reels - Processo', bestTime: '09:30-11:00', reason: 'Segunda manha - designers e MKT online' },
    { day: 'Ter', time: '14:00', platforms: ['instagram', 'facebook'], type: 'Post - Portfolio', bestTime: '13:30-15:00', reason: 'Pos-almoco - alta navegacao visual' },
    { day: 'Qua', time: '10:00', platforms: ['tiktok', 'youtube'], type: 'Reels - Trend', bestTime: '09:30-11:00', reason: 'Quarta manha - peak de trends' },
    { day: 'Qui', time: '21:30', platforms: ['instagram'], type: 'Carrossel - Educacional', bestTime: '20:00-22:00', reason: 'Noite - saves e compartilhamentos altos' },
    { day: 'Sex', time: '14:00', platforms: ['linkedin'], type: 'Case - Branding', bestTime: '13:30-15:30', reason: 'Sexta tarde - cases de sucesso performam' },
    { day: 'Sab', time: '10:00', platforms: ['instagram', 'tiktok'], type: 'Reels - Antes/Depois', bestTime: '09:00-11:00', reason: 'Sabado manha - conteudo leve e visual' },
    { day: 'Dom', time: '20:00', platforms: ['whatsapp'], type: 'Broadcast - Semana', bestTime: '19:00-21:00', reason: 'Domingo noite - preparacao da semana' },
  ],
};

let nextPostId = 0;

// -- Content Score Engine --
interface ScoreItem {
  label: string;
  score: number;
  tip: string;
  icon: string;
}

function computeContentScore(text: string, platform: string): { items: ScoreItem[]; total: number } {
  const items: ScoreItem[] = [];

  // Comprimento
  const charTargets: Record<string, number> = { instagram: 300, tiktok: 150, linkedin: 600, youtube: 200 };
  const target = charTargets[platform] || 300;
  const lengthRatio = Math.min(1, text.length / target);
  const lengthScore = Math.round(lengthRatio * 100);
  items.push({
    label: 'Comprimento',
    score: lengthScore,
    tip: lengthScore < 50 ? `Ideal: ~${target} chars para ${platform}` : lengthScore > 95 ? 'Tamanho perfeito!' : `Faltam ~${target - text.length} chars`,
    icon: lengthScore >= 70 ? 'OK' : 'BAIXO',
  });

  // Emojis
  const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  const emojiIdeal = platform === 'linkedin' ? 3 : 5;
  const emojiScore = emojiCount === 0 ? 15 : emojiCount >= emojiIdeal ? 100 : Math.round((emojiCount / emojiIdeal) * 100);
  items.push({
    label: 'Emojis',
    score: emojiScore,
    tip: emojiCount === 0 ? 'Adicione emojis para +48% engajamento' : emojiCount >= emojiIdeal ? `${emojiCount} emojis - otimo!` : `${emojiCount}/${emojiIdeal} emojis ideais`,
    icon: emojiScore >= 70 ? 'OK' : 'BAIXO',
  });

  // Hashtags
  const hashtagCount = (text.match(/#\w+/g) || []).length;
  const hashTargets: Record<string, [number, number]> = { instagram: [8, 15], tiktok: [3, 5], linkedin: [3, 5], youtube: [5, 10] };
  const [minH, maxH] = hashTargets[platform] || [5, 10];
  const hashScore = hashtagCount === 0 ? 10 : hashtagCount >= minH && hashtagCount <= maxH ? 100 : hashtagCount < minH ? Math.round((hashtagCount / minH) * 70) : 80;
  items.push({
    label: 'Hashtags',
    score: hashScore,
    tip: hashtagCount === 0 ? `Adicione ${minH}-${maxH} hashtags` : hashtagCount < minH ? `${hashtagCount} hashtags - ideal: ${minH}-${maxH}` : hashtagCount > maxH ? `${hashtagCount} hashtags - muitas, ideal: ${maxH}` : `${hashtagCount} hashtags - perfeito!`,
    icon: hashScore >= 70 ? 'OK' : 'BAIXO',
  });

  // CTA
  const ctaPatterns = /clique|link|comente|salve|compartilhe|fale|siga|inscreva|mande|chame|acesse|participe|agende|entre|marque|baixe|whatsapp|bio/i;
  const hasCTA = ctaPatterns.test(text);
  const ctaScore = hasCTA ? 100 : 20;
  items.push({
    label: 'Call to Action',
    score: ctaScore,
    tip: hasCTA ? 'CTA identificado!' : 'Adicione um CTA: "link na bio", "comente", "salve"',
    icon: ctaScore >= 70 ? 'OK' : 'BAIXO',
  });

  // Gancho (primeira linha impactante)
  const firstLine = text.split('\n')[0] || '';
  const hookPatterns = /\?|!|\.\.\.|\d+%|\d+x|erro|segredo|ninguem|maioria|voce|como|por que/i;
  const hasHook = hookPatterns.test(firstLine) && firstLine.length > 15;
  const hookScore = hasHook ? 100 : firstLine.length > 30 ? 60 : 25;
  items.push({
    label: 'Gancho',
    score: hookScore,
    tip: hasHook ? 'Primeira linha chamativa!' : 'Comece com pergunta, numero ou frase de impacto',
    icon: hookScore >= 70 ? 'OK' : 'BAIXO',
  });

  // Quebras de linha (legibilidade)
  const lineBreaks = (text.match(/\n/g) || []).length;
  const breakScore = lineBreaks >= 3 ? 100 : lineBreaks >= 1 ? 60 : 20;
  items.push({
    label: 'Legibilidade',
    score: breakScore,
    tip: lineBreaks < 2 ? 'Adicione quebras de linha para facilitar leitura' : 'Boa formatacao!',
    icon: breakScore >= 70 ? 'OK' : 'BAIXO',
  });

  const total = Math.round(items.reduce((sum, i) => sum + i.score, 0) / items.length);
  return { items, total };
}

const MultiChannelPublisher: React.FC<MultiChannelPublisherProps> = ({ division }) => {
  const { addNotification, incrementPosts, stats } = useAppContext();
  const isDark = division !== 'gray-art';
  const theme = DIVISIONS[division];
  const content = CONTENT_TEMPLATES[division];
  const schedule = DIVISION_SCHEDULES[division] || [];

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram']);
  const [postContent, setPostContent] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('12:00');
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [activeTab, setActiveTab] = useState<'publish' | 'schedule' | 'queue' | 'preview'>('publish');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [selectedContentPlatform, setSelectedContentPlatform] = useState<string>('instagram');
  const [previewPlatform, setPreviewPlatform] = useState<'instagram' | 'tiktok' | 'linkedin' | 'youtube'>('instagram');

  useEffect(() => {
    setPostContent('');
    setActiveTab('publish');
    setSelectedPlatforms(['instagram']);

    if (isFlowConfigured()) {
      listScheduledPosts(division).then(posts => {
        setScheduledPosts(posts.map((p, i) => ({
          id: i + 1,
          platforms: p.platform.split(','),
          date: p.scheduledAt.split('T')[0],
          time: p.scheduledAt.split('T')[1]?.substring(0, 5) || '12:00',
          content: p.content,
          status: 'agendado' as const,
          division: p.division as Division,
          backendId: p.id,
        })));
      }).catch(() => { /* silencioso se offline */ });
    }
  }, [division]);

  const cardBg = isDark ? '#1e1e1e' : '#fff';
  const cardText = isDark ? '#fff' : '#1a1a1a';
  const subBg = isDark ? '#2d2d2d' : '#f0f2f5';

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedPlatforms(PLATFORMS.map(p => p.id));
  const selectNone = () => setSelectedPlatforms([]);

  const handlePublishNow = async () => {
    if (selectedPlatforms.length === 0) {
      addNotification("Selecione pelo menos uma plataforma.", 'error');
      return;
    }
    if (!postContent.trim()) {
      addNotification("O conteudo da publicacao nao pode estar vazio.", 'error');
      return;
    }

    setIsPublishing(true);
    setPublishSuccess(false);
    try {
      if (isFlowConfigured()) {
        await registerPublish({
          division,
          platform: selectedPlatforms.join(','),
          content: postContent,
          type: 'post',
        });
      }
      incrementPosts();
      setPublishSuccess(true);
      addNotification(`Publicado com sucesso em ${selectedPlatforms.length} plataformas!`, 'success');
      setTimeout(() => {
        setPostContent('');
        setPublishSuccess(false);
      }, 2000);
    } catch {
      addNotification('Erro ao registrar publicacao no backend.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSchedule = async () => {
    if (selectedPlatforms.length === 0) {
      addNotification("Selecione pelo menos uma plataforma.", 'error');
      return;
    }
    if (!scheduleDate) {
      addNotification("Selecione uma data para o agendamento.", 'error');
      return;
    }
    if (!postContent.trim()) {
      addNotification("O conteudo da publicacao nao pode estar vazio.", 'error');
      return;
    }

    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime || '12:00'}`).toISOString();

      if (isFlowConfigured()) {
        const saved = await schedulePost({
          division,
          platform: selectedPlatforms.join(','),
          content: postContent,
          scheduledAt,
        });
        const newPost: ScheduledPost = {
          id: ++nextPostId,
          platforms: [...selectedPlatforms],
          date: scheduleDate,
          time: scheduleTime,
          content: postContent,
          status: 'agendado',
          division,
          backendId: saved.id,
        };
        setScheduledPosts(prev => [newPost, ...prev]);
      } else {
        const newPost: ScheduledPost = {
          id: ++nextPostId,
          platforms: [...selectedPlatforms],
          date: scheduleDate,
          time: scheduleTime,
          content: postContent,
          status: 'agendado',
          division,
        };
        setScheduledPosts(prev => [newPost, ...prev]);
      }
      setScheduleSuccess(true);
      addNotification("Publicacao agendada com sucesso!", 'success');
      setTimeout(() => {
        setScheduleDate('');
        setPostContent('');
        setScheduleSuccess(false);
      }, 2000);
    } catch {
      addNotification('Erro ao agendar no backend.', 'error');
    }
  };

  const platformContent = content.platforms[selectedContentPlatform as keyof typeof content.platforms];

  const contentScore = useMemo(() => {
    if (!postContent) return null;
    return computeContentScore(postContent, previewPlatform);
  }, [postContent, previewPlatform]);

  const username = theme.name.toLowerCase().replace(/ /g, '');

  // POST EM DESTAQUE: conteudo do briefing de 10/03/2026
  const FEATURED_POST_CONNECT_GRAY = `O erro que faz sindicos perderem dinheiro todo mes (e nem percebem).

MANUTENCAO CORRETIVA (sem planejamento):
> R$4.200 em reparo emergencial de elevador
> R$1.800 em encanamento furado as 23h
> R$6.000 em curto-circuito na bomba d'agua

MANUTENCAO PREVENTIVA (com planejamento):
> R$800/mes cobre todos os sistemas
> 70% dos condominios esperam o problema aparecer
> Manutencao corretiva custa em media 5x mais

A diferenca? Sindicos conectados com a rede certa.

Participe do proximo Coffee Meet -- link na bio!

#condominio #sindico #gestaopredial #coffeemeet #connectgray #networking`;

  return (
    <div className="animate-fade-in">
      {/* BANNER: Post em Destaque -- apenas para connect-gray */}
      {division === 'connect-gray' && (
        <div style={{
          background: 'linear-gradient(135deg, #1a1a3050, #0d1a3580)',
          border: `1px solid ${theme.colors.primary}55`,
          borderRadius: '20px',
          padding: '1.2rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.2rem',
          flexWrap: 'wrap',
        }}>
          <div style={{
            background: theme.colors.primary,
            borderRadius: '12px',
            padding: '0.6rem 0.9rem',
            fontSize: '1.4rem',
            flexShrink: 0,
          }}>P</div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
              <span style={{ fontWeight: 900, fontSize: '0.85rem', color: theme.colors.primary }}>POST EM DESTAQUE</span>
              <span style={{ fontSize: '0.6rem', fontWeight: 800, background: '#f59e0b22', color: '#f59e0b', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>BRIEFING 10/03</span>
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.75, lineHeight: 1.5 }}>
              <strong>Gancho:</strong> O erro que faz sindicos perderem dinheiro todo mes...
              &nbsp;|&nbsp; <strong>CTA:</strong> Coffee Meet -- link na bio
              &nbsp;|&nbsp; <span style={{ color: theme.colors.primary }}>6 hashtags</span>
            </div>
          </div>
          <button
            onClick={() => {
              setPostContent(FEATURED_POST_CONNECT_GRAY);
              setSelectedPlatforms(['instagram']);
              setActiveTab('publish');
              addNotification('Post do briefing aplicado no editor!', 'success');
            }}
            style={{
              padding: '0.7rem 1.4rem',
              borderRadius: '12px',
              background: theme.colors.primary,
              color: '#fff',
              fontWeight: 900,
              fontSize: '0.8rem',
              whiteSpace: 'nowrap',
              boxShadow: `0 4px 15px ${theme.colors.primary}44`,
              transition: 'transform 0.2s',
            }}
          >
            USAR POST
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
          Publicador <span style={{ color: theme.colors.primary }}>IA</span>
        </h2>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <div style={{
            padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700,
            background: `${theme.colors.primary}18`, color: theme.colors.primary, border: `1px solid ${theme.colors.primary}33`,
          }}>
            TOTAL PUBLICADO: {stats.postsPublished}
          </div>
          <div style={{
            padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700,
            background: selectedPlatforms.length > 0 ? '#22c55e18' : '#66666618',
            color: selectedPlatforms.length > 0 ? '#22c55e' : '#666',
            border: `1px solid ${selectedPlatforms.length > 0 ? '#22c55e33' : '#66666633'}`,
          }}>
            {selectedPlatforms.length} PLATAFORMAS SELECIONADAS
          </div>
        </div>
      </div>

      {/* Platform Selector */}
      <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText, marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Destinos da Publicacao
          </div>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button onClick={selectAll} style={{ fontSize: '0.7rem', fontWeight: 700, color: theme.colors.primary, background: 'transparent', cursor: 'pointer' }}>
              Selecionar Todas
            </button>
            <button onClick={selectNone} style={{ fontSize: '0.7rem', fontWeight: 700, color: isDark ? '#666' : '#999', background: 'transparent', cursor: 'pointer' }}>
              Limpar
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem' }}>
          {PLATFORMS.map(p => {
            const isSelected = selectedPlatforms.includes(p.id);
            return (
              <div
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                style={{
                  padding: '1rem', borderRadius: '16px', textAlign: 'center',
                  background: isSelected ? `${p.color}18` : subBg,
                  border: isSelected ? `2px solid ${p.color}` : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                  boxShadow: isSelected ? `0 4px 15px ${p.color}33` : 'none'
                }}
              >
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px', margin: '0 auto 0.6rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: isSelected ? 1 : 0.4,
                  filter: isSelected ? `drop-shadow(0 0 6px ${p.color}99)` : 'none',
                  transition: 'all 0.3s',
                }}>
                  <PlatformIcon platformId={p.id} size={36} />
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, opacity: isSelected ? 1 : 0.5 }}>{p.name}</div>
                <div style={{ fontSize: '0.6rem', opacity: 0.3, marginTop: '0.2rem' }}>{p.maxDuration}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: subBg, padding: '0.3rem', borderRadius: '12px', width: 'fit-content', flexWrap: 'wrap' }}>
        {[
          { key: 'publish' as const, label: 'Publicar Agora' },
          { key: 'schedule' as const, label: 'Agendar' },
          { key: 'queue' as const, label: `Fila (${scheduledPosts.length})` },
          { key: 'preview' as const, label: 'Preview' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.6rem 1.2rem', borderRadius: '10px',
              backgroundColor: activeTab === tab.key ? theme.colors.primary : 'transparent',
              color: activeTab === tab.key ? '#fff' : (isDark ? '#666' : '#999'),
              fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.3s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== TAB PUBLICAR ===== */}
      {activeTab === 'publish' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
          <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.2rem' }}>EDITOR DE CONTEUDO</h3>

            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.4, marginBottom: '0.6rem', textTransform: 'uppercase' }}>
                Sugestao IA Personalizada
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.8rem' }}>
                {['instagram', 'tiktok', 'linkedin', 'youtube'].map(p => (
                  <button
                    key={p}
                    onClick={() => setSelectedContentPlatform(p)}
                    style={{
                      padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700,
                      background: selectedContentPlatform === p ? `${theme.colors.primary}22` : subBg,
                      color: selectedContentPlatform === p ? theme.colors.primary : (isDark ? '#888' : '#666'),
                      transition: 'all 0.2s', border: '1px solid transparent'
                    }}
                  >{p.toUpperCase()}</button>
                ))}
              </div>
              {platformContent && (
                <div style={{ padding: '1rem', borderRadius: '12px', background: subBg, fontSize: '0.8rem', borderLeft: `4px solid ${theme.colors.primary}` }}>
                  <div style={{ marginBottom: '0.5rem' }}><strong>Gancho:</strong> <span style={{ opacity: 0.7 }}>{platformContent.hooks[0]}</span></div>
                  <div style={{ marginBottom: '0.5rem' }}><strong>Corpo:</strong> <span style={{ opacity: 0.7 }}>{platformContent.body[0]}</span></div>
                  <div style={{ marginBottom: '0.8rem' }}><strong>CTA:</strong> <span style={{ opacity: 0.7 }}>{platformContent.cta[0]}</span></div>
                  <button
                    onClick={() => {
                      setPostContent(`${platformContent.hooks[0]}\n\n${platformContent.body[0]}\n\n${platformContent.cta[0]}\n\n${platformContent.tags.map(t => '#' + t).join(' ')}`);
                      addNotification("Sugestao aplicada!", 'info');
                    }}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: '8px',
                      background: theme.colors.primary, color: '#fff',
                      fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer'
                    }}
                  >APLICAR NO EDITOR</button>
                </div>
              )}
            </div>

            <textarea
              value={postContent}
              onChange={e => setPostContent(e.target.value)}
              placeholder="Sua mensagem..."
              rows={8}
              style={{
                width: '100%', padding: '1rem', borderRadius: '12px',
                background: subBg, border: 'none', color: cardText, fontSize: '0.9rem',
                resize: 'none', fontFamily: 'inherit', marginBottom: '1rem'
              }}
            />

            <button
              onClick={handlePublishNow}
              disabled={isPublishing}
              style={{
                width: '100%', padding: '1rem', borderRadius: '12px',
                background: publishSuccess ? '#22c55e' : theme.colors.primary,
                color: '#fff', fontWeight: 800, fontSize: '0.9rem',
                opacity: isPublishing ? 0.7 : 1, transition: 'all 0.3s', cursor: 'pointer',
                boxShadow: publishSuccess ? '0 4px 20px #22c55e44' : `0 4px 20px ${theme.colors.primary}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                transform: publishSuccess ? 'scale(1.02)' : 'none',
              }}
            >
              {isPublishing ? (
                <>
                  <span style={{
                    display: 'inline-block', width: '16px', height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid currentColor',
                    borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                  }} />
                  PUBLICANDO...
                </>
              ) : publishSuccess ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  PUBLICADO COM SUCESSO!
                </>
              ) : `PUBLICAR EM ${selectedPlatforms.length} REDES`}
            </button>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); } 100% { box-shadow: 0 0 0 15px rgba(34,197,94,0); } }`}</style>
          </div>

          <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.2rem' }}>RESUMO DA PUBLICACAO</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {PLATFORMS.filter(p => selectedPlatforms.includes(p.id)).map(p => (
                <div key={p.id} style={{
                  padding: '1rem', borderRadius: '12px', background: subBg,
                  borderLeft: `3px solid ${p.color}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <PlatformIcon platformId={p.id} size={22} />
                      <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{p.name}</span>
                    </div>
                    <span style={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: 700 }}>PRONTO</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {p.features.map(f => (
                      <span key={f} style={{
                        padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.6rem',
                        background: `${p.color}12`, color: p.color, fontWeight: 700
                      }}>{f}</span>
                    ))}
                  </div>
                </div>
              ))}
              {selectedPlatforms.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.3, fontSize: '0.85rem' }}>
                  Aguardando selecao de plataformas...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB AGENDAR ===== */}
      {activeTab === 'schedule' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
          <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.2rem' }}>AGENDAMENTO</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.4, display: 'block', marginBottom: '0.4rem' }}>DATA</label>
                <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', background: subBg, border: 'none', color: cardText }} />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.4, display: 'block', marginBottom: '0.4rem' }}>HORA</label>
                <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', background: subBg, border: 'none', color: cardText }} />
              </div>
            </div>
            <textarea
              value={postContent}
              onChange={e => setPostContent(e.target.value)}
              placeholder="Conteudo para agendar..."
              rows={4}
              style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: subBg, border: 'none', color: cardText, fontSize: '0.9rem', resize: 'none', marginBottom: '1rem' }}
            />
            <button
              onClick={handleSchedule}
              style={{
                width: '100%', padding: '1rem', borderRadius: '12px',
                background: scheduleSuccess ? '#22c55e' : theme.colors.primary,
                color: '#fff', fontWeight: 800, fontSize: '0.9rem',
                transition: 'all 0.3s', cursor: 'pointer',
                boxShadow: scheduleSuccess ? '0 4px 20px #22c55e44' : `0 4px 20px ${theme.colors.primary}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              {scheduleSuccess ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  AGENDADO COM SUCESSO!
                </>
              ) : 'CONFIRMAR AGENDAMENTO'}
            </button>
          </div>

          <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.3rem' }}>CRONOGRAMA ESTRATEGICO</h3>
            <p style={{ fontSize: '0.7rem', opacity: 0.4, marginBottom: '1.2rem' }}>Horarios recomendados para {theme.name}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {schedule.map((item, i) => (
                <div key={i} style={{
                  padding: '0.8rem 1rem', borderRadius: '12px', background: subBg,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                  onClick={() => {
                    setScheduleTime(item.time);
                    addNotification(`Horario ${item.time} aplicado!`, 'info');
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', background: `${theme.colors.primary}22`, color: theme.colors.primary, fontSize: '0.7rem', fontWeight: 800 }}>{item.day}</span>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{item.time}</span>
                      {item.bestTime && (
                        <span style={{ fontSize: '0.55rem', opacity: 0.4, fontWeight: 700 }}>({item.bestTime})</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.3rem' }}>{item.type}</div>
                    {item.reason && (
                      <div style={{ fontSize: '0.6rem', opacity: 0.35, marginTop: '0.15rem', fontStyle: 'italic' }}>{item.reason}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {item.platforms.map(pId => (
                      <span key={pId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', overflow: 'hidden' }}>
                        <PlatformIcon platformId={pId} size={28} />
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB FILA ===== */}
      {activeTab === 'queue' && (
        <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.2rem' }}>FILA DE PUBLICACOES ({scheduledPosts.length})</h3>
          {scheduledPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.3, fontSize: '0.9rem' }}>Nenhum agendamento pendente.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {scheduledPosts.map(post => (
                <div key={post.id} style={{ padding: '1rem', borderRadius: '16px', background: subBg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem' }}>{post.date}</span>
                      <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>{post.time}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.6rem', maxHeight: '3rem', overflow: 'hidden' }}>{post.content}</div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {post.platforms.map(pId => (
                        <span key={pId} style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', background: PLATFORMS.find(pl => pl.id === pId)?.color, color: '#fff', fontSize: '0.6rem', fontWeight: 800 }}>{PLATFORMS.find(pl => pl.id === pId)?.name}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{
                    padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800,
                    background: post.status === 'agendado' ? '#3b82f618' : post.status === 'publicado' ? '#22c55e18' : '#ef444418',
                    color: post.status === 'agendado' ? '#3b82f6' : post.status === 'publicado' ? '#22c55e' : '#ef4444',
                  }}>
                    {post.status === 'agendado' ? 'PENDENTE' : post.status === 'publicado' ? 'PUBLICADO' : 'FALHOU'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== TAB PREVIEW ===== */}
      {activeTab === 'preview' && (
        <div className="animate-fade-in">
          {/* Platform selector */}
          <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {(['instagram', 'tiktok', 'linkedin', 'youtube'] as const).map(p => {
              const pColors: Record<string, string> = { instagram: '#E4405F', tiktok: '#010101', linkedin: '#0A66C2', youtube: '#FF0000' };
              const pColor = pColors[p];
              return (
                <button
                  key={p}
                  onClick={() => setPreviewPlatform(p)}
                  style={{
                    padding: '0.5rem 1.2rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: previewPlatform === p ? pColor : subBg,
                    color: previewPlatform === p ? '#fff' : (isDark ? '#666' : '#999'),
                    border: `2px solid ${previewPlatform === p ? pColor : 'transparent'}`,
                    transition: 'all 0.3s',
                    boxShadow: previewPlatform === p ? `0 4px 15px ${pColor}44` : 'none',
                  }}
                >
                  <PlatformIcon platformId={p} size={18} />
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              );
            })}
            {!postContent && (
              <div style={{ padding: '0.6rem 1rem', fontSize: '0.75rem', opacity: 0.5, display: 'flex', alignItems: 'center' }}>
                Escreva um conteudo na aba "Publicar Agora" para visualizar o preview
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

            {/* ===== INSTAGRAM PREVIEW ===== */}
            {previewPlatform === 'instagram' && (
              <div style={{
                width: '380px', background: isDark ? '#000' : '#fff', borderRadius: '24px',
                border: `8px solid ${isDark ? '#222' : '#ddd'}`, overflow: 'hidden',
                boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
              }}>
                {/* Status bar mock */}
                <div style={{ padding: '0.4rem 1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 700, opacity: 0.5 }}>
                  <span>9:41</span>
                  <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                    <svg width="14" height="10" viewBox="0 0 14 10"><rect x="0" y="6" width="2" height="4" fill="currentColor" rx="0.5"/><rect x="3" y="4" width="2" height="6" fill="currentColor" rx="0.5"/><rect x="6" y="2" width="2" height="8" fill="currentColor" rx="0.5"/><rect x="9" y="0" width="2" height="10" fill="currentColor" rx="0.5"/></svg>
                    <svg width="18" height="10" viewBox="0 0 18 10"><rect x="0" y="1" width="14" height="8" rx="2" stroke="currentColor" strokeWidth="1" fill="none"/><rect x="2" y="3" width="9" height="4" fill="currentColor" rx="1"/><rect x="15" y="3.5" width="2" height="3" fill="currentColor" rx="0.5"/></svg>
                  </div>
                </div>
                {/* IG Header with logo */}
                <div style={{ padding: '0.4rem 1rem 0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${isDark ? '#222' : '#eee'}` }}>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '1.2rem', fontWeight: 400, fontStyle: 'italic', letterSpacing: '-0.5px' }}>Instagram</span>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  </div>
                </div>
                {/* Post header */}
                <div style={{ padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                    padding: '2px',
                  }}>
                    <div style={{
                      width: '100%', height: '100%', borderRadius: '50%',
                      background: theme.colors.primary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', fontWeight: 800, color: '#fff',
                      border: `2px solid ${isDark ? '#000' : '#fff'}`,
                    }}>G</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{username}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#3b82f6"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    </div>
                    <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>Patrocinado</div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" opacity="0.4"><circle cx="12" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="18" r="2"/></svg>
                </div>
                {/* Image placeholder */}
                <div style={{
                  aspectRatio: '1/1',
                  background: `linear-gradient(135deg, ${theme.colors.primary}22, ${theme.colors.primary}55, ${theme.colors.primary}22)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                  <div style={{ fontSize: '1rem', opacity: 0.3, textAlign: 'center', lineHeight: 1.6 }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                      <PlatformIcon platformId="instagram" size={64} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.7rem' }}>Imagem/Video do Post</div>
                    <div style={{ fontSize: '0.6rem' }}>1080x1080 ou 1080x1350</div>
                  </div>
                  {/* Carousel dots */}
                  <div style={{ position: 'absolute', bottom: '12px', display: 'flex', gap: '4px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }} />
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
                  </div>
                </div>
                {/* Actions */}
                <div style={{ padding: '0.7rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </div>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.4rem' }}>2.483 curtidas</div>
                  <div style={{ fontSize: '0.78rem', lineHeight: 1.5, maxHeight: '100px', overflow: 'hidden' }}>
                    <b>{username}</b>{' '}
                    {postContent ? (
                      <>
                        {postContent.length > 120 ? postContent.substring(0, 120) + '...' : postContent}
                        {postContent.length > 120 && <span style={{ opacity: 0.4, fontWeight: 600 }}> mais</span>}
                      </>
                    ) : (
                      <span style={{ opacity: 0.3 }}>Seu conteudo aparecera aqui...</span>
                    )}
                  </div>
                  {postContent && (postContent.match(/#\w+/g) || []).length > 0 && (
                    <div style={{ fontSize: '0.72rem', color: '#00376b', marginTop: '0.3rem', opacity: 0.7 }}>
                      {(postContent.match(/#\w+/g) || []).slice(0, 5).join(' ')}
                      {(postContent.match(/#\w+/g) || []).length > 5 && ' ...'}
                    </div>
                  )}
                  <div style={{ fontSize: '0.68rem', opacity: 0.35, marginTop: '0.4rem' }}>
                    Ver todos os 47 comentarios
                  </div>
                  <div style={{ fontSize: '0.6rem', opacity: 0.25, marginTop: '0.2rem', textTransform: 'uppercase' }}>Ha 1 hora</div>
                </div>
              </div>
            )}

            {/* ===== TIKTOK PREVIEW ===== */}
            {previewPlatform === 'tiktok' && (
              <div style={{
                width: '300px', height: '580px', background: '#000', borderRadius: '36px',
                border: '8px solid #111', overflow: 'hidden', position: 'relative',
                boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
              }}>
                {/* Status bar */}
                <div style={{ position: 'absolute', top: '8px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 700, color: '#fff', zIndex: 10 }}>
                  <span>9:41</span>
                  <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                    <svg width="14" height="10" viewBox="0 0 14 10"><rect x="0" y="6" width="2" height="4" fill="#fff" rx="0.5"/><rect x="3" y="4" width="2" height="6" fill="#fff" rx="0.5"/><rect x="6" y="2" width="2" height="8" fill="#fff" rx="0.5"/><rect x="9" y="0" width="2" height="10" fill="#fff" rx="0.5"/></svg>
                  </div>
                </div>
                {/* Top nav */}
                <div style={{ position: 'absolute', top: '28px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '1.2rem', zIndex: 10 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>Seguindo</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff', borderBottom: '2px solid #fff', paddingBottom: '2px' }}>Para voce</span>
                </div>
                {/* Video background */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `linear-gradient(180deg, transparent 20%, ${theme.colors.primary}44 50%, #000 90%)`,
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                }}>
                  <div style={{ marginBottom: '4rem' }}>
                    <PlatformIcon platformId="tiktok" size={80} style={{ opacity: 0.15 }} />
                  </div>
                </div>
                {/* Right sidebar - engagement buttons */}
                <div style={{ position: 'absolute', right: '10px', bottom: '100px', display: 'flex', flexDirection: 'column', gap: '1.2rem', alignItems: 'center' }}>
                  {/* Avatar */}
                  <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      background: theme.colors.primary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem', fontWeight: 800, color: '#fff',
                      border: '2px solid #fff',
                    }}>G</div>
                    <div style={{
                      position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%)',
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: '#fe2c55', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', color: '#fff', fontWeight: 800,
                    }}>+</div>
                  </div>
                  {/* Like */}
                  <div style={{ textAlign: 'center' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                    <div style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 700, marginTop: '2px' }}>148.2K</div>
                  </div>
                  {/* Comments */}
                  <div style={{ textAlign: 'center' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    <div style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 700, marginTop: '2px' }}>2.341</div>
                  </div>
                  {/* Bookmark */}
                  <div style={{ textAlign: 'center' }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                    <div style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 700, marginTop: '2px' }}>5.1K</div>
                  </div>
                  {/* Share */}
                  <div style={{ textAlign: 'center' }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
                    <div style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 700, marginTop: '2px' }}>892</div>
                  </div>
                  {/* Sound disc */}
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: `conic-gradient(${theme.colors.primary}, #333, ${theme.colors.primary})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'spin 3s linear infinite',
                    border: '3px solid #333',
                  }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: theme.colors.primary }} />
                  </div>
                </div>
                {/* Bottom content */}
                <div style={{ position: 'absolute', bottom: '16px', left: '12px', right: '65px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#fff' }}>@{username}</span>
                    <span style={{ fontSize: '0.55rem', color: '#fff', opacity: 0.6 }}>3h atras</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.4, maxHeight: '60px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                    {postContent ? (
                      postContent.length > 100 ? postContent.substring(0, 100) + '... mais' : postContent
                    ) : (
                      <span style={{ opacity: 0.5 }}>Seu conteudo aqui...</span>
                    )}
                  </div>
                  {/* Sound bar */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: 'rgba(255,255,255,0.1)', borderRadius: '20px', padding: '0.3rem 0.6rem',
                    width: 'fit-content', maxWidth: '200px',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <div style={{
                      fontSize: '0.6rem', color: '#fff', fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap',
                      width: '140px',
                    }}>
                      <span style={{ display: 'inline-block', animation: 'marquee 8s linear infinite' }}>
                        Som original - {theme.name}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Bottom nav */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: '#000', padding: '0.5rem 0', display: 'flex', justifyContent: 'space-around',
                  borderTop: '1px solid #222',
                }}>
                  {['Inicio', '+', 'Perfil'].map((label, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      {label === '+' ? (
                        <div style={{ width: '38px', height: '24px', borderRadius: '6px', background: 'linear-gradient(90deg, #25F4EE, #FE2C55)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                          <span style={{ fontSize: '1rem', color: '#000', fontWeight: 900 }}>+</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.6rem', color: i === 0 ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: 700 }}>{label}</span>
                      )}
                    </div>
                  ))}
                </div>
                <style>{`@keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }`}</style>
              </div>
            )}

            {/* ===== LINKEDIN PREVIEW ===== */}
            {previewPlatform === 'linkedin' && (
              <div style={{
                width: '460px', background: isDark ? '#1b1f23' : '#fff', borderRadius: '12px',
                border: `1px solid ${isDark ? '#38434f' : '#e0e0e0'}`, overflow: 'hidden',
                boxShadow: '0 2px 15px rgba(0,0,0,0.15)',
              }}>
                {/* LinkedIn top bar */}
                <div style={{ background: isDark ? '#1b1f23' : '#fff', padding: '0.5rem 1rem', borderBottom: `1px solid ${isDark ? '#38434f' : '#e8e8e8'}`, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <PlatformIcon platformId="linkedin" size={22} />
                  <div style={{ flex: 1, height: '28px', borderRadius: '4px', background: isDark ? '#38434f' : '#eef3f8', display: 'flex', alignItems: 'center', paddingLeft: '0.6rem', fontSize: '0.7rem', opacity: 0.4 }}>
                    Pesquisar
                  </div>
                </div>
                {/* Post card */}
                <div style={{ padding: '1rem 1rem 0' }}>
                  {/* Author */}
                  <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      background: theme.colors.primary, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: '1.1rem',
                    }}>G</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Grupo Gray - {theme.name}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.5, lineHeight: 1.4 }}>1.842 seguidores</div>
                      <div style={{ fontSize: '0.65rem', opacity: 0.4, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        1h
                        <span style={{ fontSize: '0.5rem' }}>*</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" opacity="0.5"><circle cx="12" cy="12" r="10"/><path d="M2 12a10 10 0 1020 0 10 10 0 10-20 0z" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
                      </div>
                    </div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" opacity="0.3"><circle cx="12" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="18" r="2"/></svg>
                  </div>
                  {/* Content */}
                  <div style={{
                    fontSize: '0.82rem', lineHeight: 1.6,
                    color: isDark ? 'rgba(255,255,255,0.9)' : '#1a1a1a',
                    marginBottom: '0.8rem',
                    maxHeight: '140px', overflow: 'hidden',
                  }}>
                    {postContent ? (
                      <>
                        {postContent.length > 200 ? postContent.substring(0, 200) : postContent}
                        {postContent.length > 200 && (
                          <span style={{ color: '#0a66c2', fontWeight: 600, cursor: 'pointer' }}> ...ver mais</span>
                        )}
                      </>
                    ) : (
                      <span style={{ opacity: 0.3 }}>Seu conteudo LinkedIn aqui...</span>
                    )}
                  </div>
                  {postContent && (postContent.match(/#\w+/g) || []).length > 0 && (
                    <div style={{ fontSize: '0.78rem', color: '#0a66c2', marginBottom: '0.8rem', fontWeight: 600 }}>
                      {(postContent.match(/#\w+/g) || []).slice(0, 4).join(' ')}
                    </div>
                  )}
                </div>
                {/* Image */}
                <div style={{
                  height: '220px',
                  background: `linear-gradient(135deg, ${theme.colors.primary}15, ${theme.colors.primary}35)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderTop: `1px solid ${isDark ? '#38434f' : '#e8e8e8'}`,
                  borderBottom: `1px solid ${isDark ? '#38434f' : '#e8e8e8'}`,
                }}>
                  <div style={{ textAlign: 'center', opacity: 0.3 }}>
                    <PlatformIcon platformId="linkedin" size={48} />
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: '0.5rem' }}>Imagem corporativa</div>
                    <div style={{ fontSize: '0.6rem' }}>1200x627 recomendado</div>
                  </div>
                </div>
                {/* Reactions bar */}
                <div style={{ padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${isDark ? '#38434f' : '#eee'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <div style={{ display: 'flex' }}>
                      {['#0a66c2', '#e7a33e', '#df704d'].map((c, i) => (
                        <div key={i} style={{ width: '18px', height: '18px', borderRadius: '50%', background: c, border: `2px solid ${isDark ? '#1b1f23' : '#fff'}`, marginLeft: i > 0 ? '-6px' : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: '#fff' }}>
                          {['G', 'C', 'F'][i]}
                        </div>
                      ))}
                    </div>
                    <span style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: '0.3rem' }}>84 reacoes</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>12 comentarios</span>
                </div>
                {/* Action buttons */}
                <div style={{ padding: '0.4rem 0.5rem', display: 'flex', justifyContent: 'space-around' }}>
                  {[
                    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>, label: 'Gostei' },
                    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, label: 'Comentar' },
                    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>, label: 'Repostar' },
                    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>, label: 'Enviar' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.8rem', borderRadius: '4px', cursor: 'pointer', opacity: 0.6, fontSize: '0.72rem', fontWeight: 600 }}>
                      {item.icon} {item.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== YOUTUBE PREVIEW ===== */}
            {previewPlatform === 'youtube' && (
              <div style={{
                width: '460px', background: isDark ? '#0f0f0f' : '#fff', borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
              }}>
                {/* Video player */}
                <div style={{
                  aspectRatio: '16/9',
                  background: `linear-gradient(135deg, #000 0%, ${theme.colors.primary}22 50%, #000 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                  <div style={{ textAlign: 'center', opacity: 0.3 }}>
                    <PlatformIcon platformId="youtube" size={64} />
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff', marginTop: '0.5rem' }}>Thumbnail do Video</div>
                    <div style={{ fontSize: '0.6rem', color: '#fff' }}>1280x720 recomendado</div>
                  </div>
                  {/* Play button */}
                  <div style={{
                    position: 'absolute',
                    width: '60px', height: '42px', borderRadius: '12px',
                    background: 'rgba(255,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><polygon points="8,5 20,12 8,19"/></svg>
                  </div>
                  {/* Duration */}
                  <div style={{
                    position: 'absolute', bottom: '8px', right: '8px',
                    background: 'rgba(0,0,0,0.8)', padding: '0.15rem 0.4rem', borderRadius: '4px',
                    fontSize: '0.65rem', color: '#fff', fontWeight: 700,
                  }}>12:34</div>
                  {/* Progress bar */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'rgba(255,255,255,0.2)' }}>
                    <div style={{ width: '0%', height: '100%', background: '#ff0000' }} />
                  </div>
                </div>
                {/* Video info */}
                <div style={{ padding: '0.8rem 1rem' }}>
                  <div style={{ display: 'flex', gap: '0.8rem' }}>
                    {/* Channel avatar */}
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: theme.colors.primary, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: '1rem',
                      marginTop: '2px',
                    }}>G</div>
                    <div style={{ flex: 1 }}>
                      {/* Title */}
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.3, marginBottom: '0.4rem', color: isDark ? '#fff' : '#0f0f0f' }}>
                        {postContent ? (
                          postContent.split('\n')[0].substring(0, 70) + (postContent.split('\n')[0].length > 70 ? '...' : '')
                        ) : (
                          <span style={{ opacity: 0.3 }}>Titulo do video aparecera aqui...</span>
                        )}
                      </div>
                      {/* Channel + stats */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', opacity: 0.5 }}>
                        <span style={{ fontWeight: 600 }}>{theme.name}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" opacity="0.6"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                      </div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '0.15rem' }}>
                        12.4 mil visualizacoes * ha 2 horas
                      </div>
                    </div>
                  </div>
                  {/* Description preview */}
                  {postContent && postContent.split('\n').length > 1 && (
                    <div style={{
                      marginTop: '0.8rem', padding: '0.8rem',
                      background: isDark ? '#272727' : '#f2f2f2', borderRadius: '12px',
                      fontSize: '0.75rem', lineHeight: 1.5, opacity: 0.7,
                      maxHeight: '60px', overflow: 'hidden',
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: '0.2rem', fontSize: '0.7rem' }}>12,4 mil visualizacoes * ha 2 horas</div>
                      {postContent.split('\n').slice(1, 3).join(' ').substring(0, 100)}
                      {postContent.split('\n').slice(1).join(' ').length > 100 && (
                        <span style={{ fontWeight: 600 }}> ...mais</span>
                      )}
                    </div>
                  )}
                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.8rem', overflowX: 'auto' }}>
                    {[
                      { label: '1.2K', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/></svg> },
                      { label: 'Compartilhar', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg> },
                      { label: 'Salvar', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg> },
                    ].map((item, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.4rem 0.8rem', borderRadius: '20px',
                        background: isDark ? '#272727' : '#f2f2f2',
                        fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap',
                        opacity: 0.7,
                      }}>
                        {item.icon} {item.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ===== SCORE + DICAS ===== */}
            <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Content Score */}
              <div style={{ padding: '1.2rem', borderRadius: '16px', background: `${theme.colors.primary}12`, border: `1px solid ${theme.colors.primary}33` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: theme.colors.primary }}>SCORE DO CONTEUDO</div>
                  {contentScore && (
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      background: contentScore.total >= 70 ? '#22c55e22' : contentScore.total >= 40 ? '#f59e0b22' : '#ef444422',
                      border: `3px solid ${contentScore.total >= 70 ? '#22c55e' : contentScore.total >= 40 ? '#f59e0b' : '#ef4444'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900, fontSize: '1rem',
                      color: contentScore.total >= 70 ? '#22c55e' : contentScore.total >= 40 ? '#f59e0b' : '#ef4444',
                    }}>
                      {contentScore.total}
                    </div>
                  )}
                </div>
                {contentScore ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {contentScore.items.map((item, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{item.label}</span>
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 800,
                            color: item.score >= 70 ? '#22c55e' : item.score >= 40 ? '#f59e0b' : '#ef4444'
                          }}>{item.score}%</span>
                        </div>
                        <div style={{ height: '4px', borderRadius: '2px', background: isDark ? '#333' : '#e5e5e5', marginBottom: '0.15rem' }}>
                          <div style={{
                            width: `${item.score}%`, height: '100%', borderRadius: '2px',
                            background: item.score >= 70 ? '#22c55e' : item.score >= 40 ? '#f59e0b' : '#ef4444',
                            transition: 'width 0.8s ease'
                          }} />
                        </div>
                        <div style={{ fontSize: '0.6rem', opacity: 0.45, fontStyle: 'italic' }}>{item.tip}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.72rem', opacity: 0.5 }}>Escreva o conteudo para analise automatica</div>
                )}
              </div>

              {/* Platform Tips */}
              <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem', opacity: 0.7 }}>
                  {previewPlatform === 'instagram' ? 'DICAS INSTAGRAM' : previewPlatform === 'tiktok' ? 'DICAS TIKTOK' : previewPlatform === 'youtube' ? 'DICAS YOUTUBE' : 'DICAS LINKEDIN'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.75rem', opacity: 0.7, lineHeight: 1.5 }}>
                  {previewPlatform === 'instagram' && [
                    'Primeiras 2 linhas sao as mais importantes (pre-visualizadas)',
                    'Adicionar quebras de linha para melhor legibilidade',
                    'Maximo 30 hashtags -- use entre 10 e 15 para melhor alcance',
                    'CTA claro antes das hashtags',
                    'Use emojis para aumentar engajamento em ate 48%',
                    'Tamanho ideal: 1080x1350 para feed, 1080x1920 para Reels/Stories',
                  ].map((tip, i) => <div key={i} style={{ paddingLeft: '0.6rem', borderLeft: `2px solid ${theme.colors.primary}44` }}>{tip}</div>)}
                  {previewPlatform === 'tiktok' && [
                    'Primeiros 3 segundos determinam o sucesso do video',
                    'Legendas curtas e diretas -- max 150 chars',
                    'Use duet/stitch para ampliar alcance organicamente',
                    'Sons trending aumentam descoberta em 6x',
                    'Hashtags de nicho performam melhor que genericas',
                    'Formato: 1080x1920 (9:16) -- sempre vertical',
                  ].map((tip, i) => <div key={i} style={{ paddingLeft: '0.6rem', borderLeft: `2px solid ${theme.colors.primary}44` }}>{tip}</div>)}
                  {previewPlatform === 'linkedin' && [
                    'Posts com "Ver mais" geram +60% de engajamento',
                    'Evite links na publicacao -- coloque nos comentarios',
                    'Imagens nativas performam 3x melhor que links',
                    'Poste entre 7h-9h ou 17h-18h nos dias uteis',
                    'Mencione conexoes relevantes para ampliar alcance',
                    'Documentos/carrosseis tem 2x mais engajamento que imagens',
                  ].map((tip, i) => <div key={i} style={{ paddingLeft: '0.6rem', borderLeft: `2px solid ${theme.colors.primary}44` }}>{tip}</div>)}
                  {previewPlatform === 'youtube' && [
                    'Thumbnail com rosto + texto contrastante = +30% CTR',
                    'Titulo ate 60 caracteres para nao ser cortado',
                    'Primeiros 30 segundos definem a retencao do video',
                    'Shorts: ate 60s, vertical 9:16, loop natural',
                    'Descricao com palavras-chave nas primeiras 2 linhas',
                    'End screen nos ultimos 20s para empurrar outros videos',
                  ].map((tip, i) => <div key={i} style={{ paddingLeft: '0.6rem', borderLeft: `2px solid ${theme.colors.primary}44` }}>{tip}</div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiChannelPublisher;
