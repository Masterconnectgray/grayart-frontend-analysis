import React, { useEffect, useState } from 'react';
import { useAppContext, type MarketingView } from './context/AppContext';
import { DIVISIONS, type Division } from './constants/Themes';
import ReelsGenerator from './components/ReelsGenerator';
import OperationsDashboard from './components/OperationsDashboard';
import ContentCalendar from './components/ContentCalendar';
import FeedPreview from './components/FeedPreview';
import SocialAnalytics from './components/SocialAnalytics';
import InstagramIntegrations from './components/InstagramIntegrations';
import AIVideoLab from './components/AIVideoLab';
import MultiChannelPublisher from './components/MultiChannelPublisher';
import WhatsAppConnect from './components/WhatsAppConnect';
import PlatformMonitor from './components/PlatformMonitor';
import OAuthCallback from './components/OAuthCallback';
import { ModuleSkeleton, AnalyticsSkeleton, FeedSkeleton } from './components/SkeletonLoader';
import { DIVISION_LOGOS, GrupoGrayLogo } from './constants/DivisionLogos';
import './index.css';

// ─── Roteamento simples para OAuth callback ──────────────────────────────────
const isOAuthCallback = window.location.pathname.includes('/oauth/callback');

const ToastContainer: React.FC = () => {
  const { notifications, removeNotification, activeDivision } = useAppContext();
  const theme = DIVISIONS[activeDivision];

  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.8rem',
      maxWidth: '350px'
    }}>
      {notifications.map(n => (
        <div
          key={n.id}
          onClick={() => removeNotification(n.id)}
          style={{
            background: activeDivision === 'gray-art' ? '#fff' : '#222',
            color: activeDivision === 'gray-art' ? '#1a1a1a' : '#fff',
            padding: '1rem 1.2rem',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            borderLeft: `5px solid ${n.type === 'error' ? '#ef4444' : n.type === 'info' ? '#3b82f6' : theme.colors.primary}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            cursor: 'pointer',
            animation: 'slideIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}
        >
          <div style={{
            width: '24px', height: '24px', borderRadius: '50%',
            background: n.type === 'error' ? '#ef444422' : n.type === 'info' ? '#3b82f622' : `${theme.colors.primary}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: n.type === 'error' ? '#ef4444' : n.type === 'info' ? '#3b82f6' : theme.colors.primary,
            fontSize: '0.8rem'
          }}>
            {n.type === 'error' ? '!' : n.type === 'info' ? 'i' : '✓'}
          </div>
          {n.message}
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
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
  if (isOAuthCallback) return <OAuthCallback />;

  const appBackground = activeDivision === 'gray-art' ? '#f5f7fa' : '#121212';
  const textColor = activeDivision === 'gray-art' ? '#1a1a1a' : '#ffffff';

  return (
    <div style={{ backgroundColor: appBackground, color: textColor, minHeight: '100vh', transition: 'all 0.5s ease' }}>
      <ToastContainer />

      {/* Header / Nav */}
      <header style={{
        background: activeDivision === 'gray-art' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(18, 18, 18, 0.9)',
        backdropFilter: 'blur(10px)',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ color: 'var(--primary-color)', transition: 'color 0.3s', display: 'flex', alignItems: 'center' }}>
            <GrupoGrayLogo size={36} />
          </div>
          <div>
            <h1 style={{
              fontSize: 'max(1rem, 1.3vw)',
              fontWeight: 800,
              color: 'var(--primary-color)',
              transition: 'color 0.3s',
              lineHeight: 1.1,
            }}>
              GRUPO GRAY
            </h1>
            <span style={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.5, letterSpacing: '1px' }}>{theme.name}</span>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('marketing')}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '12px',
              backgroundColor: activeTab === 'marketing' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'marketing' ? (activeDivision === 'gray-art' ? '#000' : '#fff') : (activeDivision === 'gray-art' ? '#666' : '#aaa'),
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'all 0.3s'
            }}
          >
            Marketing
          </button>
          <button
            onClick={() => setActiveTab('operations')}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '12px',
              backgroundColor: activeTab === 'operations' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'operations' ? (activeDivision === 'gray-art' ? '#000' : '#fff') : (activeDivision === 'gray-art' ? '#666' : '#aaa'),
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'all 0.3s'
            }}
          >
            Operações
          </button>
        </nav>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {(Object.keys(DIVISIONS) as Division[]).map((divId) => {
            const DivLogo = DIVISION_LOGOS[divId];
            const isActive = activeDivision === divId;
            return (
              <button
                key={divId}
                onClick={() => setActiveDivision(divId)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  border: isActive ? `2px solid ${DIVISIONS[divId].colors.primary}` : '2px solid transparent',
                  backgroundColor: isActive ? `${DIVISIONS[divId].colors.primary}15` : 'transparent',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isActive ? `0 0 12px ${DIVISIONS[divId].colors.primary}44` : 'none',
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                }}
                title={DIVISIONS[divId].name}
              >
                <DivLogo size={28} color={DIVISIONS[divId].colors.primary} />
              </button>
            );
          })}
        </div>
      </header>

      {activeTab === 'marketing' && (
        <div style={{
          background: activeDivision === 'gray-art' ? '#fff' : '#1e1e1e',
          padding: '0.6rem 2rem',
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(128,128,128,0.1)',
          overflowX: 'auto',
          scrollbarWidth: 'none'
        }}>
          {[
            { id: 'generator', label: '🎬 Gerador' },
            { id: 'video-lab', label: '🎞️ Vídeo IA' },
            { id: 'whatsapp', label: '🟢 WhatsApp' },
            { id: 'publisher', label: '🚀 Publicador' },
            { id: 'calendar', label: '📅 Calendário' },
            { id: 'feed', label: '📱 Grid Feed' },
            { id: 'analytics', label: '📊 Analytics' },
            { id: 'monitor', label: '📡 Monitor' },
            { id: 'accounts', label: '🔗 Contas' }
          ].map(v => (
            <button
              key={v.id}
              onClick={() => setMarketingView(v.id as MarketingView)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 700,
                backgroundColor: marketingView === v.id ? 'var(--primary-color)' : 'transparent',
                color: marketingView === v.id ? (activeDivision === 'gray-art' ? '#000' : '#fff') : (activeDivision === 'gray-art' ? '#666' : '#999'),
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      <main style={{
        padding: '2rem 1.5rem',
        maxWidth: '1240px',
        margin: '0 auto',
        minHeight: 'calc(100vh - 250px)'
      }}>
        {isTransitioning ? (
          // Skeleton de transição
          <div className="animate-fade-in">
            {marketingView === 'feed' ? (
              <FeedSkeleton isDark={isDark} />
            ) : marketingView === 'analytics' ? (
              <AnalyticsSkeleton isDark={isDark} primary={DIVISIONS[activeDivision].colors.primary} />
            ) : (
              <ModuleSkeleton isDark={isDark} primary={DIVISIONS[activeDivision].colors.primary} />
            )}
          </div>
        ) : (
          <div className="animate-fade-in">
            {activeTab === 'marketing' ? (
              <div style={{ transition: 'all 0.3s' }}>
                {marketingView === 'generator' && <ReelsGenerator division={activeDivision} />}
                {marketingView === 'video-lab' && <AIVideoLab division={activeDivision} />}
                {marketingView === 'publisher' && <MultiChannelPublisher division={activeDivision} />}
                {marketingView === 'calendar' && <ContentCalendar division={activeDivision} />}
                {marketingView === 'feed' && <FeedPreview division={activeDivision} />}
                {marketingView === 'analytics' && <SocialAnalytics division={activeDivision} />}
                {marketingView === 'accounts' && <InstagramIntegrations division={activeDivision} />}
                {marketingView === 'whatsapp' && <WhatsAppConnect division={activeDivision} />}
                {marketingView === 'monitor' && <PlatformMonitor division={activeDivision} />}
              </div>
            ) : (
              <OperationsDashboard division={activeDivision} />
            )}
          </div>
        )}
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '2rem',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        marginTop: '2rem',
      }}>
        <div style={{ opacity: 0.35, fontSize: '0.75rem', fontWeight: 600 }}>
          {theme.name} <span style={{ opacity: 0.5 }}>|</span> {theme.tagline}
        </div>
        <div style={{ opacity: 0.2, fontSize: '0.65rem', marginTop: '0.3rem' }}>
          Grupo Gray 2026 — Central de Marketing e Operacao
        </div>
      </footer>
    </div>
  );
};

export default App;
