import React, { useState, useEffect, useCallback } from 'react';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
import { useAppContext } from '../context/AppContext';
import {
  PLATFORM_CONFIGS,
  type PlatformKey,
  type ConnectedAccount,
  type PublishPayload,
  TokenStore,
  AccountStore,
  loginWithPlatform,
  loginWithGoogle,
  publishToSocial,
  getConnectionStatus,
} from '../services/SocialOAuthService';
import {
  saveSocialCredential,
  listSocialCredentials,
  deleteSocialCredential,
  getSocialStatus,
  type SocialAccountStatus,
} from '../services/FlowAPIService';

interface InstagramIntegrationsProps { division: Division; }

const ALL_PLATFORMS: PlatformKey[] = ['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'pinterest'];

const PLATFORM_VISUAL: Record<PlatformKey, { label: string; bg: string; icon: React.ReactNode }> = {
  instagram: {
    label: 'Instagram',
    bg: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
  },
  facebook: {
    label: 'Facebook',
    bg: '#1877F2',
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  },
  linkedin: {
    label: 'LinkedIn',
    bg: '#0A66C2',
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  },
  tiktok: {
    label: 'TikTok',
    bg: '#010101',
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>,
  },
  youtube: {
    label: 'YouTube',
    bg: '#FF0000',
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  },
  pinterest: {
    label: 'Pinterest',
    bg: '#E60023',
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/></svg>,
  },
};

const InstagramIntegrations: React.FC<InstagramIntegrationsProps> = ({ division }) => {
  const { addNotification } = useAppContext();
  const theme = DIVISIONS[division];
  const isDark = division !== 'gray-art';

  const bg = isDark ? '#111' : '#f5f5f7';
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const cardText = isDark ? '#fff' : '#1a1a1a';
  const mutedText = isDark ? '#888' : '#999';

  // State
  const [accounts, setAccounts] = useState<Partial<Record<PlatformKey, ConnectedAccount>>>({});
  const [connecting, setConnecting] = useState<PlatformKey | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [serverStatus, setServerStatus] = useState<SocialAccountStatus[]>([]);

  // Admin creds
  const [credPlatform, setCredPlatform] = useState<PlatformKey>('instagram');
  const [credAppId, setCredAppId] = useState('');
  const [credAppSecret, setCredAppSecret] = useState('');
  const [savedCreds, setSavedCreds] = useState<{ platform: string; hasAppId: boolean; hasAppSecret: boolean }[]>([]);
  const [savingCred, setSavingCred] = useState(false);

  // Publish
  const [publishText, setPublishText] = useState('');
  const [publishingTo, setPublishingTo] = useState<PlatformKey[]>([]);
  const [publishResults, setPublishResults] = useState<Record<string, { ok: boolean; msg: string }>>({});

  // Load accounts + server status
  useEffect(() => {
    const saved = AccountStore.getAll();
    const map: Partial<Record<PlatformKey, ConnectedAccount>> = {};
    saved.forEach(acc => { map[acc.platform] = acc; });
    setAccounts(map);

    getSocialStatus().then(setServerStatus).catch(() => {});
    listSocialCredentials().then(setSavedCreds).catch(() => {});
  }, []);

  const isConnected = useCallback((p: PlatformKey) => {
    const local = !!accounts[p] && (getConnectionStatus(p) === 'connected' || accounts[p]?.status === 'active');
    const server = serverStatus.find(s => s.platform === p);
    return local || server?.status === 'connected';
  }, [accounts, serverStatus]);

  const getHandle = useCallback((p: PlatformKey) => {
    if (accounts[p]?.handle) return accounts[p]!.handle;
    const server = serverStatus.find(s => s.platform === p);
    return server?.handle || '';
  }, [accounts, serverStatus]);

  // Connect
  const handleConnect = useCallback(async (platform: PlatformKey) => {
    if (platform === 'youtube') {
      setConnecting('youtube');
      try {
        const account = await loginWithGoogle((msg) => addNotification(msg, 'info'));
        setAccounts(prev => ({ ...prev, youtube: account }));
        addNotification(`YouTube conectado como ${account.handle}!`, 'success');
      } catch (err: unknown) {
        addNotification(err instanceof Error ? err.message : 'Erro no login Google', 'error');
      } finally {
        setConnecting(null);
      }
      return;
    }

    setConnecting(platform);
    try {
      const account = await loginWithPlatform(platform, (msg) => addNotification(msg, 'info'));
      setAccounts(prev => ({ ...prev, [platform]: account }));
      addNotification(`${PLATFORM_CONFIGS[platform].name} conectado!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro';
      addNotification(msg, 'error');
    } finally {
      setConnecting(null);
    }
  }, [addNotification]);

  // Disconnect
  const handleDisconnect = useCallback((platform: PlatformKey) => {
    TokenStore.remove(platform);
    AccountStore.remove(platform);
    setAccounts(prev => { const n = { ...prev }; delete n[platform]; return n; });
    addNotification(`${PLATFORM_VISUAL[platform].label} desconectado.`, 'info');
  }, [addNotification]);

  // Save credential to backend
  const handleSaveCredential = useCallback(async () => {
    if (!credAppId.trim()) { addNotification('Preencha o App ID.', 'error'); return; }
    setSavingCred(true);
    try {
      const ok = await saveSocialCredential(credPlatform, credAppId.trim(), credAppSecret.trim());
      if (ok) {
        addNotification(`Credenciais de ${PLATFORM_VISUAL[credPlatform].label} salvas no servidor.`, 'success');
        setCredAppId('');
        setCredAppSecret('');
        const updated = await listSocialCredentials();
        setSavedCreds(updated);
      } else {
        addNotification('Erro ao salvar credenciais.', 'error');
      }
    } catch { addNotification('Erro de conexao com servidor.', 'error'); }
    finally { setSavingCred(false); }
  }, [credPlatform, credAppId, credAppSecret, addNotification]);

  // Delete credential
  const handleDeleteCred = useCallback(async (platform: string) => {
    await deleteSocialCredential(platform);
    const updated = await listSocialCredentials();
    setSavedCreds(updated);
    addNotification(`Credenciais de ${platform} removidas.`, 'info');
  }, [addNotification]);

  // Publish
  const handlePublish = useCallback(async () => {
    if (!publishText.trim()) { addNotification('Escreva algo para publicar.', 'error'); return; }
    const targets = ALL_PLATFORMS.filter(p => isConnected(p));
    if (!targets.length) { addNotification('Conecte ao menos uma rede.', 'error'); return; }

    setPublishingTo([...targets]);
    setPublishResults({});

    const payload: PublishPayload = {
      caption: publishText,
      mediaType: 'IMAGE',
      hashtags: publishText.match(/#\w+/g) || [],
    };

    await Promise.allSettled(targets.map(async (p) => {
      try {
        await publishToSocial(p, payload);
        setPublishResults(prev => ({ ...prev, [p]: { ok: true, msg: 'Publicado' } }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro';
        setPublishResults(prev => ({ ...prev, [p]: { ok: false, msg } }));
      } finally {
        setPublishingTo(prev => prev.filter(x => x !== p));
      }
    }));
  }, [publishText, isConnected, addNotification]);

  const connectedCount = ALL_PLATFORMS.filter(p => isConnected(p)).length;

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '1.5rem' }} className="animate-fade-in">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: cardText, margin: 0 }}>
            Suas Redes
          </h2>
          <p style={{ fontSize: '0.75rem', color: mutedText, margin: '0.25rem 0 0', fontWeight: 600 }}>
            {connectedCount} de {ALL_PLATFORMS.length} conectadas
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {/* Publish toggle */}
          <button
            onClick={() => { setShowPublish(!showPublish); setShowAdmin(false); }}
            style={{
              width: '42px', height: '42px', borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: showPublish ? theme.colors.primary : (isDark ? '#2c2c2e' : '#e5e5ea'),
              color: showPublish ? '#fff' : mutedText,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            title="Publicar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
          {/* Admin toggle */}
          <button
            onClick={() => { setShowAdmin(!showAdmin); setShowPublish(false); }}
            style={{
              width: '42px', height: '42px', borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: showAdmin ? theme.colors.primary : (isDark ? '#2c2c2e' : '#e5e5ea'),
              color: showAdmin ? '#fff' : mutedText,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            title="Configuracoes"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Platform Grid — estilo InShot */}
      {!showAdmin && !showPublish && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
          {ALL_PLATFORMS.map(platform => {
            const visual = PLATFORM_VISUAL[platform];
            const connected = isConnected(platform);
            const isLoading = connecting === platform;
            const handle = getHandle(platform);

            return (
              <div
                key={platform}
                style={{
                  borderRadius: '20px', overflow: 'hidden',
                  background: cardBg,
                  border: connected ? '2px solid #22c55e' : `2px solid ${isDark ? '#2c2c2e' : '#e5e5ea'}`,
                  transition: 'all 0.3s',
                  cursor: isLoading ? 'wait' : 'pointer',
                  position: 'relative',
                }}
                onClick={() => {
                  if (isLoading) return;
                  if (connected) return;
                  handleConnect(platform);
                }}
              >
                {/* Icon area */}
                <div style={{
                  background: visual.bg,
                  padding: '1.5rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.6rem',
                  position: 'relative',
                }}>
                  {visual.icon}
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.85rem' }}>
                    {visual.label}
                  </span>

                  {/* Connected badge */}
                  {connected && (
                    <div style={{
                      position: 'absolute', top: '8px', right: '8px',
                      width: '22px', height: '22px', borderRadius: '50%',
                      background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(34,197,94,0.4)',
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  )}

                  {/* Loading spinner */}
                  {isLoading && (
                    <div style={{
                      position: 'absolute', top: '8px', right: '8px',
                      width: '22px', height: '22px', borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid #fff',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                  )}
                </div>

                {/* Bottom area */}
                <div style={{ padding: '0.8rem', textAlign: 'center' }}>
                  {connected ? (
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#22c55e', marginBottom: '0.25rem' }}>
                        Conectado
                      </div>
                      {handle && (
                        <div style={{ fontSize: '0.65rem', color: mutedText, marginBottom: '0.5rem' }}>
                          {handle}
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDisconnect(platform); }}
                        style={{
                          padding: '0.35rem 0.8rem', borderRadius: '8px',
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                          color: '#ef4444', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        Desconectar
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: mutedText }}>
                      {isLoading ? 'Conectando...' : 'Toque para conectar'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Publish Panel */}
      {showPublish && (
        <div className="animate-fade-in" style={{ maxWidth: '600px' }}>
          <div style={{
            borderRadius: '20px', background: cardBg,
            padding: '1.5rem', border: `1px solid ${isDark ? '#2c2c2e' : '#e5e5ea'}`,
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: cardText, marginBottom: '1rem' }}>
              Publicar em todas as redes
            </h3>

            {/* Connected platforms chips */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {ALL_PLATFORMS.map(p => {
                const connected = isConnected(p);
                const result = publishResults[p];
                return (
                  <div key={p} style={{
                    padding: '0.35rem 0.7rem', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 700,
                    background: result?.ok ? '#22c55e18' : result && !result.ok ? '#ef444418' : connected ? `${isDark ? '#2c2c2e' : '#e5e5ea'}` : `${isDark ? '#1a1a1a' : '#f0f0f0'}`,
                    color: result?.ok ? '#22c55e' : result && !result.ok ? '#ef4444' : connected ? cardText : mutedText,
                    opacity: connected ? 1 : 0.4,
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                  }}>
                    <div style={{ width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'scale(0.44)' }}>
                      {PLATFORM_VISUAL[p].icon}
                    </div>
                    {PLATFORM_VISUAL[p].label}
                    {publishingTo.includes(p) && <span style={{ fontSize: '0.55rem' }}>...</span>}
                  </div>
                );
              })}
            </div>

            <textarea
              value={publishText}
              onChange={e => setPublishText(e.target.value)}
              placeholder="Escreva aqui o que quer publicar..."
              rows={5}
              style={{
                width: '100%', padding: '1rem', borderRadius: '14px',
                background: isDark ? '#2c2c2e' : '#f0f0f0', border: 'none',
                color: cardText, fontSize: '0.85rem', resize: 'none', lineHeight: 1.6,
              }}
            />

            <button
              onClick={handlePublish}
              disabled={connectedCount === 0 || publishingTo.length > 0}
              style={{
                width: '100%', padding: '0.9rem', borderRadius: '14px', marginTop: '1rem',
                fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', border: 'none',
                background: connectedCount > 0 ? theme.colors.primary : (isDark ? '#2c2c2e' : '#e5e5ea'),
                color: connectedCount > 0 ? '#fff' : mutedText,
                transition: 'all 0.2s',
              }}
            >
              {publishingTo.length > 0 ? `Publicando...` : `Publicar em ${connectedCount} redes`}
            </button>

            {/* Results */}
            {Object.keys(publishResults).length > 0 && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {Object.entries(publishResults).map(([p, r]) => (
                  <div key={p} style={{
                    fontSize: '0.7rem', padding: '0.4rem 0.8rem', borderRadius: '8px',
                    background: r.ok ? '#22c55e12' : '#ef444412',
                    color: r.ok ? '#22c55e' : '#ef4444', fontWeight: 600,
                  }}>
                    {PLATFORM_VISUAL[p as PlatformKey]?.label}: {r.msg}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Panel */}
      {showAdmin && (
        <div className="animate-fade-in" style={{ maxWidth: '500px' }}>
          <div style={{
            borderRadius: '20px', background: cardBg,
            padding: '1.5rem', border: `1px solid ${isDark ? '#2c2c2e' : '#e5e5ea'}`,
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: cardText, marginBottom: '0.3rem' }}>
              Credenciais de API
            </h3>
            <p style={{ fontSize: '0.7rem', color: mutedText, marginBottom: '1.2rem' }}>
              Configure App ID e Secret de cada plataforma. As credenciais ficam salvas no servidor.
            </p>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '1.5rem' }}>
              <select
                value={credPlatform}
                onChange={e => setCredPlatform(e.target.value as PlatformKey)}
                style={{
                  width: '100%', padding: '0.7rem', borderRadius: '10px',
                  background: isDark ? '#2c2c2e' : '#f0f0f0', border: 'none',
                  color: cardText, fontSize: '0.85rem', fontWeight: 600,
                }}
              >
                {ALL_PLATFORMS.map(p => (
                  <option key={p} value={p}>{PLATFORM_VISUAL[p].label}</option>
                ))}
              </select>
              <input
                value={credAppId}
                onChange={e => setCredAppId(e.target.value)}
                placeholder="App ID / Client ID"
                style={{
                  width: '100%', padding: '0.7rem', borderRadius: '10px',
                  background: isDark ? '#2c2c2e' : '#f0f0f0', border: 'none',
                  color: cardText, fontSize: '0.85rem', fontFamily: 'monospace',
                }}
              />
              <input
                type="password"
                value={credAppSecret}
                onChange={e => setCredAppSecret(e.target.value)}
                placeholder="App Secret / Client Secret"
                style={{
                  width: '100%', padding: '0.7rem', borderRadius: '10px',
                  background: isDark ? '#2c2c2e' : '#f0f0f0', border: 'none',
                  color: cardText, fontSize: '0.85rem', fontFamily: 'monospace',
                }}
              />
              <button
                onClick={handleSaveCredential}
                disabled={savingCred}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '12px',
                  background: theme.colors.primary, color: '#fff', border: 'none',
                  fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                  opacity: savingCred ? 0.6 : 1,
                }}
              >
                {savingCred ? 'Salvando...' : 'Salvar Credencial'}
              </button>
            </div>

            {/* Saved credentials */}
            {savedCreds.length > 0 && (
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: mutedText, marginBottom: '0.6rem', textTransform: 'uppercase' }}>
                  Credenciais salvas
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {savedCreds.map(cred => {
                    const visual = PLATFORM_VISUAL[cred.platform as PlatformKey];
                    return (
                      <div key={cred.platform} style={{
                        padding: '0.7rem 1rem', borderRadius: '12px',
                        background: isDark ? '#2c2c2e' : '#f0f0f0',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'scale(0.625)' }}>
                            {visual?.icon}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: cardText }}>{visual?.label || cred.platform}</div>
                            <div style={{ fontSize: '0.6rem', color: '#22c55e' }}>
                              {cred.hasAppId ? 'App ID' : ''}{cred.hasAppId && cred.hasAppSecret ? ' + ' : ''}{cred.hasAppSecret ? 'Secret' : ''} configurado
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteCred(cred.platform)}
                          style={{
                            padding: '0.3rem 0.6rem', borderRadius: '8px',
                            background: 'rgba(239,68,68,0.1)', border: 'none',
                            color: '#ef4444', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          Remover
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default InstagramIntegrations;
