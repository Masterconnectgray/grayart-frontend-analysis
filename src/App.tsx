import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useAppContext, type MarketingView } from './context/AppContext';
import { DIVISIONS, type Division } from './constants/Themes';
import { ModuleSkeleton, AnalyticsSkeleton, FeedSkeleton } from './components/SkeletonLoader';

// ─── Lazy Loading: reduz bundle inicial de 1.25MB ─────────────────────────────
const ReelsGenerator = lazy(() => import('./components/ReelsGenerator'));
const OperationsDashboard = lazy(() => import('./components/OperationsDashboard'));
const AIVideoLab = lazy(() => import('./components/AIVideoLab'));
const MediaUpload = lazy(() => import('./components/MediaUpload'));
const ConnectJourney = lazy(() => import('./components/journeys/ConnectJourney'));
const PublishJourney = lazy(() => import('./components/journeys/PublishJourney'));
const MonitorJourney = lazy(() => import('./components/journeys/MonitorJourney'));
const PhotoAnalyzer = lazy(() => import('./components/PhotoAnalyzer'));
const OAuthCallback = lazy(() => import('./components/OAuthCallback'));
import { DIVISION_LOGOS, GrupoGrayLogo } from './constants/DivisionLogos';
import { PenTool, Video, Link2, Send, BarChart3, Sparkles, FileText, Users, Upload, Camera } from 'lucide-react';
import { useDashboardStats } from './hooks/useDashboardStats';
import './index.css';

