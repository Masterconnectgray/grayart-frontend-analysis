import { bffFetch } from './BFFClient';

export const PLATFORM_CONFIGS = {
  instagram: {
    name: 'Instagram',
    icon: '📸',
    color: '#E4405F',
    gradient: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
  },
  facebook: {
    name: 'Facebook',
    icon: '🔵',
    color: '#1877F2',
    gradient: '#1877F2',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: '💼',
    color: '#0A66C2',
    gradient: '#0A66C2',
  },
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    color: '#010101',
    gradient: 'linear-gradient(135deg, #010101, #ff0050)',
  },
  youtube: {
    name: 'YouTube',
    icon: '▶️',
    color: '#FF0000',
    gradient: '#FF0000',
  },
  pinterest: {
    name: 'Pinterest',
    icon: '📌',
    color: '#E60023',
    gradient: '#E60023',
  },
} as const;

export type PlatformKey = keyof typeof PLATFORM_CONFIGS;
let tokenCache: Partial<Record<PlatformKey, SocialToken>> = {};
let accountCache: ConnectedAccount[] = [];

export interface SocialToken {
  platform: PlatformKey;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  userId: string;
  pageId?: string;
}

export interface ConnectedAccount {
  platform: PlatformKey;
  handle: string;
  name: string;
  profilePic?: string;
  followers: number;
  userId: string;
  pageId?: string;
  connectedAt: number;
  status: 'active' | 'expired' | 'error';
}

export interface PublishPayload {
  caption: string;
  mediaUrl?: string;
  mediaType?: 'IMAGE' | 'VIDEO' | 'REELS' | 'CAROUSEL';
  hashtags?: string[];
  scheduleAt?: number;
}

export interface ScheduledSocialPost {
  id: number;
  status: string;
}

function waitForOAuthPopup(platform: PlatformKey, authUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const width = 600;
    const height = 760;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const popup = window.open(
      authUrl,
      `oauth_${platform}`,
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      reject(new Error('Popup bloqueado. Permita popups para este site.'));
      return;
    }

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Timeout ao concluir autenticação.'));
    }, 120000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      window.clearInterval(pollClose);
      window.removeEventListener('message', handler);
    };

    const handler = (event: MessageEvent) => {
      if (event.source !== popup) return;
      if (event.data?.type !== 'oauth_callback') return;
      if (event.data?.success === false) {
        cleanup();
        reject(new Error(event.data?.error || 'Falha ao concluir autenticação.'));
        return;
      }
      cleanup();
      resolve();
    };

    const pollClose = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error('Login cancelado pelo usuário.'));
      }
    }, 500);

    window.addEventListener('message', handler);
  });
}

export const TokenStore = {
  getAll(): Record<PlatformKey, SocialToken> {
    return tokenCache as Record<PlatformKey, SocialToken>;
  },

  get(platform: PlatformKey): SocialToken | null {
    return this.getAll()[platform] || null;
  },

  save(token: SocialToken): void {
    tokenCache = { ...tokenCache, [token.platform]: token };
  },

  remove(platform: PlatformKey): void {
    const all = { ...tokenCache };
    delete all[platform];
    tokenCache = all;
  },

  isValid(platform: PlatformKey): boolean {
    const token = this.get(platform);
    return !!token && token.expiresAt > Date.now();
  },
};

export const AccountStore = {
  getAll(): ConnectedAccount[] {
    return accountCache;
  },

  save(account: ConnectedAccount): void {
    accountCache = accountCache.filter((item) => item.platform !== account.platform);
    accountCache.push(account);
  },

  saveAll(accounts: ConnectedAccount[]): void {
    accountCache = [...accounts];
  },

  remove(platform: PlatformKey): void {
    accountCache = accountCache.filter((item) => item.platform !== platform);
  },
};

