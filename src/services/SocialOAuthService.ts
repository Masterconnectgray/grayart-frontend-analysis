/**
 * SocialOAuthService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Serviço central de integração OAuth com redes sociais reais.
 *
 * COMO FUNCIONA (fluxo OAuth 2.0):
 * 1. Usuário clica em "Conectar" → abrimos popup com URL de autorização da plataforma
 * 2. Usuário loga/autoriza na plataforma → plataforma redireciona para REDIRECT_URI com `code`
 * 3. Backend troca `code` por `access_token`
 * 4. Token é salvo no localStorage e usado para publicar conteúdo
 *
 * CONFIGURAÇÃO NECESSÁRIA (por plataforma):
 * ─── Instagram / Facebook ─────────────────────────────────────────────────────
 *   1. Acesse https://developers.facebook.com/
 *   2. Crie um App → Tipo: Business
 *   3. Adicione produto: Instagram Graph API + Facebook Login
 *   4. Em "Casos de Uso": adicione instagram_content_publish, instagram_manage_insights
 *   5. App Settings → Basic: copie App ID e App Secret
 *   6. Em OAuth Redirect URIs adicione: https://www.flowgray.com.br/grayart/oauth/callback
 *
 * ─── LinkedIn ─────────────────────────────────────────────────────────────────
 *   1. Acesse https://www.linkedin.com/developers/apps
 *   2. Crie App → Vinculado à página da empresa
 *   3. Auth tab → Adicione redirect URL: https://www.flowgray.com.br/grayart/oauth/callback
 *   4. Copie Client ID e Client Secret
 *
 * ─── TikTok ───────────────────────────────────────────────────────────────────
 *   1. Acesse https://developers.tiktok.com/
 *   2. Crie App → App Type: Web
 *   3. Adicione produto: Login Kit + Content Posting API
 *   4. Redirect URI: https://www.flowgray.com.br/grayart/oauth/callback
 *
 * ─── YouTube (Google) ─────────────────────────────────────────────────────────
 *   1. Acesse https://console.cloud.google.com/
 *   2. Crie projeto → APIs & Services → Credentials
 *   3. Crie OAuth 2.0 Client ID → Tipo: Web Application
 *   4. Adicione redirect URI: https://www.flowgray.com.br/grayart/oauth/callback
 *   5. Ative YouTube Data API v3
 */

import { flowFetch } from './FlowAPIService';

