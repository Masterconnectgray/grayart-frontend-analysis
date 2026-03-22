import React, { useEffect, useMemo, useState } from 'react';
import type { Division } from '../constants/Themes';
import { useAppContext } from '../context/AppContext';
import { listScheduledPosts } from '../services/FlowAPIService';
import { fetchConnectedAccounts, publishToSocial, scheduleToSocial, type PlatformKey } from '../services/SocialOAuthService';
import { PlatformSelector, PLATFORMS } from './publisher/PlatformSelector';
import { PostEditor } from './publisher/PostEditor';
import { PublishActions } from './publisher/PublishActions';
import { ScheduleCalendar } from './publisher/ScheduleCalendar';
import { PostPreview } from './publisher/PostPreview';

interface ScheduledPost {
  id: number;
  platforms: string[];
  date: string;
  time: string;
  content: string;
  status: 'agendado' | 'publicado' | 'falhou' | 'aprovacao pendente' | 'aprovado' | 'ajustes solicitados';
  division: Division;
  backendId?: string;
}

const SUPPORTED_PUBLISH_PLATFORMS = new Set<PlatformKey>([
  'instagram',
  'facebook',
  'linkedin',
  'tiktok',
  'youtube',
  'pinterest',
]);

const SCHEDULABLE_PLATFORMS = new Set<string>([
  'instagram',
  'facebook',
  'linkedin',
  'tiktok',
  'youtube',
  'pinterest',
  'whatsapp',
]);

function toUiStatus(status: string): ScheduledPost['status'] {
  switch (status) {
    case 'published':
      return 'publicado';
    case 'failed':
      return 'falhou';
    case 'approved':
      return 'aprovado';
    case 'changes_requested':
      return 'ajustes solicitados';
    case 'pending_approval':
    case 'pending_whatsapp_approval':
      return 'aprovacao pendente';
    default:
      return 'agendado';
  }
}

function formatScheduledAt(value?: string | null) {
  if (!value) {
    return { date: 'Sem data', time: '--:--' };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const [date = 'Sem data', time = '--:--'] = value.split('T');
    return { date, time: time.substring(0, 5) || '--:--' };
  }

  const localDate = parsed.toLocaleDateString('sv-SE');
  const localTime = parsed.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return { date: localDate, time: localTime };
}

function mapScheduledPosts(posts: Awaited<ReturnType<typeof listScheduledPosts>>): ScheduledPost[] {
  return posts.map((post, index) => {
    const { date, time } = formatScheduledAt(post.scheduledAt);
    return {
      id: index + 1,
      platforms: post.platform.split(','),
      date,
      time,
      content: post.content,
      status: toUiStatus(post.status),
      division: post.division as Division,
      backendId: post.id,
    };
  });
}

