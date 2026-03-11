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
  publishToSocial,
  getConnectionStatus,
  buildAuthUrl,
} from '../services/SocialOAuthService';

interface InstagramIntegrationsProps { division: Division; }

// ── Plataformas disponiveis para conexao ─────────────────────────────────────
const ALL_PLATFORMS: PlatformKey[] = ['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'pinterest'];

// ── Detalhes visuais por plataforma ─────────────────────────────────────────
const PLATFORM_UI: Record<PlatformKey, { label: string; bg: string; textColor: string }> = {
  instagram: { label: 'Instagram', bg: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', textColor: '#fff' },
  facebook: { label: 'Facebook', bg: '#1877F2', textColor: '#fff' },
  linkedin: { label: 'LinkedIn', bg: '#0A66C2', textColor: '#fff' },
  tiktok: { label: 'TikTok', bg: '#010101', textColor: '#fff' },
  youtube: { label: 'YouTube', bg: '#FF0000', textColor: '#fff' },
  pinterest: { label: 'Pinterest', bg: '#E60023', textColor: '#fff' },
};

// ── Mock de contas salvas ────────────────────────────────────────────────────
const DEMO_ACCOUNTS: Partial<Record<PlatformKey, ConnectedAccount>> = {
  instagram: { platform: 'instagram', handle: '@connectgray', name: 'Connect Gray', followers: 12400, userId: 'demo_ig', connectedAt: Date.now() - 86400000, status: 'active' },
  facebook: { platform: 'facebook', handle: 'Connect Gray', name: 'Connect Gray', followers: 8100, userId: 'demo_fb', connectedAt: Date.now() - 86400000, status: 'active' },
};

// ── Credenciais storage (base64 encoded) ────────────────────────────────────
const CREDS_KEY = 'grayart_credentials';

interface SavedCredential {
  platform: PlatformKey;
  appId: string;      // base64
  appSecret: string;  // base64
  savedAt: number;
  lastTestedAt?: number;
  testStatus?: 'ok' | 'fail' | 'unknown';
}

const CredentialStore = {
  getAll(): SavedCredential[] {
    try {
      const raw = localStorage.getItem(CREDS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },
  get(platform: PlatformKey): SavedCredential | null {
    return this.getAll().find(c => c.platform === platform) || null;
  },
  save(cred: SavedCredential) {
    const all = this.getAll().filter(c => c.platform !== cred.platform);
    all.push(cred);
    localStorage.setItem(CREDS_KEY, JSON.stringify(all));
  },
  remove(platform: PlatformKey) {
    const all = this.getAll().filter(c => c.platform !== platform);
    localStorage.setItem(CREDS_KEY, JSON.stringify(all));
  },
  encode(val: string): string {
    try { return btoa(val); } catch { return val; }
  },
  decode(val: string): string {
    try { return atob(val); } catch { return val; }
  },
};

// Helpers
function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atras`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atras`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d atras`;
  return new Date(timestamp).toLocaleDateString('pt-BR');
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const InstagramIntegrations: React.FC<InstagramIntegrationsProps> = ({ division }) => {
  const { addNotification } = useAppContext();
  const theme = DIVISIONS[division];
  const isDark = division !== 'gray-art';

  const cardBg = isDark ? '#1e1e1e' : '#fff';
  const cardText = isDark ? '#fff' : '#1a1a1a';
  const subBg = isDark ? '#2d2d2d' : '#f0f2f5';

  // Estado de contas conectadas
  const [accounts, setAccounts] = useState<Partial<Record<PlatformKey, ConnectedAccount>>>({});
  const [connecting, setConnecting] = useState<PlatformKey | null>(null);
  const [connectStatus, setConnectStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'contas' | 'credenciais' | 'publicar' | 'guia'>('contas');
  const [testing, setTesting] = useState<PlatformKey | null>(null);

  // Test publish
  const [testCaption, setTestCaption] = useState('');
  const [publishingTo, setPublishingTo] = useState<PlatformKey[]>([]);
  const [publishResults, setPublishResults] = useState<Record<string, string>>({});

  // Credenciais form
  const [credPlatform, setCredPlatform] = useState<PlatformKey>('instagram');
  const [credAppId, setCredAppId] = useState('');
  const [credAppSecret, setCredAppSecret] = useState('');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [savedCreds, setSavedCreds] = useState<SavedCredential[]>([]);

  // Carrega contas salvas + credenciais
  useEffect(() => {
    const saved = AccountStore.getAll();
    const map: Partial<Record<PlatformKey, ConnectedAccount>> = { ...DEMO_ACCOUNTS };
    saved.forEach(acc => { map[acc.platform] = acc; });
    setAccounts(map);
    setSavedCreds(CredentialStore.getAll());
  }, []);

  const isConnected = useCallback((p: PlatformKey) => {
    return !!accounts[p] && (getConnectionStatus(p) === 'connected' || accounts[p]?.status === 'active');
  }, [accounts]);

  const getStatusInfo = useCallback((p: PlatformKey): { status: 'connected' | 'expired' | 'disconnected'; color: string; label: string } => {
    const connected = isConnected(p);
    const tokenStatus = getConnectionStatus(p);
    if (connected) return { status: 'connected', color: '#22c55e', label: 'CONECTADO' };
    if (tokenStatus === 'expired') return { status: 'expired', color: '#f59e0b', label: 'EXPIRADO' };
    return { status: 'disconnected', color: '#ef4444', label: 'DESCONECTADO' };
  }, [isConnected]);

  // ── Iniciar Login OAuth ────────────────────────────────────────────────────
  const handleConnect = useCallback(async (platform: PlatformKey) => {
    const config = PLATFORM_CONFIGS[platform];

    if (!config.appId) {
      addNotification(`Configure a credencial VITE_${platform.toUpperCase()}_APP_ID no .env e reinicie.`, 'info');
      setActiveTab('guia');
      return;
    }

    setConnecting(platform);
    setConnectStatus('');

    try {
      const account = await loginWithPlatform(platform, (msg) => {
        setConnectStatus(msg);
        addNotification(msg, 'info');
      });

      setAccounts(prev => ({ ...prev, [platform]: account }));
      addNotification(`${config.name} conectado como ${account.handle}!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Erro ao conectar ${config.name}`;
      addNotification(msg, 'error');

      if (msg.includes('não configurado') || msg.includes('backend') || msg.includes('fetch')) {
        addNotification(`Modo demo ativo -- configure credenciais reais no .env`, 'info');
        const demoAccount: ConnectedAccount = {
          platform,
          handle: `@${platform}_demo`,
          name: config.name,
          followers: Math.floor(Math.random() * 10000) + 1000,
          userId: `demo_${platform}`,
          connectedAt: Date.now(),
          status: 'active',
        };
        setAccounts(prev => ({ ...prev, [platform]: demoAccount }));
        AccountStore.save(demoAccount);
      }
    } finally {
      setConnecting(null);
      setConnectStatus('');
    }
  }, [addNotification]);

  // ── Desconectar ────────────────────────────────────────────────────────────
  const handleDisconnect = useCallback((platform: PlatformKey) => {
    if (!window.confirm(`Desconectar ${PLATFORM_CONFIGS[platform].name}?`)) return;
    TokenStore.remove(platform);
    AccountStore.remove(platform);
    setAccounts(prev => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });
    addNotification(`${PLATFORM_CONFIGS[platform].name} desconectado.`, 'info');
  }, [addNotification]);

  // ── Testar conexao ─────────────────────────────────────────────────────────
  const handleTestConnection = useCallback(async (platform: PlatformKey) => {
    setTesting(platform);
    try {
      const token = TokenStore.get(platform);
      if (!token) {
        addNotification(`Nenhum token salvo para ${PLATFORM_CONFIGS[platform].name}. Conecte primeiro.`, 'error');
        return;
      }
      const isValid = TokenStore.isValid(platform);
      if (isValid) {
        addNotification(`Conexao com ${PLATFORM_CONFIGS[platform].name} OK -- token valido.`, 'success');
      } else {
        addNotification(`Token do ${PLATFORM_CONFIGS[platform].name} expirado. Reconecte.`, 'error');
      }
    } finally {
      setTesting(null);
    }
  }, [addNotification]);

  // ── Salvar credencial ──────────────────────────────────────────────────────
  const handleSaveCredential = useCallback(() => {
    if (!credAppId.trim()) {
      addNotification('Preencha o App ID.', 'error');
      return;
    }
    const cred: SavedCredential = {
      platform: credPlatform,
      appId: CredentialStore.encode(credAppId.trim()),
      appSecret: credAppSecret.trim() ? CredentialStore.encode(credAppSecret.trim()) : '',
      savedAt: Date.now(),
      testStatus: 'unknown',
    };
    CredentialStore.save(cred);
    setSavedCreds(CredentialStore.getAll());
    setCredAppId('');
    setCredAppSecret('');
    addNotification(`Credenciais de ${PLATFORM_CONFIGS[credPlatform].name} salvas com seguranca.`, 'success');
  }, [credPlatform, credAppId, credAppSecret, addNotification]);

  const handleRemoveCredential = useCallback((platform: PlatformKey) => {
    if (!window.confirm(`Remover credenciais salvas de ${PLATFORM_CONFIGS[platform].name}?`)) return;
    CredentialStore.remove(platform);
    setSavedCreds(CredentialStore.getAll());
    addNotification(`Credenciais de ${PLATFORM_CONFIGS[platform].name} removidas.`, 'info');
  }, [addNotification]);

  // ── Publicar ───────────────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    if (!testCaption.trim()) {
      addNotification('Digite o conteudo antes de publicar.', 'error');
      return;
    }
    const targets = ALL_PLATFORMS.filter(p => isConnected(p));
    if (targets.length === 0) {
      addNotification('Conecte pelo menos uma rede social.', 'error');
      return;
    }

    setPublishingTo([...targets]);
    setPublishResults({});

    const payload: PublishPayload = {
      caption: testCaption,
      mediaType: 'IMAGE',
      hashtags: testCaption.match(/#\w+/g) || [],
    };

    await Promise.allSettled(
      targets.map(async (platform) => {
        try {
          const result = await publishToSocial(platform, payload);
          setPublishResults(prev => ({ ...prev, [platform]: result.postId ? `OK ${result.postId}` : 'OK Publicado' }));
          addNotification(`Publicado no ${PLATFORM_CONFIGS[platform].name}!`, 'success');
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Erro';
          setPublishResults(prev => ({ ...prev, [platform]: `ERRO ${msg.substring(0, 50)}` }));
          addNotification(`Erro no ${PLATFORM_CONFIGS[platform].name}: ${msg}`, 'error');
        } finally {
          setPublishingTo(prev => prev.filter(p => p !== platform));
        }
      })
    );
  }, [testCaption, isConnected, addNotification]);

  const connectedCount = ALL_PLATFORMS.filter(p => isConnected(p)).length;

  return (
    <div className="animate-fade-in">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900 }}>
            Ecossistema <span style={{ color: theme.colors.primary }}>Social Real</span>
          </h2>
          <p style={{ fontSize: '0.8rem', opacity: 0.5, fontWeight: 700 }}>
            {connectedCount} DE {ALL_PLATFORMS.length} PLATAFORMAS CONECTADAS | OAUTH 2.0
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Status dots */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {ALL_PLATFORMS.map(p => {
              const info = getStatusInfo(p);
              return (
                <div key={p} title={`${PLATFORM_CONFIGS[p].name}: ${info.label}`} style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: info.color,
                  transition: 'background 0.3s',
                  boxShadow: info.status === 'connected' ? `0 0 6px ${info.color}88` : 'none',
                }} />
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '0.3rem', background: subBg, padding: '0.25rem', borderRadius: '12px' }}>
            {(['contas', 'credenciais', 'publicar', 'guia'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '0.45rem 0.8rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer',
                background: activeTab === tab ? theme.colors.primary : 'transparent',
                color: activeTab === tab ? (isDark ? '#fff' : '#000') : (isDark ? '#666' : '#999'),
                transition: 'all 0.2s',
              }}>
                {tab === 'contas' ? 'Contas' : tab === 'credenciais' ? 'Credenciais' : tab === 'publicar' ? 'Publicar' : 'Guia'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── ABA: CONTAS ────────────────────────────────────────────────────── */}
      {activeTab === 'contas' && (
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.2rem' }}>
            {ALL_PLATFORMS.map(platform => {
              const config = PLATFORM_CONFIGS[platform];
              const ui = PLATFORM_UI[platform];
              const account = accounts[platform];
              const connected = isConnected(platform);
              const isLoading = connecting === platform;
              const isTesting = testing === platform;
              const hasAppId = !!config.appId;
              const statusInfo = getStatusInfo(platform);
              const savedCred = savedCreds.find(c => c.platform === platform);

              return (
                <div key={platform} style={{
                  borderRadius: '20px', overflow: 'hidden',
                  background: cardBg,
                  border: `2px solid ${statusInfo.color}44`,
                  transition: 'all 0.3s',
                  boxShadow: connected ? `0 4px 20px ${statusInfo.color}22` : 'none',
                }}>
                  {/* Platform header bar */}
                  <div style={{ background: ui.bg, padding: '0.8rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <span style={{ fontSize: '1.3rem' }}>{config.icon}</span>
                    <span style={{ fontWeight: 900, color: ui.textColor, fontSize: '0.95rem' }}>{config.name}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {/* Status badge */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.2rem 0.6rem', borderRadius: '10px',
                        background: `${statusInfo.color}33`,
                      }}>
                        <div style={{
                          width: '7px', height: '7px', borderRadius: '50%',
                          background: statusInfo.color,
                          animation: isLoading ? 'pulse 1s infinite' : 'none',
                          boxShadow: `0 0 4px ${statusInfo.color}`,
                        }} />
                        <span style={{ fontSize: '0.55rem', color: '#fff', fontWeight: 800 }}>
                          {isLoading ? 'AGUARDE' : statusInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Account info */}
                  <div style={{ padding: '1rem 1.2rem' }}>
                    {connected && account ? (
                      <div>
                        {/* User info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' }}>
                          <div style={{
                            width: '44px', height: '44px', borderRadius: '50%',
                            background: ui.bg, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0,
                            border: `2px solid ${statusInfo.color}`,
                          }}>
                            {account.profilePic ? (
                              <img src={account.profilePic} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : config.icon}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: cardText }}>{account.handle}</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>
                              {account.followers.toLocaleString('pt-BR')} seguidores
                            </div>
                          </div>
                        </div>

                        {/* Detalhes da conexao */}
                        <div style={{
                          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
                          marginBottom: '0.8rem',
                        }}>
                          <div style={{
                            padding: '0.5rem', borderRadius: '8px', background: subBg,
                          }}>
                            <div style={{ fontSize: '0.5rem', opacity: 0.4, textTransform: 'uppercase', marginBottom: '0.15rem' }}>Conectado em</div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700 }}>{formatDate(account.connectedAt)}</div>
                          </div>
                          <div style={{
                            padding: '0.5rem', borderRadius: '8px', background: subBg,
                          }}>
                            <div style={{ fontSize: '0.5rem', opacity: 0.4, textTransform: 'uppercase', marginBottom: '0.15rem' }}>Ultima atividade</div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700 }}>{formatRelativeTime(account.connectedAt)}</div>
                          </div>
                        </div>

                        {/* Status card */}
                        <div style={{
                          padding: '0.5rem 0.8rem', borderRadius: '10px',
                          background: `${statusInfo.color}12`,
                          border: `1px solid ${statusInfo.color}33`,
                          marginBottom: '0.8rem',
                        }}>
                          <div style={{ fontSize: '0.62rem', color: statusInfo.color, fontWeight: 700 }}>
                            {statusInfo.status === 'connected' && 'Conectado | API autorizada | Pronto para publicar'}
                            {statusInfo.status === 'expired' && 'Token expirado | Reconecte para continuar'}
                            {statusInfo.status === 'disconnected' && 'Desconectado | Clique para reconectar'}
                          </div>
                          <div style={{ fontSize: '0.52rem', opacity: 0.4, marginTop: '0.15rem', fontFamily: 'monospace' }}>
                            {hasAppId ? 'Credenciais configuradas' : 'Modo demonstracao'} | {savedCred ? 'Cred. salvas localmente' : 'Sem cred. locais'}
                          </div>
                        </div>

                        {/* Botoes */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleTestConnection(platform)}
                            disabled={isTesting}
                            style={{
                              flex: 1, padding: '0.5rem', borderRadius: '10px',
                              background: `${theme.colors.primary}18`,
                              color: theme.colors.primary, fontWeight: 700,
                              fontSize: '0.7rem', cursor: 'pointer',
                              border: `1px solid ${theme.colors.primary}33`,
                              opacity: isTesting ? 0.6 : 1,
                            }}
                          >
                            {isTesting ? 'TESTANDO...' : 'TESTAR'}
                          </button>
                          <button
                            onClick={() => handleDisconnect(platform)}
                            style={{
                              flex: 1, padding: '0.5rem', borderRadius: '10px',
                              background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                              fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer',
                              border: '1px solid rgba(239,68,68,0.2)',
                            }}
                          >
                            DESCONECTAR
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '0.73rem', opacity: 0.5, marginBottom: '0.8rem', lineHeight: 1.5 }}>
                          {hasAppId
                            ? `Clique para se autenticar com sua conta ${config.name} via OAuth 2.0 seguro.`
                            : `Adicione VITE_${platform === 'instagram' || platform === 'facebook' ? 'META' : platform.toUpperCase()}_APP_ID no arquivo .env para habilitar.`
                          }
                        </div>
                        {!hasAppId && (
                          <a
                            href={config.docs}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: 'block', fontSize: '0.65rem', color: PLATFORM_CONFIGS[platform].color, marginBottom: '0.6rem', fontWeight: 700 }}
                          >
                            Ver documentacao da API
                          </a>
                        )}
                        <button
                          onClick={() => handleConnect(platform)}
                          disabled={isLoading}
                          style={{
                            width: '100%', padding: '0.7rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                            background: isLoading ? subBg : ui.bg,
                            color: isLoading ? (isDark ? '#666' : '#999') : ui.textColor,
                            border: 'none', transition: 'all 0.3s',
                            opacity: isLoading ? 0.7 : 1,
                          }}
                        >
                          {isLoading ? (
                            <span>{connectStatus || 'Aguarde...'}</span>
                          ) : (
                            `CONECTAR ${config.name.toUpperCase()}`
                          )}
                        </button>
                      </div>
                    )}

                    {/* Scopes */}
                    <div style={{ marginTop: '0.8rem' }}>
                      <div style={{ fontSize: '0.55rem', opacity: 0.3, marginBottom: '0.3rem' }}>PERMISSOES SOLICITADAS</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {config.scopes.slice(0, 3).map(s => (
                          <span key={s} style={{
                            padding: '0.12rem 0.4rem', borderRadius: '5px', fontSize: '0.5rem',
                            background: `${PLATFORM_CONFIGS[platform].color}12`,
                            color: PLATFORM_CONFIGS[platform].color, fontWeight: 700,
                          }}>
                            {s.split('.').pop() || s}
                          </span>
                        ))}
                        {config.scopes.length > 3 && (
                          <span style={{ padding: '0.12rem 0.4rem', borderRadius: '5px', fontSize: '0.5rem', opacity: 0.3 }}>
                            +{config.scopes.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ABA: CREDENCIAIS ─────────────────────────────────────────────── */}
      {activeTab === 'credenciais' && (
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>

            {/* Form para salvar credenciais */}
            <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.2rem' }}>
                SALVAR CREDENCIAIS
              </h3>
              <p style={{ fontSize: '0.72rem', opacity: 0.5, marginBottom: '1rem', lineHeight: 1.5 }}>
                Salve suas credenciais de API localmente com encoding base64. Os dados ficam
                apenas no seu navegador e nao sao enviados a nenhum servidor.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div>
                  <label style={{ fontSize: '0.65rem', opacity: 0.5, display: 'block', marginBottom: '0.3rem' }}>PLATAFORMA</label>
                  <select
                    value={credPlatform}
                    onChange={e => setCredPlatform(e.target.value as PlatformKey)}
                    style={{
                      width: '100%', padding: '0.6rem', borderRadius: '8px',
                      background: subBg, border: 'none', color: cardText,
                      fontSize: '0.8rem',
                    }}
                  >
                    {ALL_PLATFORMS.map(p => (
                      <option key={p} value={p}>{PLATFORM_CONFIGS[p].icon} {PLATFORM_CONFIGS[p].name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', opacity: 0.5, display: 'block', marginBottom: '0.3rem' }}>APP ID / CLIENT ID</label>
                  <input
                    value={credAppId}
                    onChange={e => setCredAppId(e.target.value)}
                    placeholder="Cole aqui o App ID..."
                    style={{
                      width: '100%', padding: '0.6rem', borderRadius: '8px',
                      background: subBg, border: 'none', color: cardText,
                      fontSize: '0.8rem', fontFamily: 'monospace',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', opacity: 0.5, display: 'block', marginBottom: '0.3rem' }}>APP SECRET / CLIENT SECRET (opcional)</label>
                  <input
                    type="password"
                    value={credAppSecret}
                    onChange={e => setCredAppSecret(e.target.value)}
                    placeholder="Cole aqui o App Secret..."
                    style={{
                      width: '100%', padding: '0.6rem', borderRadius: '8px',
                      background: subBg, border: 'none', color: cardText,
                      fontSize: '0.8rem', fontFamily: 'monospace',
                    }}
                  />
                </div>
                <button
                  onClick={handleSaveCredential}
                  style={{
                    width: '100%', padding: '0.7rem', borderRadius: '10px',
                    background: theme.colors.primary, color: isDark ? '#fff' : '#000',
                    fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                  }}
                >
                  SALVAR CREDENCIAL
                </button>
              </div>

              <div style={{
                marginTop: '1rem', padding: '0.6rem 0.8rem', borderRadius: '10px',
                background: '#f59e0b12', border: '1px solid #f59e0b33',
                fontSize: '0.65rem', color: '#f59e0b', lineHeight: 1.5,
              }}>
                Armazenamento local com base64 encoding. Para seguranca maxima,
                use variaveis de ambiente (.env) em producao.
              </div>
            </div>

            {/* Credenciais salvas */}
            <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.2rem' }}>
                CREDENCIAIS SALVAS
              </h3>

              {savedCreds.length === 0 ? (
                <div style={{
                  padding: '2rem', textAlign: 'center', borderRadius: '12px',
                  background: subBg, opacity: 0.5,
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>&#128274;</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Nenhuma credencial salva</div>
                  <div style={{ fontSize: '0.7rem', marginTop: '0.3rem' }}>Use o formulario ao lado para salvar.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {savedCreds.map(cred => {
                    const config = PLATFORM_CONFIGS[cred.platform];
                    const isRevealed = showSecrets[cred.platform] || false;
                    const statusInfo = getStatusInfo(cred.platform);
                    return (
                      <div key={cred.platform} style={{
                        padding: '0.8rem 1rem', borderRadius: '12px',
                        background: subBg,
                        borderLeft: `3px solid ${config.color}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.1rem' }}>{config.icon}</span>
                            <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{config.name}</span>
                            <div style={{
                              width: '7px', height: '7px', borderRadius: '50%',
                              background: statusInfo.color,
                            }} />
                          </div>
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            <button
                              onClick={() => setShowSecrets(prev => ({ ...prev, [cred.platform]: !isRevealed }))}
                              style={{
                                padding: '0.2rem 0.5rem', borderRadius: '6px',
                                background: 'transparent', border: `1px solid ${isDark ? '#444' : '#ddd'}`,
                                color: cardText, fontSize: '0.6rem', cursor: 'pointer', fontWeight: 700,
                              }}
                            >
                              {isRevealed ? 'OCULTAR' : 'MOSTRAR'}
                            </button>
                            <button
                              onClick={() => handleRemoveCredential(cred.platform)}
                              style={{
                                padding: '0.2rem 0.5rem', borderRadius: '6px',
                                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                color: '#ef4444', fontSize: '0.6rem', cursor: 'pointer', fontWeight: 700,
                              }}
                            >
                              REMOVER
                            </button>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.6, fontFamily: 'monospace', lineHeight: 1.8 }}>
                          <div>App ID: {isRevealed ? CredentialStore.decode(cred.appId) : '****' + CredentialStore.decode(cred.appId).slice(-4)}</div>
                          {cred.appSecret && (
                            <div>Secret: {isRevealed ? CredentialStore.decode(cred.appSecret) : '********'}</div>
                          )}
                        </div>
                        <div style={{ fontSize: '0.55rem', opacity: 0.35, marginTop: '0.4rem' }}>
                          Salvo em {formatDate(cred.savedAt)}
                          {cred.lastTestedAt && ` | Testado ${formatRelativeTime(cred.lastTestedAt)}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ABA: PUBLICAR ──────────────────────────────────────────────────── */}
      {activeTab === 'publicar' && (
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.2rem' }}>
                CONTEUDO PARA PUBLICAR
              </h3>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.4, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Redes selecionadas</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {ALL_PLATFORMS.map(p => {
                    const connected = isConnected(p);
                    const result = publishResults[p];
                    const isPublishing = publishingTo.includes(p);
                    return (
                      <div key={p} style={{
                        padding: '0.4rem 0.7rem', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800,
                        background: result?.startsWith('OK') ? '#22c55e22'
                          : result?.startsWith('ERRO') ? '#ef444422'
                            : isPublishing ? `${PLATFORM_CONFIGS[p].color}33`
                              : connected ? `${PLATFORM_CONFIGS[p].color}18`
                                : subBg,
                        color: result?.startsWith('OK') ? '#22c55e'
                          : result?.startsWith('ERRO') ? '#ef4444'
                            : isPublishing ? PLATFORM_CONFIGS[p].color
                              : connected ? PLATFORM_CONFIGS[p].color
                                : (isDark ? '#444' : '#ccc'),
                        border: `1px solid ${connected ? `${PLATFORM_CONFIGS[p].color}33` : 'transparent'}`,
                        transition: 'all 0.3s',
                      }}>
                        {PLATFORM_CONFIGS[p].icon} {PLATFORM_CONFIGS[p].name}
                        {isPublishing && ' ...'}
                        {result && (
                          <span style={{ display: 'block', fontSize: '0.5rem', marginTop: '2px', fontWeight: 500, opacity: 0.8 }}>
                            {result}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {connectedCount === 0 && (
                  <div style={{ padding: '0.8rem', borderRadius: '10px', background: '#f59e0b18', border: '1px solid #f59e0b33', marginTop: '0.8rem', fontSize: '0.72rem', color: '#f59e0b' }}>
                    Nenhuma conta conectada. Conecte ao menos uma rede na aba "Contas".
                  </div>
                )}
              </div>

              <textarea
                value={testCaption}
                onChange={e => setTestCaption(e.target.value)}
                placeholder={"Escreva o conteudo para publicar em todas as redes conectadas...\n\nDica: inclua hashtags como #marketing #graynegocios"}
                rows={8}
                style={{
                  width: '100%', padding: '1rem', borderRadius: '12px',
                  background: subBg, border: 'none', color: cardText, fontSize: '0.85rem',
                  resize: 'none', lineHeight: 1.6, marginBottom: '1rem',
                }}
              />

              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button
                  onClick={handlePublish}
                  disabled={connectedCount === 0 || publishingTo.length > 0}
                  style={{
                    flex: 1, padding: '1rem', borderRadius: '12px', fontWeight: 900,
                    background: connectedCount > 0 ? theme.colors.primary : '#2d2d2d',
                    color: connectedCount > 0 ? (isDark ? '#fff' : '#000') : '#555',
                    fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.3s',
                    boxShadow: connectedCount > 0 ? `0 4px 20px ${theme.colors.primary}44` : 'none',
                  }}
                >
                  {publishingTo.length > 0
                    ? `PUBLICANDO em ${publishingTo.length} redes...`
                    : `PUBLICAR AGORA em ${connectedCount} REDES`
                  }
                </button>
              </div>

              <div style={{ marginTop: '0.8rem', fontSize: '0.65rem', opacity: 0.3, lineHeight: 1.5 }}>
                A publicacao e feita via API oficial de cada plataforma usando seus tokens OAuth.
                Certifique-se de que sua conta tem as permissoes necessarias.
              </div>
            </div>

            {/* Limites por plataforma */}
            <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.2rem' }}>
                LIMITES POR PLATAFORMA
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {([
                  { p: 'instagram' as PlatformKey, limit: '2.200 chars', formats: 'Feed, Reels, Stories, Carrossel', rate: '25 posts/dia' },
                  { p: 'facebook' as PlatformKey, limit: '63.206 chars', formats: 'Post, Reels, Stories, Grupo', rate: 'Sem limite' },
                  { p: 'linkedin' as PlatformKey, limit: '3.000 chars', formats: 'Post, Artigo, Video, Documento', rate: '150 req/dia' },
                  { p: 'tiktok' as PlatformKey, limit: '2.200 chars', formats: 'Video, Foto Slideshow', rate: '50 posts/dia' },
                  { p: 'youtube' as PlatformKey, limit: '5.000 chars', formats: 'Shorts, Video longo', rate: '50 uploads/dia' },
                  { p: 'pinterest' as PlatformKey, limit: '500 chars', formats: 'Pin, Board, Video Pin', rate: '200 pins/dia' },
                ]).map(({ p, limit, formats, rate }) => {
                  const statusInfo = getStatusInfo(p);
                  return (
                    <div key={p} style={{
                      padding: '0.8rem 1rem', borderRadius: '12px', background: subBg,
                      borderLeft: `3px solid ${statusInfo.color}`,
                      opacity: isConnected(p) ? 1 : 0.45,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                          {PLATFORM_CONFIGS[p].icon} {PLATFORM_CONFIGS[p].name}
                        </span>
                        <span style={{
                          fontSize: '0.55rem', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 800,
                          background: `${statusInfo.color}18`,
                          color: statusInfo.color,
                        }}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.65rem', opacity: 0.5, lineHeight: 1.6 }}>
                        {limit} | {formats}<br />Rate: {rate}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ABA: GUIA DE CONFIGURACAO ──────────────────────────────────────── */}
      {activeTab === 'guia' && (
        <div className="animate-fade-in">
          <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
            <h3 style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: '1.5rem' }}>
              GUIA DE CONFIGURACAO -- APIs Reais
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Step 1 */}
              <div style={{ padding: '1.2rem', borderRadius: '16px', background: subBg, borderLeft: '4px solid #9370DB' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#9370DB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.8rem', color: '#fff', flexShrink: 0 }}>1</div>
                  <span style={{ fontWeight: 800 }}>Crie um arquivo <code style={{ background: '#33333388', padding: '0.1rem 0.4rem', borderRadius: '4px', fontFamily: 'monospace' }}>.env.local</code> na raiz do projeto</span>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: 1.8, opacity: 0.7, background: '#0a0a0a', padding: '1rem', borderRadius: '10px', overflow: 'auto', color: '#ccc' }}>
                  {`# Copie de .env.example e preencha:
VITE_META_APP_ID=1234567890
VITE_META_APP_SECRET=abc123...
VITE_LINKEDIN_CLIENT_ID=xyz...
VITE_TIKTOK_CLIENT_KEY=awe...
VITE_BACKEND_URL=http://localhost:8080`}
                </div>
              </div>

              {/* Apps por plataforma */}
              {ALL_PLATFORMS.map(platform => {
                const config = PLATFORM_CONFIGS[platform];
                return (
                  <div key={platform} style={{ padding: '1.2rem', borderRadius: '16px', background: subBg, borderLeft: `4px solid ${config.color}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' }}>
                      <span style={{ fontSize: '1.3rem' }}>{config.icon}</span>
                      <span style={{ fontWeight: 800 }}>{config.name}</span>
                      <a
                        href={config.docs}
                        target="_blank"
                        rel="noreferrer"
                        style={{ marginLeft: 'auto', fontSize: '0.65rem', color: config.color, fontWeight: 700 }}
                      >
                        Documentacao
                      </a>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.73rem', opacity: 0.7, lineHeight: 1.6 }}>
                      {platform === 'instagram' || platform === 'facebook' ? ([
                        '1. Acesse developers.facebook.com e crie um App (tipo: Business)',
                        '2. Adicione produtos: Instagram Graph API + Facebook Login',
                        '3. Em "Casos de Uso": adicione instagram_content_publish',
                        '4. Settings - Basic: copie o App ID e gere o App Secret',
                        `5. Login Settings - Valid OAuth Redirect URIs: adicione ${buildAuthUrl(platform).split('?')[0]}`,
                        '6. Solicite revisao para permissoes de publicacao (instagram_content_publish)',
                      ]).map((s, i) => <div key={i}>{s}</div>) : null}
                      {platform === 'linkedin' ? ([
                        '1. Acesse linkedin.com/developers e crie um App',
                        '2. Vincule a uma Company Page do LinkedIn',
                        '3. Auth tab - Adicione Redirect URL do sistema',
                        '4. Solicite acesso ao produto "Share on LinkedIn"',
                        '5. Copie Client ID e Secret do Auth tab',
                      ]).map((s, i) => <div key={i}>{s}</div>) : null}
                      {platform === 'tiktok' ? ([
                        '1. Acesse developers.tiktok.com e crie um App web',
                        '2. Adicione Login Kit + Content Posting API',
                        '3. Configure a Redirect URI do sistema',
                        '4. Solicite aprovacao para video.publish scope',
                        '5. Copie o Client Key (nao Client ID)',
                      ]).map((s, i) => <div key={i}>{s}</div>) : null}
                      {platform === 'youtube' ? ([
                        '1. Acesse console.cloud.google.com e crie um projeto',
                        '2. APIs Library - ative "YouTube Data API v3"',
                        '3. Credentials - OAuth 2.0 Client ID - Web Application',
                        '4. Adicione a Redirect URI nas URIs autorizadas',
                        '5. Copie o Client ID e Client Secret',
                      ]).map((s, i) => <div key={i}>{s}</div>) : null}
                      {platform === 'pinterest' ? ([
                        '1. Acesse developers.pinterest.com/apps e crie um app',
                        '2. Configure a Redirect URI',
                        '3. Solicite acesso as permissoes de pins:write',
                        '4. Copie o App ID e App Secret',
                      ]).map((s, i) => <div key={i}>{s}</div>) : null}
                    </div>
                    <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {config.scopes.map(s => (
                        <span key={s} style={{ padding: '0.2rem 0.5rem', borderRadius: '5px', fontSize: '0.55rem', background: `${config.color}22`, color: config.color, fontWeight: 700 }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Backend note */}
              <div style={{ padding: '1.2rem', borderRadius: '16px', background: '#f59e0b18', border: '1px solid #f59e0b33' }}>
                <div style={{ fontWeight: 800, color: '#f59e0b', marginBottom: '0.6rem' }}>IMPORTANTE: Backend necessario</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8, lineHeight: 1.7 }}>
                  A troca do codigo OAuth por token de acesso <strong>deve ser feita no backend</strong> para proteger o App Secret.
                  O sistema ja esta configurado para chamar <code style={{ background: '#0a0a0a', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>VITE_BACKEND_URL/api/oauth/exchange</code>.
                  <br /><br />
                  Em desenvolvimento, use o servidor Node.js incluido em <code>/server/</code>.
                  Em producao, configure no seu servidor (Vercel, Railway, etc).
                </div>
              </div>

              {/* Redirect URI box */}
              <div style={{ padding: '1rem', borderRadius: '12px', background: `${theme.colors.primary}15`, border: `1px solid ${theme.colors.primary}33` }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: theme.colors.primary, marginBottom: '0.4rem' }}>REDIRECT URI -- adicione em TODOS os apps</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-all' }}>
                  {window.location.origin}/grayart/oauth/callback
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstagramIntegrations;