// ─── Configurações das Plataformas ────────────────────────────────────────────
// ⚠️  PREENCHA AQUI COM SUAS CREDENCIAIS REAIS
export const PLATFORM_CONFIGS = {
  instagram: {
    name: 'Instagram',
    icon: '📸',
    color: '#E4405F',
    gradient: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
    appId: import.meta.env.VITE_META_APP_ID || '',         // Ex: "1234567890"
    appSecret: import.meta.env.VITE_META_APP_SECRET || '', // NÃO exponha no frontend
    scopes: [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_insights',
      'pages_show_list',
    ],
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    apiBase: 'https://graph.facebook.com/v19.0',
    docs: 'https://developers.facebook.com/docs/instagram-api/guides/content-publishing',
  },

  facebook: {
    name: 'Facebook',
    icon: '🔵',
    color: '#1877F2',
    gradient: '#1877F2',
    appId: import.meta.env.VITE_META_APP_ID || '',
    appSecret: import.meta.env.VITE_META_APP_SECRET || '',
    scopes: [
      'pages_manage_posts',
      'pages_read_engagement',
      'publish_to_groups',
      'pages_show_list',
    ],
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    apiBase: 'https://graph.facebook.com/v19.0',
    docs: 'https://developers.facebook.com/docs/pages-api/posts',
  },

  linkedin: {
    name: 'LinkedIn',
    icon: '💼',
    color: '#0A66C2',
    gradient: '#0A66C2',
    appId: import.meta.env.VITE_LINKEDIN_CLIENT_ID || '',
    appSecret: import.meta.env.VITE_LINKEDIN_CLIENT_SECRET || '',
    scopes: [
      'w_member_social',
      'r_liteprofile',
      'r_emailaddress',
      'r_organization_social',
      'w_organization_social',
    ],
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    apiBase: 'https://api.linkedin.com/v2',
    docs: 'https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/share-api',
  },

  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    color: '#010101',
    gradient: 'linear-gradient(135deg, #010101, #ff0050)',
    appId: import.meta.env.VITE_TIKTOK_CLIENT_KEY || '',
    appSecret: import.meta.env.VITE_TIKTOK_CLIENT_SECRET || '',
    scopes: [
      'user.info.basic',
      'video.upload',
      'video.publish',
    ],
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    apiBase: 'https://open.tiktokapis.com/v2',
    docs: 'https://developers.tiktok.com/doc/content-posting-api-get-started',
  },

  youtube: {
    name: 'YouTube',
    icon: '▶️',
    color: '#FF0000',
    gradient: '#FF0000',
    appId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    appSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
    scopes: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl',
    ],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    apiBase: 'https://www.googleapis.com/youtube/v3',
    docs: 'https://developers.google.com/youtube/v3/guides/uploading_a_video',
  },

  pinterest: {
    name: 'Pinterest',
    icon: '📌',
    color: '#E60023',
    gradient: '#E60023',
    appId: import.meta.env.VITE_PINTEREST_APP_ID || '',
    appSecret: import.meta.env.VITE_PINTEREST_APP_SECRET || '',
    scopes: [
      'boards:read',
      'boards:write',
      'pins:read',
      'pins:write',
    ],
    authUrl: 'https://www.pinterest.com/oauth/',
    tokenUrl: 'https://api.pinterest.com/v5/oauth/token',
    apiBase: 'https://api.pinterest.com/v5',
    docs: 'https://developers.pinterest.com/docs/api/v5/',
  },
} as const;

export type PlatformKey = keyof typeof PLATFORM_CONFIGS;

// ─── URL de Redirect (deve estar nos apps de cada plataforma) ─────────────────
export const REDIRECT_URI = `${window.location.origin}/grayart/oauth/callback`;

// ─── Storage keys ─────────────────────────────────────────────────────────────
const TOKEN_KEY = 'gray_social_tokens';
const ACCOUNT_KEY = 'gray_social_accounts';

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface SocialToken {
  platform: PlatformKey;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // timestamp ms
  userId: string;
  pageId?: string;   // Instagram/Facebook: ID da página
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
  mediaUrl?: string;  // URL pública de imagem/vídeo
  mediaType?: 'IMAGE' | 'VIDEO' | 'REELS' | 'CAROUSEL';
  hashtags?: string[];
  scheduleAt?: number; // timestamp ms para agendar
}

// ─── Gerenciador de Tokens (localStorage) ────────────────────────────────────
export const TokenStore = {
  getAll(): Record<PlatformKey, SocialToken> {
    try {
      return JSON.parse(localStorage.getItem(TOKEN_KEY) || '{}');
    } catch { return {} as Record<PlatformKey, SocialToken>; }
  },

  get(platform: PlatformKey): SocialToken | null {
    return this.getAll()[platform] || null;
  },

  save(token: SocialToken): void {
    const all = this.getAll();
    all[token.platform] = token;
    localStorage.setItem(TOKEN_KEY, JSON.stringify(all));
  },

  remove(platform: PlatformKey): void {
    const all = this.getAll();
    delete all[platform];
    localStorage.setItem(TOKEN_KEY, JSON.stringify(all));
  },

  isValid(platform: PlatformKey): boolean {
    const token = this.get(platform);
    if (!token) return false;
    return token.expiresAt > Date.now();
  },
};