const MultiChannelPublisher: React.FC<{ division: Division }> = ({ division }) => {
  const { addNotification, incrementPosts, stats, addActivityLog } = useAppContext();
  const isDark = division !== 'gray-art';

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram']);
  const [postContent, setPostContent] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('12:00');
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'publish' | 'schedule' | 'queue' | 'preview'>('publish');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState<'instagram' | 'tiktok' | 'linkedin' | 'youtube'>('instagram');

  const refreshScheduledPosts = async () => {
    try {
      const posts = await listScheduledPosts(division);
      setScheduledPosts(mapScheduledPosts(posts));
    } catch {
      setScheduledPosts([]);
    }
  };

  const refreshConnectedPlatforms = async () => {
    try {
      const accounts = await fetchConnectedAccounts();
      setConnectedPlatforms([...new Set(accounts.filter((account) => account.status === 'active').map((account) => account.platform))]);
    } catch {
      setConnectedPlatforms([]);
    }
  };

  useEffect(() => {
    setPostContent('');
    setScheduleDate('');
    setActiveTab('publish');
    setSelectedPlatforms(['instagram']);

    refreshScheduledPosts();
    refreshConnectedPlatforms();
  }, [division]);

  const selectedPublishablePlatforms = selectedPlatforms.filter(
    (platform): platform is PlatformKey =>
      SUPPORTED_PUBLISH_PLATFORMS.has(platform as PlatformKey) && connectedPlatforms.includes(platform)
  );

  const selectedSchedulablePlatforms = selectedPlatforms.filter((platform) => {
    if (platform === 'whatsapp') return true;
    return SCHEDULABLE_PLATFORMS.has(platform) && connectedPlatforms.includes(platform);
  });

  const handlePublishNow = async () => {
    if (selectedPlatforms.length === 0) {
      addNotification('Selecione pelo menos uma plataforma.', 'error');
      return;
    }
    if (!postContent.trim()) {
      addNotification('O conteúdo não pode estar vazio.', 'error');
      return;
    }

    const directPublishPlatforms = selectedPublishablePlatforms;
    const unsupportedPlatforms = selectedPlatforms.filter((platform) => !SUPPORTED_PUBLISH_PLATFORMS.has(platform as PlatformKey));
    const disconnectedPlatforms = selectedPlatforms.filter(
      (platform) => SUPPORTED_PUBLISH_PLATFORMS.has(platform as PlatformKey) && !connectedPlatforms.includes(platform)
    );

    if (directPublishPlatforms.length === 0) {
      addNotification('As plataformas selecionadas não suportam publicação imediata nesta tela.', 'error');
      return;
    }

    setIsPublishing(true);
    setPublishSuccess(false);

    try {
      const results = await Promise.allSettled(
        directPublishPlatforms.map((platform) => publishToSocial(platform, { caption: postContent }))
      );

      const fulfilled = results.filter((result) => result.status === 'fulfilled');
      const rejected = results
        .map((result, index) => ({ result, platform: directPublishPlatforms[index] }))
        .filter((entry): entry is { result: PromiseRejectedResult; platform: PlatformKey } => entry.result.status === 'rejected');

      const fulfilledPlatforms = results
        .map((result, index) => ({ result, platform: directPublishPlatforms[index] }))
        .filter((entry): entry is { result: PromiseFulfilledResult<any>; platform: PlatformKey } => entry.result.status === 'fulfilled');

      if (fulfilled.length > 0) {
        fulfilled.forEach(() => incrementPosts());
        fulfilledPlatforms.forEach(({ platform }) => addActivityLog(platform, 'Post Publicado', 'Postado com sucesso via Publicador', 'success'));
        setPublishSuccess(true);
        addNotification(
          `Publicado em ${fulfilled.length} rede${fulfilled.length > 1 ? 's' : ''}.`,
          rejected.length === 0 ? 'success' : 'info'
        );
        setTimeout(() => {
          setPostContent('');
          setPublishSuccess(false);
        }, 2000);
      }

      if (unsupportedPlatforms.length > 0) {
        addNotification(`Estas plataformas exigem outro fluxo: ${unsupportedPlatforms.join(', ')}.`, 'info');
      }

      if (disconnectedPlatforms.length > 0) {
        addNotification(`Conecte estas redes antes de publicar: ${disconnectedPlatforms.join(', ')}.`, 'info');
      }

      if (rejected.length > 0) {
        const failedNames = rejected.map(({ platform }) => platform).join(', ');
        const firstError = rejected[0].result.reason instanceof Error
          ? rejected[0].result.reason.message
          : 'Erro ao publicar';
        addNotification(`Falha em ${failedNames}: ${firstError}`, 'error');
        rejected.forEach(({ platform }) => addActivityLog(platform, 'Erro na Publicação', firstError, 'error'));
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSchedule = async () => {
    if (selectedPlatforms.length === 0) {
      addNotification('Selecione uma plataforma.', 'error');
      return;
    }
    if (!scheduleDate) {
      addNotification('Selecione uma data.', 'error');
      return;
    }
    if (!postContent.trim()) {
      addNotification('O conteúdo não pode estar vazio.', 'error');
      return;
    }

    const scheduledDate = new Date(`${scheduleDate}T${scheduleTime || '12:00'}`);
    if (Number.isNaN(scheduledDate.getTime())) {
      addNotification('Data ou hora inválida.', 'error');
      return;
    }

    const platformsToSchedule = selectedSchedulablePlatforms;
    if (platformsToSchedule.length === 0) {
      addNotification('Nenhuma plataforma selecionada suporta agendamento nesta tela.', 'error');
      return;
    }

    setIsScheduling(true);
    setScheduleSuccess(false);

    try {
      const results = await Promise.allSettled(
        platformsToSchedule.map((platform) =>
          scheduleToSocial(platform, {
            caption: postContent,
            scheduleAt: scheduledDate.getTime(),
          })
        )
      );

      const fulfilled = results
        .map((result, index) => ({ result, platform: platformsToSchedule[index] }))
        .filter((entry): entry is { result: PromiseFulfilledResult<{ id: number; status: string }>; platform: string } => entry.result.status === 'fulfilled');
      const rejected = results
        .map((result, index) => ({ result, platform: platformsToSchedule[index] }))
        .filter((entry): entry is { result: PromiseRejectedResult; platform: string } => entry.result.status === 'rejected');

      if (fulfilled.length > 0) {
        fulfilled.forEach(({ platform }) => addActivityLog(platform, 'Post Agendado', `Para ${scheduleDate} às ${scheduleTime}`, 'info'));
        await refreshScheduledPosts();
        setScheduleSuccess(true);
        addNotification(
          `Agendado em ${fulfilled.length} rede${fulfilled.length > 1 ? 's' : ''}.`,
          rejected.length === 0 ? 'success' : 'info'
        );
        setTimeout(() => {
          setScheduleDate('');
          setPostContent('');
          setScheduleSuccess(false);
        }, 2000);
      }

      if (rejected.length > 0) {
        const failedNames = rejected.map(({ platform }) => platform).join(', ');
        const firstError = rejected[0].result.reason instanceof Error
          ? rejected[0].result.reason.message
          : 'Erro ao agendar';
        addNotification(`Falha ao agendar em ${failedNames}: ${firstError}`, 'error');
      }
    } finally {
      setIsScheduling(false);
    }
  };

  const contentScore = useMemo(() => {
    if (!postContent) return null;
    const len = Math.min(100, (postContent.length / 300) * 100);
    const hash = (postContent.match(/#\w+/g) || []).length > 2 ? 100 : 40;
    return {
      total: Math.round((len + hash) / 2),
      items: [
        { label: 'Comprimento', score: Math.round(len), tip: 'Escreva um pouco mais para otimizar' },
        { label: 'Hashtags', score: hash, tip: 'Adicione pelo menos 3 hashtags' },
      ],
    };
  }, [postContent]);

  return (
    <div className="animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-[#1a1a1a]'}`}>
          Publicador <span className="text-[var(--primary-color)]">Cross-Platform</span>
        </h2>
        <div className="flex gap-3">
          <div className={`px-4 py-2 rounded-xl text-xs font-bold border ${isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-black/5 border-black/10 text-slate-600'}`}>
            TOTAL PUBLICADO: {stats.postsPublished}
          </div>
        </div>
      </div>

      <PlatformSelector
        selectedPlatforms={selectedPlatforms}
        onChange={setSelectedPlatforms}
        isDark={isDark}
        connectedPlatforms={connectedPlatforms}
        publishablePlatforms={selectedPublishablePlatforms}
      />

      <div className={`flex flex-wrap gap-2 mb-6 p-1.5 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
        {[
          { key: 'publish' as const, label: 'Publicar Agora' },
          { key: 'schedule' as const, label: 'Agendar' },
          { key: 'queue' as const, label: `Fila (${scheduledPosts.length})` },
          { key: 'preview' as const, label: 'Preview Visual' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`min-w-[140px] px-5 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${
              activeTab === tab.key
                ? 'bg-[var(--primary-color)] text-[#1a1a1a] shadow-md'
                : (isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-black hover:bg-black/5')
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'publish' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PostEditor division={division} content={postContent} onChange={setPostContent} />
            <div className={`border rounded-2xl p-6 ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
              <h3 className={`text-base font-bold mb-5 uppercase tracking-wide ${isDark ? 'text-white' : 'text-[#1a1a1a]'}`}>Ações de Publicação</h3>
              <div className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Você selecionou <strong className={isDark ? 'text-white' : 'text-black'}>{selectedPlatforms.length}</strong> redes sociais para disparo simultâneo do conteúdo.
              </div>
              <div className={`mb-6 rounded-xl border p-4 text-xs leading-relaxed space-y-2 ${
                isDark ? 'bg-black/20 border-white/10 text-slate-300' : 'bg-white/60 border-black/10 text-slate-700'
              }`}>
                <div><strong>Publicação imediata:</strong> {selectedPublishablePlatforms.length} rede{selectedPublishablePlatforms.length !== 1 ? 's' : ''} pronta{selectedPublishablePlatforms.length !== 1 ? 's' : ''}.</div>
                <div><strong>Agendamento:</strong> {selectedSchedulablePlatforms.length} destino{selectedSchedulablePlatforms.length !== 1 ? 's' : ''} disponível{selectedSchedulablePlatforms.length !== 1 ? 'is' : ''}.</div>
                {selectedPlatforms.some((platform) => platform !== 'whatsapp' && !connectedPlatforms.includes(platform)) && (
                  <div className="text-amber-500">
                    Algumas redes selecionadas ainda não estão conectadas no backend.
                  </div>
                )}
              </div>
              <PublishActions
                onPublishNow={handlePublishNow}
                onSchedule={() => setActiveTab('schedule')}
                isPublishing={isPublishing}
                publishSuccess={publishSuccess}
                scheduleSuccess={scheduleSuccess}
                selectedCount={selectedPlatforms.length}
                publishDisabled={selectedPublishablePlatforms.length === 0 || !postContent.trim()}
              />
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <ScheduleCalendar
            division={division}
            scheduleDate={scheduleDate}
            scheduleTime={scheduleTime}
            postContent={postContent}
            scheduleSuccess={scheduleSuccess}
            onDateChange={setScheduleDate}
            onTimeChange={setScheduleTime}
            onContentChange={setPostContent}
            onSchedule={handleSchedule}
            isScheduling={isScheduling}
          />
        )}

        {activeTab === 'preview' && (
          <PostPreview
            division={division}
            content={postContent}
            previewPlatform={previewPlatform}
            setPreviewPlatform={setPreviewPlatform}
            contentScore={contentScore}
          />
        )}

        {activeTab === 'queue' && (
          <div className={`border rounded-2xl p-6 ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
            <h3 className={`text-base font-bold mb-5 ${isDark ? 'text-white' : 'text-[#1a1a1a]'}`}>Fila de Publicações Pendentes</h3>
            {scheduledPosts.length === 0 ? (
              <div className="text-center py-10 opacity-50 text-sm">A fila está vazia.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {scheduledPosts.map((post) => (
                  <div key={post.id} className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between gap-4 ${isDark ? 'bg-black/20 border-white/5' : 'bg-white/50 border-black/5'}`}>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-[#1a1a1a]'}`}>
                          {post.date === 'Sem data' ? post.date : post.date.split('-').reverse().join('/')}
                        </span>
                        <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{post.time}</span>
                      </div>
                      <div className={`text-sm line-clamp-2 pr-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{post.content}</div>
                    </div>
                    <div className="flex sm:flex-col items-end justify-between gap-2">
                      <div className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded-lg border border-blue-500/20 uppercase">
                        {post.status}
                      </div>
                      <div className="flex gap-1">
                        {post.platforms.map((platformId) => (
                          <div key={platformId} className={`w-6 h-6 rounded flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
                            {PLATFORMS.find((platform) => platform.id === platformId)?.icon || '?'}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiChannelPublisher;
