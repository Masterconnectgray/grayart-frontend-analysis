import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
import { PlatformIcon } from '../constants/SocialIcons';
import { isFlowConfigured, getStats } from '../services/FlowAPIService';

interface PlatformMonitorProps {
  division: Division;
}

type ServiceStatus = 'online' | 'degraded' | 'offline' | 'checking';

interface ServiceHealth {
  name: string;
  url: string;
  status: ServiceStatus;
  latency: number | null;
  lastCheck: Date | null;
  description: string;
  icon: string;
}

interface ActivityLog {
  id: number;
  timestamp: Date;
  service: string;
  action: string;
  detail: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface UsageMetrics {
  postsToday: number;
  videosGenerated: number;
  whatsappMessages: number;
  apiCalls: number;
  scheduledPending: number;
  errorsToday: number;
}

interface Alert {
  id: number;
  timestamp: Date;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  dismissed: boolean;
}

interface PlatformMetrics {
  platform: string;
  platformId: string;
  color: string;
  followers: string;
  reach: string;
  engagement: string;
  views: string;
  status: 'online' | 'sync' | 'alert';
}

const DIVISION_METRICS: Record<Division, PlatformMetrics[]> = {
  'connect-gray': [
    { platform: 'Instagram', platformId: 'instagram', color: '#E4405F', followers: '12.4k', reach: '45.2k', engagement: '3.8%', views: '89k', status: 'online' },
    { platform: 'Facebook', platformId: 'facebook', color: '#1877F2', followers: '8.1k', reach: '22.3k', engagement: '2.1%', views: '34k', status: 'online' },
    { platform: 'LinkedIn', platformId: 'linkedin', color: '#0A66C2', followers: '3.2k', reach: '8.7k', engagement: '4.2%', views: '12k', status: 'online' },
    { platform: 'WhatsApp', platformId: 'whatsapp', color: '#25D366', followers: '470', reach: '1.4k', engagement: '--', views: '850', status: 'sync' },
  ],
  'gray-up': [
    { platform: 'Instagram', platformId: 'instagram', color: '#E4405F', followers: '8.2k', reach: '28.7k', engagement: '2.9%', views: '56k', status: 'online' },
    { platform: 'Facebook', platformId: 'facebook', color: '#1877F2', followers: '5.4k', reach: '15.8k', engagement: '1.8%', views: '23k', status: 'online' },
    { platform: 'WhatsApp', platformId: 'whatsapp', color: '#25D366', followers: '297', reach: '480', engagement: '--', views: '420', status: 'online' },
  ],
  'gray-up-flow': [
    { platform: 'LinkedIn', platformId: 'linkedin', color: '#0A66C2', followers: '4.5k', reach: '12.8k', engagement: '5.1%', views: '18k', status: 'online' },
    { platform: 'Instagram', platformId: 'instagram', color: '#E4405F', followers: '3.1k', reach: '15.4k', engagement: '4.5%', views: '28k', status: 'online' },
    { platform: 'TikTok', platformId: 'tiktok', color: '#000000', followers: '890', reach: '22.1k', engagement: '6.2%', views: '45k', status: 'sync' },
  ],
  'gray-art': [
    { platform: 'Instagram', platformId: 'instagram', color: '#E4405F', followers: '15.8k', reach: '62.8k', engagement: '5.2%', views: '120k', status: 'online' },
    { platform: 'TikTok', platformId: 'tiktok', color: '#000000', followers: '9.2k', reach: '85.4k', engagement: '7.1%', views: '210k', status: 'online' },
    { platform: 'Pinterest', platformId: 'pinterest', color: '#E60023', followers: '6.7k', reach: '34.2k', engagement: '3.8%', views: '48k', status: 'sync' },
  ],
};

// Services to monitor
const MONITORED_SERVICES: Omit<ServiceHealth, 'status' | 'latency' | 'lastCheck'>[] = [
  { name: 'Flow API', url: '/flow', description: 'Backend principal - agendamento, publicacao, stats', icon: '🔗' },
  { name: 'Evolution API', url: '/evolution', description: 'WhatsApp Business - mensagens e broadcasts', icon: '📱' },
  { name: 'Gemini API', url: '/gemini', description: 'Google Gemini - geracao de texto IA', icon: '✨' },
  { name: 'Veo 3', url: '/veo', description: 'Google Veo 3 - geracao de video IA', icon: '🎬' },
];

const PlatformMonitor: React.FC<PlatformMonitorProps> = ({ division }) => {
  const isDark = division !== 'gray-art';
  const theme = DIVISIONS[division];
  const metrics = DIVISION_METRICS[division];

  const [activeSection, setActiveSection] = useState<'status' | 'metrics' | 'logs' | 'alerts'>('status');
  const [services, setServices] = useState<ServiceHealth[]>(
    MONITORED_SERVICES.map(s => ({ ...s, status: 'checking' as ServiceStatus, latency: null, lastCheck: null }))
  );
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics>({
    postsToday: 0, videosGenerated: 0, whatsappMessages: 0,
    apiCalls: 0, scheduledPending: 0, errorsToday: 0,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cardBg = isDark ? '#1e1e1e' : '#fff';
  const cardText = isDark ? '#fff' : '#1a1a1a';
  const subBg = isDark ? '#2d2d2d' : '#f0f2f5';

  const addLog = useCallback((service: string, action: string, detail: string, type: ActivityLog['type']) => {
    setLogs(prev => [{
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      service,
      action,
      detail,
      type,
    }, ...prev].slice(0, 50));
  }, []);

  // Check a single service health
  const checkService = useCallback(async (service: Omit<ServiceHealth, 'status' | 'latency' | 'lastCheck'>): Promise<ServiceHealth> => {
    const start = performance.now();
    try {
      const flowUrl = import.meta.env.VITE_FLOW_API_URL || '';
      if (!flowUrl) {
        return { ...service, status: 'offline', latency: null, lastCheck: new Date() };
      }

      let endpoint = '';
      if (service.name === 'Flow API') {
        endpoint = `${flowUrl}/flow/grayart/stats`;
      } else if (service.name === 'Evolution API') {
        endpoint = `${flowUrl}/flow/grayart/health/evolution`;
      } else if (service.name === 'Gemini API') {
        endpoint = `${flowUrl}/flow/grayart/health/gemini`;
      } else if (service.name === 'Veo 3') {
        endpoint = `${flowUrl}/flow/grayart/health/veo`;
      }

      if (!endpoint) {
        return { ...service, status: 'offline', latency: null, lastCheck: new Date() };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const resp = await fetch(endpoint, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      });
      clearTimeout(timeoutId);

      const latency = Math.round(performance.now() - start);
      const status: ServiceStatus = resp.ok ? (latency > 2000 ? 'degraded' : 'online') : 'degraded';

      return { ...service, status, latency, lastCheck: new Date() };
    } catch {
      const latency = Math.round(performance.now() - start);
      return { ...service, status: 'offline', latency: latency > 4500 ? null : latency, lastCheck: new Date() };
    }
  }, []);

  // Full health check
  const runHealthCheck = useCallback(async () => {
    setIsRefreshing(true);
    addLog('Monitor', 'Health Check', 'Verificando status de todos os servicos...', 'info');

    const results = await Promise.all(MONITORED_SERVICES.map(s => checkService(s)));
    setServices(results);

    // Generate alerts based on results
    const newAlerts: Alert[] = [];
    results.forEach(s => {
      if (s.status === 'offline') {
        newAlerts.push({
          id: Date.now() + Math.random(),
          timestamp: new Date(),
          severity: 'critical',
          title: `${s.name} OFFLINE`,
          message: `O servico ${s.name} nao esta respondendo. Verifique o servidor.`,
          dismissed: false,
        });
        addLog(s.name, 'Offline', `Servico nao respondeu ao health check`, 'error');
      } else if (s.status === 'degraded') {
        newAlerts.push({
          id: Date.now() + Math.random(),
          timestamp: new Date(),
          severity: 'warning',
          title: `${s.name} Lento`,
          message: `Latencia de ${s.latency}ms detectada. Performance degradada.`,
          dismissed: false,
        });
        addLog(s.name, 'Degradado', `Latencia: ${s.latency}ms`, 'warning');
      } else {
        addLog(s.name, 'Online', `OK - ${s.latency}ms`, 'success');
      }
    });

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 20));
    }

    // Fetch real stats if Flow is configured
    if (isFlowConfigured()) {
      try {
        const stats = await getStats(division);
        setUsageMetrics(prev => ({
          ...prev,
          postsToday: stats.posts || stats.totalPosts || 0,
          videosGenerated: stats.videos || stats.totalVideos || 0,
          scheduledPending: stats.scheduledPending || 0,
        }));
        addLog('Flow API', 'Stats', `Posts: ${stats.totalPosts}, Videos: ${stats.totalVideos}`, 'success');
      } catch {
        addLog('Flow API', 'Stats Error', 'Nao foi possivel carregar metricas', 'error');
      }
    }

    setLastRefresh(new Date());
    setCountdown(30);
    setIsRefreshing(false);
  }, [addLog, checkService, division]);

