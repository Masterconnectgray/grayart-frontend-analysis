import React, { useCallback, useEffect, useState } from 'react';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
import { useAppContext } from '../context/AppContext';
import { Card, Button } from '../design-system';
import { PlatformIcon } from '../constants/SocialIcons';
import {
  saveSocialCredential,
  listSocialCredentials,
  deleteSocialCredential,
  getSocialConfig,
} from '../services/FlowAPIService';
import {
  disconnectPlatform,
  fetchConnectedAccounts,
  loginWithPlatform,
  type ConnectedAccount,
  type PlatformKey,
} from '../services/SocialOAuthService';
import { Link2, Trash2, Settings2, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';

interface InstagramIntegrationsProps {
  division: Division;
}

type ManageablePlatformKey = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'x';

const ALL_PLATFORMS: ManageablePlatformKey[] = ['instagram', 'tiktok', 'youtube', 'facebook', 'linkedin', 'x'];

const PLATFORM_INFO: Record<ManageablePlatformKey, { label: string; color: string; supportsOAuth: boolean }> = {
  instagram: { label: 'Instagram', color: '#E4405F', supportsOAuth: true },
  tiktok: { label: 'TikTok', color: '#010101', supportsOAuth: true },
  youtube: { label: 'YouTube', color: '#FF0000', supportsOAuth: true },
  facebook: { label: 'Facebook', color: '#1877F2', supportsOAuth: true },
  linkedin: { label: 'LinkedIn', color: '#0A66C2', supportsOAuth: true },
  x: { label: 'X (Twitter)', color: '#000000', supportsOAuth: false },
};

const OAUTH_PLATFORMS = new Set<PlatformKey>(['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'pinterest']);

function normalizeAccounts(accounts: ConnectedAccount[]): ConnectedAccount[] {
  return accounts.sort((a, b) => {
    if (a.platform !== b.platform) return a.platform.localeCompare(b.platform);
    return b.connectedAt - a.connectedAt;
  });
}

const InstagramIntegrations: React.FC<InstagramIntegrationsProps> = ({ division }) => {
  const { addNotification } = useAppContext();
  const theme = DIVISIONS[division];

  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [credPlatform, setCredPlatform] = useState<ManageablePlatformKey>('instagram');
  const [credAppId, setCredAppId] = useState('');
  const [credAppSecret, setCredAppSecret] = useState('');
  const [savedCreds, setSavedCreds] = useState<{ platform: string; hasAppId: boolean; hasAppSecret: boolean }[]>([]);
  const [platformConfig, setPlatformConfig] = useState<Record<string, boolean>>({});
  const [savingCred, setSavingCred] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<ManageablePlatformKey | null>(null);
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<ManageablePlatformKey | null>(null);

  const loadSavedCreds = useCallback(async () => {
    setSavedCreds(await listSocialCredentials());
  }, []);

  const loadPlatformConfig = useCallback(async () => {
    const config = await getSocialConfig();
    setPlatformConfig(
      Object.fromEntries(config.map((item) => [item.platform, item.configured]))
    );
  }, []);

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const connected = await fetchConnectedAccounts();
      setAccounts(normalizeAccounts(connected));
    } catch {
      setAccounts([]);
      addNotification('Não foi possível sincronizar as contas sociais.', 'error');
    } finally {
      setLoadingAccounts(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadSavedCreds().catch((error) => {
      console.error('Erro ao carregar credenciais:', error);
    });
    loadPlatformConfig().catch((error) => {
      console.error('Erro ao carregar configuração OAuth:', error);
    });
    loadAccounts().catch((error) => {
      console.error('Erro ao carregar contas:', error);
    });
  }, [loadAccounts, loadPlatformConfig, loadSavedCreds]);

  const handleConnect = useCallback(async (platform: ManageablePlatformKey) => {
    if (!OAUTH_PLATFORMS.has(platform as PlatformKey)) {
      addNotification(`OAuth para ${PLATFORM_INFO[platform].label} ainda não está habilitado no backend.`, 'info');
      return;
    }

    if (!platformConfig[platform]) {
      addNotification(`Falta configurar OAuth de ${PLATFORM_INFO[platform].label} no backend antes de conectar.`, 'error');
      return;
    }

    setConnectingPlatform(platform);
    try {
      const account = await loginWithPlatform(platform as PlatformKey, () => undefined);
      await loadAccounts();
      addNotification(`${PLATFORM_INFO[platform].label} conectado: ${account.handle}`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : `Erro ao conectar ${PLATFORM_INFO[platform].label}`;
      addNotification(message, 'error');
    } finally {
      setConnectingPlatform(null);
    }
  }, [addNotification, loadAccounts, platformConfig]);

  const handleDisconnect = useCallback(async (platform: ManageablePlatformKey) => {
    if (!OAUTH_PLATFORMS.has(platform as PlatformKey)) {
      addNotification(`Não há conexão persistida de backend para ${PLATFORM_INFO[platform].label}.`, 'info');
      return;
    }

    setDisconnectingPlatform(platform);
    try {
      await disconnectPlatform(platform as PlatformKey);
      await loadAccounts();
      addNotification(`${PLATFORM_INFO[platform].label} desconectado.`, 'info');
    } catch (error) {
      const message = error instanceof Error ? error.message : `Erro ao desconectar ${PLATFORM_INFO[platform].label}`;
      addNotification(message, 'error');
    } finally {
      setDisconnectingPlatform(null);
    }
  }, [addNotification, loadAccounts]);

  const handleSaveCredential = useCallback(async () => {
    if (!credAppId.trim()) {
      addNotification('Preencha o App ID.', 'error');
      return;
    }
    setSavingCred(true);
    try {
      const ok = await saveSocialCredential(credPlatform, credAppId.trim(), credAppSecret.trim());
      if (ok) {
        addNotification(`Credenciais de ${PLATFORM_INFO[credPlatform].label} salvas.`, 'success');
        setCredAppId('');
        setCredAppSecret('');
        await loadSavedCreds();
        await loadPlatformConfig();
      } else {
        addNotification('Erro ao salvar credenciais. Verifique o backend.', 'error');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      addNotification(`Erro ao salvar: ${errorMsg}`, 'error');
    } finally {
      setSavingCred(false);
    }
  }, [credPlatform, credAppId, credAppSecret, addNotification, loadPlatformConfig, loadSavedCreds]);

  const getAccountsByPlatform = (platform: ManageablePlatformKey) => {
    return accounts.filter((account) => account.platform === platform);
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-extrabold" style={{ color: theme.colors.primary }}>Suas Redes</h2>
          <p className="text-xs opacity-50 mt-1 font-semibold">
            {accounts.length} conta{accounts.length !== 1 ? 's' : ''} conectada{accounts.length !== 1 ? 's' : ''}
            {' • '}estado real sincronizado com o backend
          </p>
        </div>
        <button
          onClick={() => setShowAdmin(!showAdmin)}
          className={`w-10 h-10 rounded-xl flex justify-center items-center transition-all ${
            showAdmin ? 'bg-slate-700 text-white' : 'bg-white/5 opacity-50 hover:opacity-100'
          }`}
          title="Credenciais API"
        >
          <Settings2 size={18} />
        </button>
      </div>

      {!showAdmin && (
        <div className="flex flex-col gap-6">
          {ALL_PLATFORMS.map((platform) => {
            const info = PLATFORM_INFO[platform];
            const platformAccounts = getAccountsByPlatform(platform);
            const isConnecting = connectingPlatform === platform;
            const isDisconnecting = disconnectingPlatform === platform;
            const hasActiveAccount = platformAccounts.some((account) => account.status === 'active');
            const isConfigured = !!platformConfig[platform];

            return (
              <Card key={platform}>
                <div className="flex items-center justify-between mb-4 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: info.color }}>
                      <PlatformIcon platformId={platform} size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{info.label}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] opacity-40 font-bold">
                          {platformAccounts.length} conta{platformAccounts.length !== 1 ? 's' : ''}
                        </span>
                        <span className={`text-[10px] font-bold ${
                          hasActiveAccount ? 'text-emerald-500' : info.supportsOAuth && isConfigured ? 'text-amber-500' : 'text-slate-400'
                        }`}>
                          {hasActiveAccount ? 'CONECTADA' : (info.supportsOAuth ? (isConfigured ? 'DESCONECTADA' : 'NÃO CONFIGURADA') : 'INDISPONÍVEL')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {info.supportsOAuth ? (
                      <>
                        <Button
                          size="sm"
                          variant={hasActiveAccount ? 'secondary' : 'primary'}
                          onClick={() => handleConnect(platform)}
                          loading={isConnecting}
                          disabled={isDisconnecting || !isConfigured}
                          icon={isConnecting ? undefined : Link2}
                        >
                          {hasActiveAccount ? 'Reconectar' : 'Conectar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDisconnect(platform)}
                          loading={isDisconnecting}
                          disabled={!platformAccounts.length || isConnecting}
                          icon={isDisconnecting ? undefined : Trash2}
                        >
                          Desconectar
                        </Button>
                      </>
                    ) : (
                      <div className="text-[11px] font-bold text-amber-500 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Sem fluxo OAuth ativo
                      </div>
                    )}
                  </div>
                </div>

                {info.supportsOAuth && !isConfigured && (
                  <div className="mb-4 text-[11px] font-bold text-amber-500 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    OAuth ainda não configurado para {info.label}. Salve as credenciais na área administrativa.
                  </div>
                )}

                {loadingAccounts ? (
                  <div className="text-[11px] opacity-40 font-bold py-2 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sincronizando contas...
                  </div>
                ) : platformAccounts.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {platformAccounts.map((account) => (
                      <div
                        key={`${account.platform}-${account.userId}-${account.connectedAt}`}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 transition-all hover:bg-white/8"
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: info.color }}
                        >
                          {(account.handle || info.label)[0]?.toUpperCase()}
                        </div>
                        <div className="leading-tight">
                          <div className="text-xs font-bold">{account.handle}</div>
                          <div className="text-[10px] opacity-50">{account.name}</div>
                        </div>
                        <div className={`ml-2 text-[10px] font-bold ${
                          account.status === 'active' ? 'text-emerald-500' : account.status === 'expired' ? 'text-amber-500' : 'text-red-500'
                        }`}>
                          {account.status === 'active' ? 'ATIVA' : account.status === 'expired' ? 'EXPIRADA' : 'ERRO'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] opacity-30 font-bold text-center py-2">
                    Nenhuma conta conectada no backend
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {showAdmin && (
        <div className="animate-in fade-in duration-300 max-w-xl">
          <Card>
            <h3 className="text-lg font-bold mb-1">Credenciais API (OAuth)</h3>
            <p className="text-xs opacity-40 mb-4">
              Configure App ID e Secret no backend para habilitar conexão OAuth real.
            </p>
            <div className="flex flex-col gap-3 mb-6">
              <select
                value={credPlatform}
                onChange={(e) => setCredPlatform(e.target.value as ManageablePlatformKey)}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-sm font-bold focus:outline-none focus:border-[var(--primary-color)]"
              >
                {ALL_PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>{PLATFORM_INFO[platform].label}</option>
                ))}
              </select>
              <input
                value={credAppId}
                onChange={(e) => setCredAppId(e.target.value)}
                placeholder="App ID / Client ID"
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-sm font-mono focus:outline-none focus:border-[var(--primary-color)]"
              />
              <input
                type="password"
                value={credAppSecret}
                onChange={(e) => setCredAppSecret(e.target.value)}
                placeholder="App Secret / Client Secret"
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-sm font-mono focus:outline-none focus:border-[var(--primary-color)]"
              />
              <Button size="lg" fullWidth onClick={handleSaveCredential} loading={savingCred}>
                SALVAR CREDENCIAL
              </Button>
            </div>

            {savedCreds.length > 0 && (
              <div>
                <div className="text-[10px] font-bold opacity-30 uppercase tracking-widest mb-3">Credenciais Salvas</div>
                <div className="flex flex-col gap-2">
                  {savedCreds.map((cred) => (
                    <div key={cred.platform} className="p-3 rounded-xl bg-white/5 flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                        <PlatformIcon platformId={cred.platform} size={24} />
                        <div>
                          <div className="font-bold text-sm">{PLATFORM_INFO[cred.platform as ManageablePlatformKey]?.label || cred.platform}</div>
                          <div className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            {cred.hasAppId ? 'ID' : ''}{cred.hasAppId && cred.hasAppSecret ? ' · ' : ''}{cred.hasAppSecret ? 'SECRET' : ''} OK
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          deleteSocialCredential(cred.platform).then(async () => {
                            await loadSavedCreds();
                            await loadPlatformConfig();
                          });
                        }}
                        className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default InstagramIntegrations;