export const AccountStore = {
  getAll(): ConnectedAccount[] {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || '[]');
    } catch { return []; }
  },

  save(account: ConnectedAccount): void {
    const all = this.getAll().filter(a => a.platform !== account.platform);
    all.push(account);
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(all));
  },

  remove(platform: PlatformKey): void {
    const all = this.getAll().filter(a => a.platform !== platform);
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(all));
  },
};

// ─── Gerador de URL OAuth ─────────────────────────────────────────────────────
export function buildAuthUrl(platform: PlatformKey): string {
  const config = PLATFORM_CONFIGS[platform];
  const state = btoa(JSON.stringify({ platform, nonce: Math.random().toString(36) }));

  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    state,
    scope: config.scopes.join(platform === 'linkedin' ? ' ' : ','),
  });

  // Parâmetros extras por plataforma
  if (platform === 'instagram' || platform === 'facebook') {
    params.set('scope', config.scopes.join(','));
  }
  if (platform === 'tiktok') {
    params.set('client_key', config.appId);
    params.delete('client_id');
    params.set('scope', config.scopes.join(','));
  }
  if (platform === 'youtube') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
    params.set('scope', config.scopes.join(' '));
  }

  return `${config.authUrl}?${params.toString()}`;
}

// ─── Abre popup OAuth ─────────────────────────────────────────────────────────
export function openOAuthPopup(platform: PlatformKey): Promise<{ code: string; state: string }> {
  return new Promise((resolve, reject) => {
    const config = PLATFORM_CONFIGS[platform];

    if (!config.appId) {
      reject(new Error(`APP_ID não configurado para ${config.name}. Configure a variável de ambiente VITE_*_APP_ID no arquivo .env`));
      return;
    }

    const url = buildAuthUrl(platform);
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const popup = window.open(
      url,
      `oauth_${platform}`,
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      reject(new Error('Popup bloqueado. Permita popups para este site.'));
      return;
    }

    // Escuta mensagem do callback
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'oauth_callback') return;
      window.removeEventListener('message', handler);
      clearInterval(pollClose);
      if (event.data.error) {
        reject(new Error(event.data.error));
      } else {
        resolve({ code: event.data.code, state: event.data.state });
      }
    };

    window.addEventListener('message', handler);

    // Detecta se popup foi fechado sem autenticar
    const pollClose = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollClose);
        window.removeEventListener('message', handler);
        reject(new Error('Login cancelado pelo usuário.'));
      }
    }, 500);
  });
}

