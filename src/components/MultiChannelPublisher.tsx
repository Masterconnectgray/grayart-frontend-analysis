import React, { useState, useEffect, useMemo } from 'react';
import type { Division } from '../constants/Themes';
import { useAppContext } from '../context/AppContext';
import { registerPublish, schedulePost, listScheduledPosts, isFlowConfigured } from '../services/FlowAPIService';

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
  status: 'agendado' | 'publicado' | 'falhou';
  division: Division;
  backendId?: string;
}

const MultiChannelPublisher: React.FC<{ division: Division }> = ({ division }) => {
  const { addNotification, incrementPosts, stats } = useAppContext();
  // theme was here

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram']);
  const [postContent, setPostContent] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('12:00');
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [activeTab, setActiveTab] = useState<'publish' | 'schedule' | 'queue' | 'preview'>('publish');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
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

  const handlePublishNow = async () => {
    if (selectedPlatforms.length === 0) { addNotification("Selecione pelo menos uma plataforma.", 'error'); return; }
    if (!postContent.trim()) { addNotification("O conteúdo não pode estar vazio.", 'error'); return; }

    setIsPublishing(true);
    try {
      if (isFlowConfigured()) {
        await registerPublish({ division, platform: selectedPlatforms.join(','), content: postContent, type: 'post' });
      }
      incrementPosts();
      setPublishSuccess(true);
      addNotification(`Publicado com sucesso!`, 'success');
      setTimeout(() => { setPostContent(''); setPublishSuccess(false); }, 2000);
    } catch {
      addNotification('Erro ao registrar publicação.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSchedule = async () => {
    if (selectedPlatforms.length === 0) { addNotification("Selecione uma plataforma.", 'error'); return; }
    if (!scheduleDate) { addNotification("Selecione uma data.", 'error'); return; }
    if (!postContent.trim()) { addNotification("O conteúdo não pode estar vazio.", 'error'); return; }

    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime || '12:00'}`).toISOString();
      if (isFlowConfigured()) {
        const saved = await schedulePost({ division, platform: selectedPlatforms.join(','), content: postContent, scheduledAt });
        setScheduledPosts(prev => [{ id: Date.now(), platforms: [...selectedPlatforms], date: scheduleDate, time: scheduleTime, content: postContent, status: 'agendado', division, backendId: saved.id }, ...prev]);
      } else {
        setScheduledPosts(prev => [{ id: Date.now(), platforms: [...selectedPlatforms], date: scheduleDate, time: scheduleTime, content: postContent, status: 'agendado', division }, ...prev]);
      }
      setScheduleSuccess(true);
      addNotification("Publicação agendada com sucesso!", 'success');
      setTimeout(() => { setScheduleDate(''); setPostContent(''); setScheduleSuccess(false); }, 2000);
    } catch {
      addNotification('Erro ao agendar.', 'error');
    }
  };

  // Content Score mock
  const contentScore = useMemo(() => {
    if (!postContent) return null;
    const len = Math.min(100, (postContent.length / 300) * 100);
    const hash = (postContent.match(/#\w+/g) || []).length > 2 ? 100 : 40;
    return {
      total: Math.round((len + hash) / 2),
      items: [
        { label: 'Comprimento', score: Math.round(len), tip: 'Escreva um pouco mais para otimizar' },
        { label: 'Hashtags', score: hash, tip: 'Adicione pelo menos 3 hashtags' }
      ]
    };
  }, [postContent]);

  return (
    <div className="animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          Publicador <span className="text-[var(--primary-color)]">Cross-Platform</span>
        </h2>
        <div className="flex gap-3">
          <div className="px-4 py-2 rounded-xl text-xs font-bold border bg-white/5 border-white/10 text-slate-300">
            TOTAL PUBLICADO: {stats.postsPublished}
          </div>
        </div>
      </div>

      <PlatformSelector selectedPlatforms={selectedPlatforms} onChange={setSelectedPlatforms} />

      <div className="flex gap-2 mb-6 bg-white/5 p-1.5 rounded-xl w-fit">
        {[
          { key: 'publish' as const, label: 'Publicar Agora' },
          { key: 'schedule' as const, label: 'Agendar' },
          { key: 'queue' as const, label: `Fila (${scheduledPosts.length})` },
          { key: 'preview' as const, label: 'Preview Visual' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all duration-300
              ${activeTab === tab.key ? 'bg-[var(--primary-color)] text-[#1a1a1a] shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'publish' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PostEditor division={division} content={postContent} onChange={setPostContent} />
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-5 uppercase tracking-wide">Ações de Publicação</h3>
              <div className="text-sm text-slate-400 mb-6">
                Você selecionou <strong className="text-white">{selectedPlatforms.length}</strong> redes sociais para disparo simultâneo do conteúdo.
              </div>
              <PublishActions 
                onPublishNow={handlePublishNow}
                onSchedule={() => setActiveTab('schedule')}
                isPublishing={isPublishing}
                publishSuccess={publishSuccess}
                scheduleSuccess={scheduleSuccess}
                selectedCount={selectedPlatforms.length}
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
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-5">Fila de Publicações Pendentes</h3>
            {scheduledPosts.length === 0 ? (
              <div className="text-center py-10 opacity-50 text-sm">A fila está vazia.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {scheduledPosts.map(p => (
                  <div key={p.id} className="p-4 rounded-xl bg-black/20 border border-white/5 flex flex-col sm:flex-row justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-white text-sm">{p.date.split('-').reverse().join('/')}</span>
                        <span className="text-sm text-slate-400">{p.time}</span>
                      </div>
                      <div className="text-sm text-slate-300 line-clamp-2 pr-4">{p.content}</div>
                    </div>
                    <div className="flex sm:flex-col items-end justify-between gap-2">
                      <div className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-lg border border-blue-500/20 uppercase">
                        {p.status}
                      </div>
                      <div className="flex gap-1">
                        {p.platforms.map(pid => (
                          <div key={pid} className="w-6 h-6 rounded bg-white/10 flex items-center justify-center">
                             {PLATFORMS.find(pl => pl.id === pid)?.icon || '?'}
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
