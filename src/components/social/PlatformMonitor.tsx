import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Division } from '../../constants/Themes';
import { PlatformIcon } from '../../constants/SocialIcons';
import { isFlowConfigured, getStats } from '../../services/FlowAPIService';
import { Card } from '../../design-system';
import { RefreshCcw, AlertTriangle } from 'lucide-react';
import { bffFetch } from '../../services/BFFClient';
import { fetchConnectedAccounts, type ConnectedAccount } from '../../services/SocialOAuthService';
import { useAppContext } from '../../context/AppContext';

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

// Log activities are now handled by AppContext

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

// DIVISION_METRICS removed in favor of real connected accounts

const MONITORED_SERVICES: Omit<ServiceHealth, 'status' | 'latency' | 'lastCheck'>[] = [
  { name: 'Flow API', url: '/flow', description: 'Backend principal - agendamento, publicacao, stats', icon: '🔗' },
  { name: 'Evolution API', url: '/evolution', description: 'WhatsApp Business - mensagens e broadcasts', icon: '📱' },
  { name: 'Evolution Baileys', url: '/evolution', description: 'WhatsApp Web emulation - Docker container', icon: '🐋' },
  { name: 'Gemini API', url: '/gemini', description: 'Google Gemini - geracao de texto IA', icon: '✨' },
  { name: 'Veo 3', url: '/veo', description: 'Google Veo 3 - geracao de video IA', icon: '🎬' },
  { name: 'GrayArt AI Service', url: '/ai-service', description: 'Kokoro TTS + MoonDream3 - porta 3066', icon: '🧠' },
];

const STATUS_VARIANTS = {
  online: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30', hex: '#22c55e', label: 'ONLINE' },
  degraded: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30', hex: '#f59e0b', label: 'DEGRADADO' },
  offline: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30', hex: '#ef4444', label: 'OFFLINE' },
  checking: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30', hex: '#3b82f6', label: 'VERIFICANDO' },
};