async function syncAccountsFromServer() {
  const response = await bffFetch('/social/accounts');
  if (!response.ok) {
    throw new Error('Não foi possível sincronizar contas conectadas.');
  }

  const data = await response.json() as {
    accounts: Array<{
      platform: PlatformKey;
      expires_at?: string | null;
      account_name?: string | null;
      account_id?: string | null;
    }>;
  };

  const accounts = data.accounts.map((item) => {
    const expiresAt = item.expires_at ? new Date(item.expires_at).getTime() : Date.now() + 3600000;
    const token: SocialToken = {
      platform: item.platform,
      accessToken: '',
      expiresAt,
      userId: item.account_id || '',
      pageId: item.account_id || undefined,
    };
    TokenStore.save(token);

    return {
      platform: item.platform,
      handle: item.account_name || item.account_id || PLATFORM_CONFIGS[item.platform].name,
      name: item.account_name || PLATFORM_CONFIGS[item.platform].name,
      followers: 0,
      userId: item.account_id || '',
      pageId: item.account_id || undefined,
      connectedAt: Date.now(),
      status: expiresAt < Date.now() ? 'expired' : 'active',
    } satisfies ConnectedAccount;
  });

  AccountStore.saveAll(accounts);
  return accounts;
}

export async function fetchConnectedAccounts(): Promise<ConnectedAccount[]> {
  return syncAccountsFromServer();
}

export async function publishToSocial(
  platform: PlatformKey,
  payload: PublishPayload
): Promise<{ success: boolean; postId?: string; url?: string }> {
  const response = await bffFetch('/social/publish', {
    method: 'POST',
    body: JSON.stringify({
      platform,
      content: payload.caption,
      media_url: payload.mediaUrl,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Erro ao publicar no ${platform}`);
  }

  const data = await response.json() as { job_id: string; result?: { url?: string } };
  return { success: true, postId: String(data.job_id), url: data.result?.url };
}

export async function scheduleToSocial(
  platform: string,
  payload: PublishPayload
): Promise<ScheduledSocialPost> {
  if (!payload.scheduleAt) {
    throw new Error('scheduleAt é obrigatório para agendamento.');
  }

  const response = await bffFetch('/social/schedule', {
    method: 'POST',
    body: JSON.stringify({
      platform,
      content: payload.caption,
      media_url: payload.mediaUrl,
      scheduled_at: new Date(payload.scheduleAt).toISOString(),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Erro ao agendar no ${platform}`);
  }

  const data = await response.json() as { scheduled_post_id: number; status: string };
  return {
    id: data.scheduled_post_id,
    status: data.status,
  };
}

export function getConnectionStatus(platform: PlatformKey): 'connected' | 'expired' | 'disconnected' {
  const token = TokenStore.get(platform);
  if (!token) return 'disconnected';
  if (!TokenStore.isValid(platform)) return 'expired';
  return 'connected';
}

export async function disconnectPlatform(platform: PlatformKey): Promise<void> {
  const response = await bffFetch(`/social/disconnect/${platform}`, {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 404) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Erro ao desconectar ${platform}`);
  }

  TokenStore.remove(platform);
  AccountStore.remove(platform);
}

export async function loginWithPlatform(
  platform: PlatformKey,
  onStatus: (msg: string) => void
): Promise<ConnectedAccount> {
  onStatus(`Abrindo login ${PLATFORM_CONFIGS[platform].name}...`);

  const connectResponse = await bffFetch('/social/connect', {
    method: 'POST',
    body: JSON.stringify({
      platform,
      frontendOrigin: window.location.origin,
    }),
  });

  if (!connectResponse.ok) {
    const err = await connectResponse.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Erro ao iniciar conexão ${platform}`);
  }

  const connectData = await connectResponse.json() as { authUrl: string };
  await waitForOAuthPopup(platform, connectData.authUrl);

  onStatus('Sincronizando conta conectada...');
  const accounts = await syncAccountsFromServer();
  const account = accounts.find((item) => item.platform === platform);

  if (!account) {
    throw new Error(`Conta ${platform} conectada, mas não encontrada no backend.`);
  }

  onStatus(`Conta ${account.handle} conectada!`);
  return account;
}

export async function simulateLoginWithPlatform(platform: PlatformKey): Promise<ConnectedAccount> {
  const mockAccount: ConnectedAccount = {
    platform,
    handle: `@grayart_${platform}_test`,
    name: `Gray Art ${PLATFORM_CONFIGS[platform].name} (Simulado)`,
    followers: 1250,
    userId: `mock_${platform}_${Date.now()}`,
    connectedAt: Date.now(),
    status: 'active',
  };
  
  AccountStore.save(mockAccount);
  
  return new Promise(resolve => setTimeout(() => resolve(mockAccount), 1000));
}

export async function loginWithGoogle(onStatus: (msg: string) => void): Promise<ConnectedAccount> {
  return loginWithPlatform('youtube', onStatus);
}