  // Initial check + auto-refresh every 30s
  useEffect(() => {
    const initialCheck = setTimeout(() => runHealthCheck(), 0);

    refreshTimerRef.current = setInterval(() => {
      runHealthCheck();
    }, 30000);

    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 30 : prev - 1));
    }, 1000);

    return () => {
      clearTimeout(initialCheck);
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [division, runHealthCheck]);

  // Simulated activity logs
  useEffect(() => {
    const interval = setInterval(() => {
      const platforms = metrics.map(m => m.platform);
      const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)];
      const actions = [
        { action: 'Novo Seguidor', detail: '+1 seguidor organico', type: 'success' as const },
        { action: 'Comentario', detail: 'Novo comentario no ultimo post', type: 'info' as const },
        { action: 'Compartilhamento', detail: 'Post compartilhado por usuario', type: 'success' as const },
        { action: 'Like', detail: '+1 curtida', type: 'info' as const },
        { action: 'Visualizacao', detail: '+25 views no story/reel', type: 'info' as const },
      ];
      const action = actions[Math.floor(Math.random() * actions.length)];
      addLog(randomPlatform, action.action, action.detail, action.type);
    }, 6000);

    return () => clearInterval(interval);
  }, [division, metrics, addLog]);

  const onlineCount = services.filter(s => s.status === 'online').length;
  const degradedCount = services.filter(s => s.status === 'degraded').length;
  const offlineCount = services.filter(s => s.status === 'offline').length;
  const overallStatus: ServiceStatus = offlineCount > 0 ? 'offline' : degradedCount > 0 ? 'degraded' : 'online';
  const undismissedAlerts = alerts.filter(a => !a.dismissed);
  const criticalAlerts = undismissedAlerts.filter(a => a.severity === 'critical');

  const statusColor = (s: ServiceStatus) => s === 'online' ? '#22c55e' : s === 'degraded' ? '#f59e0b' : s === 'checking' ? '#3b82f6' : '#ef4444';
  const statusLabel = (s: ServiceStatus) => s === 'online' ? 'ONLINE' : s === 'degraded' ? 'DEGRADADO' : s === 'checking' ? 'VERIFICANDO' : 'OFFLINE';

  const formatTime = (date: Date) => {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const dismissAlert = (id: number) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a));
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>
            Monitor <span style={{ color: theme.colors.primary }}>de Plataformas</span>
          </h2>
          <p style={{ fontSize: '0.75rem', opacity: 0.5, fontWeight: 700, marginTop: '0.2rem' }}>
            STATUS DAS APIs E METRICAS DE USO
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          {/* Overall status indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem', borderRadius: '12px',
            background: `${statusColor(overallStatus)}15`,
            border: `1px solid ${statusColor(overallStatus)}33`,
          }}>
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: statusColor(overallStatus),
              boxShadow: `0 0 10px ${statusColor(overallStatus)}aa`,
              animation: overallStatus === 'online' ? 'pulse-dot 2s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: statusColor(overallStatus) }}>
              {overallStatus === 'online' ? 'TODOS ONLINE' : overallStatus === 'degraded' ? 'PERFORMANCE DEGRADADA' : 'SERVICOS OFFLINE'}
            </span>
          </div>
          {/* Refresh button */}
          <button
            onClick={() => { setCountdown(30); runHealthCheck(); }}
            disabled={isRefreshing}
            style={{
              padding: '0.5rem 1rem', borderRadius: '10px',
              background: subBg, border: 'none', color: cardText,
              fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              opacity: isRefreshing ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}
            >
              <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            {countdown}s
          </button>
        </div>
      </div>

      {/* Critical alerts banner */}
      {criticalAlerts.length > 0 && (
        <div style={{
          padding: '0.8rem 1.2rem', borderRadius: '12px', marginBottom: '1.2rem',
          background: '#ef444418', border: '1px solid #ef444444',
          display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap',
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%', background: '#ef4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: '0.9rem', flexShrink: 0,
          }}>!</div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#ef4444' }}>
              {criticalAlerts.length} ALERTA{criticalAlerts.length > 1 ? 'S' : ''} CRITICO{criticalAlerts.length > 1 ? 'S' : ''}
            </div>
            <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>
              {criticalAlerts.map(a => a.title).join(' | ')}
            </div>
          </div>
          <button
            onClick={() => setActiveSection('alerts')}
            style={{
              padding: '0.4rem 0.8rem', borderRadius: '8px',
              background: '#ef4444', color: '#fff', fontWeight: 800,
              fontSize: '0.7rem', cursor: 'pointer',
            }}
          >VER ALERTAS</button>
        </div>
      )}

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: subBg, padding: '0.3rem', borderRadius: '12px', width: 'fit-content', flexWrap: 'wrap' }}>
        {[
          { key: 'status' as const, label: 'Status APIs' },
          { key: 'metrics' as const, label: 'Metricas' },
          { key: 'logs' as const, label: `Logs (${logs.length})` },
          { key: 'alerts' as const, label: `Alertas${undismissedAlerts.length > 0 ? ` (${undismissedAlerts.length})` : ''}` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            style={{
              padding: '0.6rem 1.2rem', borderRadius: '10px',
              backgroundColor: activeSection === tab.key ? theme.colors.primary : 'transparent',
              color: activeSection === tab.key ? '#fff' : (isDark ? '#666' : '#999'),
              fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.3s',
              position: 'relative',
            }}
          >
            {tab.label}
            {tab.key === 'alerts' && undismissedAlerts.length > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#ef4444',
              }} />
            )}
          </button>
        ))}
      </div>

      {/* ===== STATUS APIs ===== */}
      {activeSection === 'status' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* API Service Cards */}
          <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, opacity: 0.4 }}>STATUS DAS APIs</h3>
              <div style={{ fontSize: '0.6rem', opacity: 0.3, fontWeight: 700 }}>
                Ultima verificacao: {formatTime(lastRefresh)}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {services.map((s, i) => (
                <div key={i} style={{
                  padding: '1rem', borderRadius: '16px', background: subBg,
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  borderLeft: `4px solid ${statusColor(s.status)}`,
                  transition: 'all 0.3s',
                }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: `${statusColor(s.status)}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: '1rem', color: statusColor(s.status),
                  }}>{s.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '0.15rem' }}>{s.description}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      padding: '0.3rem 0.7rem', borderRadius: '8px', fontSize: '0.6rem', fontWeight: 900,
                      background: `${statusColor(s.status)}15`,
                      color: statusColor(s.status),
                      marginBottom: '0.2rem',
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                    }}>
                      <div style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: statusColor(s.status),
                      }} />
                      {statusLabel(s.status)}
                    </div>
                    {s.latency !== null && (
                      <div style={{ fontSize: '0.55rem', opacity: 0.4, fontWeight: 700 }}>
                        {s.latency}ms
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Uptime summary */}
            <div style={{
              marginTop: '1.2rem', padding: '1rem', borderRadius: '12px',
              background: `${theme.colors.primary}08`, border: `1px solid ${theme.colors.primary}22`,
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.5, marginBottom: '0.6rem' }}>RESUMO DE UPTIME</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#22c55e' }}>{onlineCount}</div>
                  <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>Online</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f59e0b' }}>{degradedCount}</div>
                  <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>Degradado</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ef4444' }}>{offlineCount}</div>
                  <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>Offline</div>
                </div>
              </div>
            </div>
          </div>

          {/* Social Network Status */}
          <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem', opacity: 0.4 }}>STATUS DAS REDES SOCIAIS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {metrics.map((m, i) => (
                <div key={i} style={{
                  padding: '1rem', borderRadius: '16px', background: subBg,
                  display: 'flex', alignItems: 'center', gap: '1rem',
                }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <PlatformIcon platformId={m.platformId} size={40} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{m.platform}</div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '0.55rem', opacity: 0.4, fontWeight: 700 }}>SEGUIDORES</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{m.followers}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.55rem', opacity: 0.4, fontWeight: 700 }}>ALCANCE</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{m.reach}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.55rem', opacity: 0.4, fontWeight: 700 }}>ENGAJAMENTO</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: theme.colors.primary }}>{m.engagement}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.55rem', opacity: 0.4, fontWeight: 700 }}>VIEWS</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{m.views}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{
                    padding: '0.3rem 0.6rem', borderRadius: '8px', fontSize: '0.6rem', fontWeight: 900,
                    background: m.status === 'online' ? '#22c55e15' : m.status === 'sync' ? '#3b82f615' : '#ef444415',
                    color: m.status === 'online' ? '#22c55e' : m.status === 'sync' ? '#3b82f6' : '#ef4444',
                  }}>
                    {m.status === 'online' ? 'ATIVO' : m.status === 'sync' ? 'SYNC' : 'ALERTA'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== METRICAS DE USO ===== */}
      {activeSection === 'metrics' && (
        <div>
          {/* Metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Posts Hoje', value: usageMetrics.postsToday, color: theme.colors.primary, icon: 'P' },
              { label: 'Videos Gerados', value: usageMetrics.videosGenerated, color: '#8b5cf6', icon: 'V' },
              { label: 'Msgs WhatsApp', value: usageMetrics.whatsappMessages, color: '#25D366', icon: 'W' },
              { label: 'Agendados', value: usageMetrics.scheduledPending, color: '#3b82f6', icon: 'A' },
              { label: 'Chamadas API', value: usageMetrics.apiCalls, color: '#f59e0b', icon: 'C' },
              { label: 'Erros Hoje', value: usageMetrics.errorsToday, color: '#ef4444', icon: '!' },
            ].map((metric, i) => (
              <div key={i} className="premium-card" style={{
                backgroundColor: cardBg, color: cardText, padding: '1.2rem',
                borderTop: `3px solid ${metric.color}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.5, textTransform: 'uppercase' }}>{metric.label}</div>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    background: `${metric.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: '0.7rem', color: metric.color,
                  }}>{metric.icon}</div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: metric.color }}>{metric.value}</div>
              </div>
            ))}
          </div>

          {/* Social platform detailed metrics */}
          <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem', opacity: 0.4 }}>METRICAS POR REDE SOCIAL</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    {['Rede', 'Seguidores', 'Alcance', 'Engajamento', 'Views', 'Status'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '0.8rem 1rem',
                        fontSize: '0.65rem', fontWeight: 800, opacity: 0.4, textTransform: 'uppercase',
                        borderBottom: `1px solid ${isDark ? '#333' : '#eee'}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${isDark ? '#2a2a2a' : '#f0f0f0'}` }}>
                      <td style={{ padding: '0.8rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <PlatformIcon platformId={m.platformId} size={24} />
                          <span style={{ fontWeight: 700 }}>{m.platform}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 800 }}>{m.followers}</td>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 700 }}>{m.reach}</td>
                      <td style={{ padding: '0.8rem 1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem', borderRadius: '6px',
                          background: `${theme.colors.primary}18`, color: theme.colors.primary,
                          fontWeight: 800, fontSize: '0.75rem',
                        }}>{m.engagement}</span>
                      </td>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 700 }}>{m.views}</td>
                      <td style={{ padding: '0.8rem 1rem' }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          padding: '0.2rem 0.5rem', borderRadius: '6px',
                          background: m.status === 'online' ? '#22c55e15' : '#3b82f615',
                          color: m.status === 'online' ? '#22c55e' : '#3b82f6',
                          fontSize: '0.65rem', fontWeight: 800,
                        }}>
                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }} />
                          {m.status === 'online' ? 'ATIVO' : 'SYNC'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== LOGS ===== */}
      {activeSection === 'logs' && (
        <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, opacity: 0.4 }}>LOG DE ATIVIDADES</h3>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', animation: 'pulse-dot 2s ease-in-out infinite' }} />
              <span style={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: 700 }}>AO VIVO</span>
              <button
                onClick={() => setLogs([])}
                style={{
                  padding: '0.3rem 0.6rem', borderRadius: '6px', background: subBg,
                  fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer', border: 'none', color: cardText, opacity: 0.5,
                }}
              >LIMPAR</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '500px', overflowY: 'auto' }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.3, fontSize: '0.85rem' }}>
                Aguardando atividades...
              </div>
            ) : logs.map((log) => {
              const typeColors = { success: '#22c55e', info: '#3b82f6', warning: '#f59e0b', error: '#ef4444' };
              return (
                <div key={log.id} className="animate-fade-in" style={{
                  padding: '0.6rem 0.8rem', borderRadius: '8px', background: subBg,
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  borderLeft: `3px solid ${typeColors[log.type]}`,
                  fontSize: '0.75rem',
                }}>
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 800, opacity: 0.4, minWidth: '55px',
                    fontFamily: 'monospace',
                  }}>
                    {formatTime(log.timestamp)}
                  </span>
                  <span style={{
                    padding: '0.1rem 0.4rem', borderRadius: '4px',
                    background: `${typeColors[log.type]}18`, color: typeColors[log.type],
                    fontSize: '0.55rem', fontWeight: 800, minWidth: '40px', textAlign: 'center',
                  }}>
                    {log.type === 'success' ? 'OK' : log.type === 'info' ? 'INFO' : log.type === 'warning' ? 'WARN' : 'ERR'}
                  </span>
                  <span style={{ fontWeight: 800, minWidth: '80px' }}>{log.service}</span>
                  <span style={{ fontWeight: 700, color: theme.colors.primary }}>{log.action}</span>
                  <span style={{ opacity: 0.5, flex: 1, textAlign: 'right', fontSize: '0.7rem' }}>{log.detail}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== ALERTAS ===== */}
      {activeSection === 'alerts' && (
        <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, opacity: 0.4 }}>ALERTAS E NOTIFICACOES</h3>
            {undismissedAlerts.length > 0 && (
              <button
                onClick={() => setAlerts(prev => prev.map(a => ({ ...a, dismissed: true })))}
                style={{
                  padding: '0.4rem 0.8rem', borderRadius: '8px', background: subBg,
                  fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', border: 'none', color: cardText,
                }}
              >DISPENSAR TODOS</button>
            )}
          </div>

          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.8rem', opacity: 0.2 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, opacity: 0.3 }}>Nenhum alerta ativo</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.2, marginTop: '0.3rem' }}>Todos os servicos estao operando normalmente</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {alerts.map(alert => {
                const sevColors = { info: '#3b82f6', warning: '#f59e0b', critical: '#ef4444' };
                const sevColor = sevColors[alert.severity];
                return (
                  <div key={alert.id} style={{
                    padding: '1rem', borderRadius: '12px', background: subBg,
                    borderLeft: `4px solid ${sevColor}`,
                    opacity: alert.dismissed ? 0.4 : 1,
                    transition: 'opacity 0.3s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                          <span style={{
                            padding: '0.15rem 0.5rem', borderRadius: '4px',
                            background: `${sevColor}18`, color: sevColor,
                            fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase',
                          }}>
                            {alert.severity === 'critical' ? 'CRITICO' : alert.severity === 'warning' ? 'AVISO' : 'INFO'}
                          </span>
                          <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{alert.title}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{alert.message}</div>
                        <div style={{ fontSize: '0.6rem', opacity: 0.3, marginTop: '0.3rem' }}>
                          {formatTime(alert.timestamp)}
                        </div>
                      </div>
                      {!alert.dismissed && (
                        <button
                          onClick={() => dismissAlert(alert.id)}
                          style={{
                            padding: '0.3rem 0.6rem', borderRadius: '6px',
                            background: 'transparent', border: `1px solid ${isDark ? '#444' : '#ddd'}`,
                            fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer', color: cardText, opacity: 0.5,
                          }}
                        >DISPENSAR</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PlatformMonitor;