const PlatformMonitor: React.FC<PlatformMonitorProps> = ({ division }) => {
  const { activityLogs, clearActivityLogs, stats } = useAppContext();
  const [activeSection, setActiveSection] = useState<'status' | 'metrics' | 'logs' | 'alerts'>('status');
  const [services, setServices] = useState<ServiceHealth[]>(
    MONITORED_SERVICES.map(s => ({ ...s, status: 'checking', latency: null, lastCheck: null }))
  );
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
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

  const checkService = useCallback(async (service: Omit<ServiceHealth, 'status' | 'latency' | 'lastCheck'>): Promise<ServiceHealth> => {
    const start = performance.now();
    try {
      let response: Response;
      if (service.name === 'Flow API') response = await bffFetch('/flow/health/flow');
      else if (service.name === 'Evolution API') response = await bffFetch('/flow/health/evolution');
      else if (service.name === 'Gemini API') response = await bffFetch('/flow/health/gemini');
      else if (service.name === 'Veo 3') response = await bffFetch('/flow/health/veo');
      else response = await bffFetch('/flow/health/flow');

      const latency = Math.round(performance.now() - start);
      const status: ServiceStatus = response.ok ? (latency > 2000 ? 'degraded' : 'online') : 'degraded';

      return { ...service, status, latency, lastCheck: new Date() };
    } catch {
      const latency = Math.round(performance.now() - start);
      return { ...service, status: 'offline', latency: latency > 4500 ? null : latency, lastCheck: new Date() };
    }
  }, []);

  const runHealthCheck = useCallback(async () => {
    setIsRefreshing(true);

    const results = await Promise.all(MONITORED_SERVICES.map(s => checkService(s)));
    setServices(results);

    const newAlerts: Alert[] = [];
    results.forEach(s => {
      if (s.status === 'offline') {
        newAlerts.push({
          id: Date.now() + Math.random(),
          timestamp: new Date(),
          severity: 'critical',
          title: `${s.name} OFFLINE`,
          message: `O serviço ${s.name} não está respondendo. Verifique o servidor.`,
          dismissed: false,
        });
      } else if (s.status === 'degraded') {
        newAlerts.push({
          id: Date.now() + Math.random(),
          timestamp: new Date(),
          severity: 'warning',
          title: `${s.name} Lento`,
          message: `Latência de ${s.latency}ms detectada. Performance degradada.`,
          dismissed: false,
        });
      }
    });

    if (newAlerts.length > 0) setAlerts(prev => [...newAlerts, ...prev].slice(0, 20));

    if (isFlowConfigured()) {
      try {
        const statsData = await getStats(division);
        setUsageMetrics(prev => ({
          ...prev,
          postsToday: statsData.posts || statsData.totalPosts || 0,
          videosGenerated: statsData.videos || statsData.totalVideos || 0,
          scheduledPending: statsData.scheduledPending || 0,
        }));
      } catch {
        // Silent catch for stats error
      }
    }

    try {
      const accounts = await fetchConnectedAccounts();
      setConnectedAccounts(accounts);
    } catch {
      // Silent catch
    }

    setLastRefresh(new Date());
    setCountdown(30);
    setIsRefreshing(false);
  }, [checkService, division]);

  useEffect(() => {
    const initialCheck = setTimeout(() => runHealthCheck(), 0);
    refreshTimerRef.current = setInterval(() => runHealthCheck(), 30000);
    countdownRef.current = setInterval(() => setCountdown(prev => (prev <= 1 ? 30 : prev - 1)), 1000);

    return () => {
      clearTimeout(initialCheck);
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [runHealthCheck]);

  const onlineCount = services.filter(s => s.status === 'online').length;
  const degradedCount = services.filter(s => s.status === 'degraded').length;
  const offlineCount = services.filter(s => s.status === 'offline').length;
  const overallStatus: ServiceStatus = offlineCount > 0 ? 'offline' : degradedCount > 0 ? 'degraded' : 'online';
  const undismissedAlerts = alerts.filter(a => !a.dismissed);
  const criticalAlerts = undismissedAlerts.filter(a => a.severity === 'critical');

  const formatTime = (date: Date) => {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const dismissAlert = (id: number) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a));

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black mb-1">
            Monitor <span className="text-[var(--primary-color)]">de Plataformas</span>
          </h2>
          <p className="text-xs font-bold opacity-60 m-0 uppercase tracking-widest">
            STATUS DAS APIs E MÉTRICAS DE USO
          </p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${STATUS_VARIANTS[overallStatus].bg} ${STATUS_VARIANTS[overallStatus].border}`}>
            <div className={`w-2.5 h-2.5 rounded-full ${overallStatus === 'online' ? 'animate-pulse' : ''}`} style={{ backgroundColor: STATUS_VARIANTS[overallStatus].hex, boxShadow: `0 0 10px ${STATUS_VARIANTS[overallStatus].hex}` }} />
            <span className={`text-[10px] sm:text-xs font-black uppercase ${STATUS_VARIANTS[overallStatus].text}`}>
              {overallStatus === 'online' ? 'TODOS O.K.' : overallStatus === 'degraded' ? 'PERFORMANCE DEGRADADA' : 'SERVIÇOS OFFLINE'}
            </span>
          </div>
          <button
            onClick={() => { setCountdown(30); runHealthCheck(); }}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--sub-bg)] text-[var(--card-text)] text-xs font-bold hover:brightness-110 disabled:opacity-50 transition-all border border-transparent shadow-sm"
          >
            <RefreshCcw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            {countdown}s
          </button>
        </div>
      </div>

      {criticalAlerts.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl mb-6 bg-red-500/10 border border-red-500/30 text-red-500 animate-in slide-in-from-top-4">
          <div className="w-8 h-8 shrink-0 rounded-full bg-red-500 text-white flex items-center justify-center font-black">
            <AlertTriangle size={16} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="font-black text-sm uppercase tracking-wide">
              {criticalAlerts.length} ALERTA{criticalAlerts.length > 1 ? 'S' : ''} CRÍTICO{criticalAlerts.length > 1 ? 'S' : ''}
            </div>
            <div className="text-xs font-medium opacity-80 mt-0.5">
              {criticalAlerts.map(a => a.title).join(' • ')}
            </div>
          </div>
          <button
            onClick={() => setActiveSection('alerts')}
            className="px-4 py-2 rounded-xl bg-red-500 text-white font-black text-xs hover:bg-red-600 transition-colors shadow-md shadow-red-500/20"
          >
            VER ALERTAS
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-6 bg-[var(--sub-bg)] p-1.5 rounded-xl w-fit overflow-x-auto max-w-full relative">
        {[
          { key: 'status' as const, label: 'Status APIs' },
          { key: 'metrics' as const, label: 'Métricas' },
          { key: 'logs' as const, label: `Logs (${activityLogs.length})` },
          { key: 'alerts' as const, label: `Alertas${undismissedAlerts.length > 0 ? ` (${undismissedAlerts.length})` : ''}` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className={`relative px-5 py-2.5 rounded-lg font-bold text-sm whitespace-nowrap transition-all duration-300
              ${activeSection === tab.key ? 'bg-[var(--primary-color)] text-[var(--card-bg)] shadow-md' : 'text-slate-400 hover:text-[var(--card-text)]'}`}
          >
            {tab.label}
            {tab.key === 'alerts' && undismissedAlerts.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-[var(--sub-bg)]" />
            )}
          </button>
        ))}
      </div>

      {activeSection === 'status' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6 animate-in slide-in-from-bottom-4 duration-300">
          <Card className="flex flex-col gap-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-black text-xs opacity-60 tracking-widest uppercase">Status das APIs</h3>
              <div className="text-[10px] font-bold opacity-40">Verificado: {formatTime(lastRefresh)}</div>
            </div>
            <div className="flex flex-col gap-3">
              {services.map((s, i) => {
                const variant = STATUS_VARIANTS[s.status];
                return (
                  <div key={i} className={`p-4 rounded-2xl bg-[var(--sub-bg)] flex items-center gap-4 border-l-4 ${variant.border} hover:translate-x-1 transition-transform`}>
                    <div className={`w-12 h-12 shrink-0 rounded-xl ${variant.bg} ${variant.text} flex items-center justify-center text-xl`}>
                      {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-sm truncate">{s.name}</div>
                      <div className="text-[10px] opacity-60 font-bold truncate mt-0.5">{s.description}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider mb-1 ${variant.bg} ${variant.text}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        {variant.label}
                      </div>
                      {s.latency !== null && (
                        <div className="text-[10px] font-bold opacity-40">{s.latency}ms</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={`mt-2 p-4 rounded-xl border bg-slate-500/5 border-white/10 dark:border-black/5`}>
              <div className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-3">Resumo de Uptime</div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-black text-emerald-500 leading-none mb-1">{onlineCount}</div>
                  <div className="text-[10px] font-bold opacity-60 uppercase">Online</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-amber-500 leading-none mb-1">{degradedCount}</div>
                  <div className="text-[10px] font-bold opacity-60 uppercase">Degradado</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-red-500 leading-none mb-1">{offlineCount}</div>
                  <div className="text-[10px] font-bold opacity-60 uppercase">Offline</div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col gap-4">
            <h3 className="font-black text-xs opacity-60 tracking-widest uppercase mb-2">Status das Redes Sociais</h3>
            <div className="flex flex-col gap-3">
              {connectedAccounts.length === 0 ? (
                <div className="text-center py-6 opacity-40 font-bold text-sm">Nenhuma rede conectada.</div>
              ) : connectedAccounts.map((m, i) => (
                <div key={i} className="p-4 rounded-2xl bg-[var(--sub-bg)] flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center overflow-hidden">
                       <PlatformIcon platformId={m.platform} size={40} />
                     </div>
                     <div className="font-black text-base truncate max-w-[120px]">{m.name}</div>
                  </div>
                  <div className="flex-1 grid grid-cols-4 gap-2 text-center items-center">
                    <div>
                      <div className="text-[9px] sm:text-[10px] opacity-50 font-black uppercase mb-0.5">Seg.</div>
                      <div className="text-xs sm:text-sm font-black">{m.followers.toLocaleString('pt-BR')}</div>
                    </div>
                    <div>
                      <div className="text-[9px] sm:text-[10px] opacity-50 font-black uppercase mb-0.5">Alcance</div>
                      <div className="text-xs sm:text-sm font-black">-</div>
                    </div>
                    <div>
                      <div className="text-[9px] sm:text-[10px] opacity-50 font-black uppercase mb-0.5 text-[var(--primary-color)]">Eng.</div>
                      <div className="text-xs sm:text-sm font-black text-[var(--primary-color)]">-</div>
                    </div>
                    <div>
                      <div className="text-[9px] sm:text-[10px] opacity-50 font-black uppercase mb-0.5">Views</div>
                      <div className="text-xs sm:text-sm font-black">-</div>
                    </div>
                  </div>
                  <div className="shrink-0 flex justify-end">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black
                       ${m.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {m.status === 'active' ? 'ATIVO' : 'ALERTA'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeSection === 'metrics' && (
        <div className="animate-in slide-in-from-bottom-4 duration-300">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {[
              { label: 'Posts Hoje', value: Math.max(stats.postsPublished, usageMetrics.postsToday), color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500', icon: '📝' },
              { label: 'Vídeos', value: Math.max(stats.videosCreated, usageMetrics.videosGenerated), color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500', icon: '🎬' },
              { label: 'Msgs WPP', value: stats.tasksCompleted, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500', icon: '💬' },
              { label: 'Agendados', value: usageMetrics.scheduledPending, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500', icon: '🕒' },
              { label: 'APIs', value: usageMetrics.apiCalls + (activityLogs.length * 2), color: 'text-[var(--primary-color)]', bg: 'bg-[var(--primary-color)]/10', border: 'border-[var(--primary-color)]', icon: '⚡' },
              { label: 'Erros', value: usageMetrics.errorsToday, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500', icon: '❌' },
            ].map((metric, i) => (
              <Card key={i} className={`border-b-4 ${metric.border} !p-4`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="text-[9px] font-black opacity-60 uppercase tracking-widest max-w-[60%]">{metric.label}</div>
                  <div className={`w-6 h-6 rounded-md ${metric.bg} flex items-center justify-center text-[10px]`}>{metric.icon}</div>
                </div>
                <div className={`text-2xl font-black ${metric.color}`}>{metric.value}</div>
              </Card>
            ))}
          </div>

          <Card>
            <h3 className="font-black text-xs opacity-60 tracking-widest uppercase mb-4">Métricas Detalhadas por Rede</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-[var(--sub-bg)] text-[10px] uppercase tracking-widest opacity-60 font-black">
                    <th className="pb-3 pr-4">Rede</th>
                    <th className="pb-3 px-4">Seguidores</th>
                    <th className="pb-3 px-4">Alcance</th>
                    <th className="pb-3 px-4">Engajamento</th>
                    <th className="pb-3 px-4">Views</th>
                    <th className="pb-3 pl-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--sub-bg)]">
                  {connectedAccounts.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center opacity-40 font-bold">Nenhuma rede ativa para detalhamento.</td></tr>
                  ) : connectedAccounts.map((m, i) => (
                    <tr key={i} className="hover:bg-[var(--sub-bg)]/50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <PlatformIcon platformId={m.platform} size={20} />
                          <span className="font-bold truncate max-w-[120px]">{m.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-black">{m.followers.toLocaleString('pt-BR')}</td>
                      <td className="py-3 px-4 font-bold opacity-80">-</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded bg-[var(--primary-color)]/10 text-[var(--primary-color)] font-black text-xs">
                          -
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold opacity-80">-</td>
                      <td className="py-3 pl-4">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black
                          ${m.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                          <div className="w-1 h-1 rounded-full bg-current" />
                          {m.status === 'active' ? 'ATIVO' : 'ALERTA'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeSection === 'logs' && (
        <Card className="animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-xs opacity-60 tracking-widest uppercase m-0">Log de Atividades</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">AO VIVO</span>
              </div>
              <button
                onClick={() => clearActivityLogs()}
                className="px-3 py-1.5 rounded-lg bg-[var(--sub-bg)] text-xs font-bold opacity-60 hover:opacity-100 transition-opacity"
              >
                LIMPAR
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
            {activityLogs.length === 0 ? (
              <div className="text-center py-16 opacity-40 font-bold text-sm">
                Aguardando atividades na plataforma...
              </div>
            ) : activityLogs.map((log) => {
              const typeVariants = {
                success: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500', badge: 'OK' },
                info: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500', badge: 'INFO' },
                warning: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500', badge: 'WARN' },
                error: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500', badge: 'ERR' },
              }[log.type];

              return (
                <div key={log.id} className={`animate-in fade-in slide-in-from-top-2 p-3 rounded-xl bg-[var(--sub-bg)] flex flex-wrap sm:flex-nowrap items-center gap-3 border-l-4 ${typeVariants.border}`}>
                  <span className="font-mono text-[10px] opacity-50 font-bold w-[60px] shrink-0">
                    {formatTime(new Date(log.timestamp))}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider w-[46px] text-center shrink-0 ${typeVariants.bg} ${typeVariants.text}`}>
                    {typeVariants.badge}
                  </span>
                  <span className="font-black text-xs min-w-[100px] truncate">{log.service}</span>
                  <span className="font-bold text-xs text-[var(--primary-color)] truncate max-w-[140px] shrink-0">{log.action}</span>
                  <span className="text-xs opacity-60 truncate font-medium flex-1 sm:text-right w-full sm:w-auto mt-1 sm:mt-0">{log.detail}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {activeSection === 'alerts' && (
        <Card className="animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-xs opacity-60 tracking-widest uppercase m-0">Alertas e Notificações</h3>
            {undismissedAlerts.length > 0 && (
              <button
                onClick={() => setAlerts(prev => prev.map(a => ({ ...a, dismissed: true })))}
                className="px-4 py-2 rounded-lg bg-[var(--sub-bg)] text-[10px] font-black uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity"
              >
                DISPENSAR TODOS
              </button>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-16">
              <div className="mb-4 text-slate-400 opacity-30 flex justify-center">
                <AlertTriangle size={64} strokeWidth={1} />
              </div>
              <div className="text-base font-black opacity-40">Nenhum alerta ativo</div>
              <div className="text-xs font-bold opacity-30 mt-2">Todos os serviços estão operando normalmente</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {alerts.map(alert => {
                const sevVariants = {
                  info: { bg: 'bg-blue-500/10', border: 'border-blue-500', text: 'text-blue-500', label: 'INFO' },
                  warning: { bg: 'bg-amber-500/10', border: 'border-amber-500', text: 'text-amber-500', label: 'AVISO' },
                  critical: { bg: 'bg-red-500/10', border: 'border-red-500', text: 'text-red-500', label: 'CRÍTICO' },
                }[alert.severity];

                return (
                  <div key={alert.id} className={`p-4 rounded-2xl bg-[var(--sub-bg)] border-l-4 ${sevVariants.border} transition-all duration-300 ${alert.dismissed ? 'opacity-40 grayscale focus-within:grayscale-0 focus-within:opacity-100' : ''}`}>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${sevVariants.bg} ${sevVariants.text}`}>
                            {sevVariants.label}
                          </span>
                          <span className="font-black text-sm">{alert.title}</span>
                        </div>
                        <div className="text-xs font-medium opacity-80 leading-relaxed max-w-2xl">{alert.message}</div>
                        <div className="text-[10px] font-mono font-bold opacity-40 mt-3">
                          {formatTime(alert.timestamp)}
                        </div>
                      </div>
                      {!alert.dismissed && (
                        <button
                          onClick={() => dismissAlert(alert.id)}
                          className="px-3 py-1.5 rounded-lg border border-[var(--sub-bg)] text-[10px] font-black tracking-widest opacity-60 hover:opacity-100 hover:bg-[var(--sub-bg)] transition-all shrink-0 uppercase"
                        >
                          DISPENSAR
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default PlatformMonitor;