// ─── Stats Bar com dados reais do BFF ─────────────────────────────────────────
const StatsBar: React.FC = () => {
  const { activeDivision } = useAppContext();
  const { stats, loading } = useDashboardStats();
  const theme = DIVISIONS[activeDivision];
  const isDark = activeDivision !== 'gray-art';

  const items = [
    { icon: Sparkles, label: 'Copies IA', value: stats?.totalCopies ?? 0 },
    { icon: Video, label: 'Vídeos', value: stats?.totalVideos ?? 0 },
    { icon: FileText, label: 'Publicados', value: stats?.postsPublished ?? 0 },
    { icon: Link2, label: 'Contas', value: stats?.connectedAccounts ?? 0 },
    { icon: Users, label: 'WhatsApp', value: stats?.whatsappContacts ?? 0 },
  ];

  return (
    <div className={`px-6 md:px-8 py-3 flex gap-4 overflow-x-auto scrollbar-none border-b transition-colors duration-300
      ${isDark ? 'bg-[#1a1a1a]/50 border-white/5' : 'bg-white/50 border-black/5'}`}>
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-2 shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${theme.colors.primary}15` }}
          >
            <item.icon className="w-4 h-4" style={{ color: theme.colors.primary }} />
          </div>
          <div className="leading-tight">
            <div className={`text-base font-bold ${loading ? 'animate-pulse' : ''}`}>
              {loading ? '—' : item.value}
            </div>
            <div className="text-[10px] font-semibold opacity-40 uppercase tracking-wider">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Roteamento simples para OAuth callback ──────────────────────────────────
const isOAuthCallback = window.location.pathname.includes('/oauth/callback');

const ToastContainer: React.FC = () => {
  const { notifications, removeNotification, activeDivision } = useAppContext();
  const theme = DIVISIONS[activeDivision];

  return (
    <div className="fixed bottom-8 right-8 z-[1000] flex flex-col gap-3 max-w-[350px]">
      {notifications.map(n => (
        <div
          key={n.id}
          onClick={() => removeNotification(n.id)}
          className={`px-5 py-4 rounded-2xl shadow-xl flex items-center gap-3 cursor-pointer font-semibold text-sm animate-in slide-in-from-right-8 duration-300
            ${activeDivision === 'gray-art' ? 'bg-white text-[#1a1a1a]' : 'bg-[#222] text-white'}`}
          style={{ borderLeft: `5px solid ${n.type === 'error' ? '#ef4444' : n.type === 'info' ? '#3b82f6' : theme.colors.primary}` }}
        >
          <div 
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0"
            style={{ 
              backgroundColor: n.type === 'error' ? '#ef444422' : n.type === 'info' ? '#3b82f622' : `${theme.colors.primary}22`,
              color: n.type === 'error' ? '#ef4444' : n.type === 'info' ? '#3b82f6' : theme.colors.primary
            }}
          >
            {n.type === 'error' ? '!' : n.type === 'info' ? 'i' : '✓'}
          </div>
          {n.message}
        </div>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const {
    activeDivision, setActiveDivision,
    activeTab, setActiveTab,
    marketingView, setMarketingView
  } = useAppContext();

  const theme = DIVISIONS[activeDivision];
  const isDark = activeDivision !== 'gray-art';

  // Skeleton de transição ao trocar divisão
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [stableDivision, setStableDivision] = useState<Division>(activeDivision);

  if (activeDivision !== stableDivision && !isTransitioning) {
    setIsTransitioning(true);
  }

  useEffect(() => {
    if (!isTransitioning) return;
    const t = setTimeout(() => {
      setStableDivision(activeDivision);
      setIsTransitioning(false);
    }, 350);
    return () => clearTimeout(t);
  }, [isTransitioning, activeDivision]);

  // Apply theme colors to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', theme.colors.primary);
    root.style.setProperty('--secondary-color', theme.colors.secondary);
    root.style.setProperty('--bg-color', theme.colors.background);
    root.style.setProperty('--text-color', theme.colors.text);

    // Add RGB version for rgba usage
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r}, ${g}, ${b}`;
    };
    root.style.setProperty('--primary-color-rgb', hexToRgb(theme.colors.primary));
  }, [theme]);

  // ── OAuth callback: renderiza só a página de retorno ────────────────────
  if (isOAuthCallback) return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><ModuleSkeleton isDark={false} primary="#00C896" /></div>}><OAuthCallback /></Suspense>;

  return (
    <div className={`min-h-screen transition-colors duration-500 ease-in-out ${activeDivision === 'gray-art' ? 'bg-[#f5f7fa] text-[#1a1a1a]' : 'bg-[#121212] text-white'}`}>
      <ToastContainer />

      {/* Header / Nav */}
      <header className={`px-6 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center sticky top-0 z-50 shadow-sm gap-4 border-b transition-colors duration-300
        ${activeDivision === 'gray-art' ? 'bg-white/90 border-black/5' : 'bg-[#121212]/90 border-white/5'} backdrop-blur-md`}>
        
        <div className="flex items-center gap-3">
          <div className="text-[var(--primary-color)] transition-colors duration-300 flex items-center">
            <GrupoGrayLogo size={36} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-[var(--primary-color)] transition-colors duration-300 leading-tight">
              GRUPO GRAY
            </h1>
            <span className="text-xs font-semibold opacity-50 tracking-wider uppercase block">{theme.name}</span>
          </div>
        </div>

        <nav className="flex gap-2 flex-wrap justify-center">
          <button
            onClick={() => setActiveTab('marketing')}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all
              ${activeTab === 'marketing' ? 'bg-[var(--primary-color)] text-[#1a1a1a]' : `bg-transparent ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-black hover:bg-black/5'}`}`}
          >
            Marketing
          </button>
          <button
            onClick={() => setActiveTab('operations')}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all
              ${activeTab === 'operations' ? 'bg-[var(--primary-color)] text-[#1a1a1a]' : `bg-transparent ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-black hover:bg-black/5'}`}`}
          >
            Operações
          </button>
        </nav>

        <div className="flex gap-2 items-center justify-center">
          {(Object.keys(DIVISIONS) as Division[]).map((divId) => {
            const DivLogo = DIVISION_LOGOS[divId];
            const isActive = activeDivision === divId;
            return (
              <button
                key={divId}
                onClick={() => setActiveDivision(divId)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center p-1 transition-all duration-300
                  ${isActive ? 'scale-105 border-2 shadow-lg' : 'border-2 border-transparent scale-100 opacity-60 hover:opacity-100 hover:bg-white/5'}`}
                style={{
                  borderColor: isActive ? DIVISIONS[divId].colors.primary : 'transparent',
                  backgroundColor: isActive ? `${DIVISIONS[divId].colors.primary}15` : 'transparent',
                  boxShadow: isActive ? `0 0 12px ${DIVISIONS[divId].colors.primary}44` : 'none',
                }}
                title={DIVISIONS[divId].name}
              >
                <DivLogo size={24} color={isActive ? DIVISIONS[divId].colors.primary : '#888'} />
              </button>
            );
          })}
        </div>
      </header>

      {activeTab === 'marketing' && (
        <div className={`px-6 md:px-8 py-3 flex gap-2 border-b overflow-x-auto scrollbar-none transition-colors duration-300
          ${activeDivision === 'gray-art' ? 'bg-white border-black/5' : 'bg-[#1a1a1a] border-white/5'}`}>
          {[
            { id: 'create', label: 'Criar Conteúdo', icon: PenTool },
            { id: 'media', label: 'Mídia + IA', icon: Upload },
            { id: 'video', label: 'Vídeo IA', icon: Video },
            { id: 'photo', label: 'Análise Foto', icon: Camera },
            { id: 'connect', label: 'Conectar Contas', icon: Link2 },
            { id: 'publish', label: 'Publicar', icon: Send },
            { id: 'monitor', label: 'Monitorar', icon: BarChart3 }
          ].map(v => (
            <button
              key={v.id}
              onClick={() => setMarketingView(v.id as MarketingView)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200
                ${marketingView === v.id ? 'bg-[var(--primary-color)] text-[#1a1a1a] shadow-sm' : `bg-transparent ${isDark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-black/5 hover:text-black'}`}`}
            >
              <v.icon className="w-4 h-4" />
              {v.label}
            </button>
          ))}
        </div>
      )}

      <StatsBar />

      <main className="py-8 px-4 md:px-8 max-w-[1440px] mx-auto min-h-[calc(100vh-250px)]">
        {isTransitioning ? (
          <div className="animate-in fade-in duration-300">
            {marketingView === 'publish' ? (
              <FeedSkeleton isDark={isDark} />
            ) : marketingView === 'monitor' ? (
              <AnalyticsSkeleton isDark={isDark} primary={DIVISIONS[activeDivision].colors.primary} />
            ) : (
              <ModuleSkeleton isDark={isDark} primary={DIVISIONS[activeDivision].colors.primary} />
            )}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Suspense fallback={<ModuleSkeleton isDark={isDark} primary={DIVISIONS[activeDivision].colors.primary} />}>
              {activeTab === 'marketing' ? (
                <div>
                  {marketingView === 'create' && <ReelsGenerator division={activeDivision} />}
                  {marketingView === 'media' && <MediaUpload division={activeDivision} />}
                  {marketingView === 'video' && <AIVideoLab division={activeDivision} />}
                  {marketingView === 'photo' && <PhotoAnalyzer division={activeDivision} />}
                  {marketingView === 'connect' && <ConnectJourney division={activeDivision} />}
                  {marketingView === 'publish' && <PublishJourney division={activeDivision} />}
                  {marketingView === 'monitor' && <MonitorJourney division={activeDivision} />}
                </div>
              ) : (
                <OperationsDashboard division={activeDivision} />
              )}
            </Suspense>
          </div>
        )}
      </main>

      <footer className={`text-center py-8 mt-8 border-t transition-colors duration-300
        ${isDark ? 'border-white/5' : 'border-black/5'}`}>
        <div className="opacity-40 text-xs font-bold uppercase tracking-widest">
          {theme.name} <span className="opacity-50 mx-2">|</span> {theme.tagline}
        </div>
        <div className="opacity-20 text-[10px] mt-2 font-medium tracking-wide">
          Grupo Gray 2026 — Central de Marketing e Operação
        </div>
      </footer>
    </div>
  );
};

export default App;