// ─── Troca `code` por token (via Flow Backend) ──────────────────────────────
export async function exchangeCodeForToken(
  platform: PlatformKey,
  code: string
): Promise<SocialToken> {
  const response = await flowFetch('/social/oauth/exchange', {
    method: 'POST',
    body: JSON.stringify({ platform, code, redirect_uri: REDIRECT_URI }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Erro ao trocar token para ${platform}`);
  }

  const data = await response.json();

  const token: SocialToken = {
    platform,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    userId: data.user_id || data.sub || '',
    pageId: data.page_id,
  };

  TokenStore.save(token);
  return token;
}

// ─── Fetch perfil do usuário após conectar ────────────────────────────────────
export async function fetchUserProfile(platform: PlatformKey, token: SocialToken): Promise<ConnectedAccount> {
  const response = await flowFetch('/social/profile', {
    method: 'POST',
    body: JSON.stringify({ platform, access_token: token.accessToken, page_id: token.pageId }),
  });

  if (!response.ok) throw new Error(`Erro ao buscar perfil de ${platform}`);
  const data = await response.json();

  const account: ConnectedAccount = {
    platform,
    handle: data.handle || data.username || data.name,
    name: data.name,
    profilePic: data.profile_picture_url || data.picture?.data?.url,
    followers: data.followers_count || data.followersCount || 0,
    userId: token.userId,
    pageId: token.pageId,
    connectedAt: Date.now(),
    status: 'active',
  };

  AccountStore.save(account);
  return account;
}

// ─── Publicar conteúdo nas redes ──────────────────────────────────────────────
export async function publishToSocial(
  platform: PlatformKey,
  payload: PublishPayload
): Promise<{ success: boolean; postId?: string; url?: string }> {
  const token = TokenStore.get(platform);
  if (!token || !TokenStore.isValid(platform)) {
    throw new Error(`Conta ${platform} não conectada ou token expirado. Reconecte.`);
  }

  const response = await flowFetch('/social/publish', {
    method: 'POST',
    body: JSON.stringify({
      platform,
      access_token: token.accessToken,
      page_id: token.pageId,
      caption: payload.caption,
      media_url: payload.mediaUrl,
      media_type: payload.mediaType || 'IMAGE',
      hashtags: payload.hashtags || [],
      schedule_at: payload.scheduleAt,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Erro ao publicar no ${platform}`);
  }

  return response.json();
}

// ─── Verificar status de todas as contas ─────────────────────────────────────
export function getConnectionStatus(platform: PlatformKey): 'connected' | 'expired' | 'disconnected' {
  const token = TokenStore.get(platform);
  if (!token) return 'disconnected';
  if (!TokenStore.isValid(platform)) return 'expired';
  return 'connected';
}

// ─── Login com Google (popup, sem redirect URI) ──────────────────────────────
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initCodeClient(config: {
            client_id: string;
            scope: string;
            ux_mode: 'popup';
            callback: (resp: { code?: string; error?: string }) => void;
          }): { requestCode(): void };
        };
      };
    };
  }
}

export async function loginWithGoogle(
  onStatus: (msg: string) => void
): Promise<ConnectedAccount> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID nao configurado no .env');

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services nao carregado. Recarregue a pagina.');
  }

  onStatus('Abrindo login Google...');

  const code = await new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
      ux_mode: 'popup',
      callback: (resp) => {
        if (resp.error) reject(new Error(resp.error));
        else if (resp.code) resolve(resp.code);
        else reject(new Error('Login cancelado'));
      },
    });
    client.requestCode();
  });

  onStatus('Trocando token com Google...');

  const response = await flowFetch('/social/oauth/exchange', {
    method: 'POST',
    body: JSON.stringify({ platform: 'youtube', code, redirect_uri: 'postmessage' }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao trocar token Google');
  }

  const data = await response.json();
  const tokenData = data.token || data;

  const token: SocialToken = {
    platform: 'youtube',
    accessToken: tokenData.accessToken || tokenData.access_token,
    refreshToken: tokenData.refreshToken || tokenData.refresh_token,
    expiresAt: tokenData.expiresAt || Date.now() + 3600000,
    userId: tokenData.userId || '',
    pageId: tokenData.handle,
  };
  TokenStore.save(token);

  onStatus('Buscando dados do canal...');

  const account: ConnectedAccount = {
    platform: 'youtube',
    handle: tokenData.handle || tokenData.userId || 'YouTube',
    name: tokenData.handle || 'YouTube Channel',
    followers: 0,
    userId: token.userId,
    connectedAt: Date.now(),
    status: 'active',
  };
  AccountStore.save(account);

  onStatus('YouTube conectado via Google!');
  return account;
}

// ─── Fluxo completo de login social ──────────────────────────────────────────
export async function loginWithPlatform(
  platform: PlatformKey,
  onStatus: (msg: string) => void
): Promise<ConnectedAccount> {
  onStatus(`Abrindo login ${PLATFORM_CONFIGS[platform].name}...`);

  const { code } = await openOAuthPopup(platform);
  onStatus(`Autorizando com ${PLATFORM_CONFIGS[platform].name}...`);

  const token = await exchangeCodeForToken(platform, code);
  onStatus(`Buscando dados do perfil...`);

  const account = await fetchUserProfile(platform, token);
  onStatus(`Conta ${account.handle} conectada!`);

  return account;
}
