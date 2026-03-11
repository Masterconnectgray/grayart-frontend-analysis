/**
 * FlowAPIService.ts
 * Cliente para o Flow Backend (VPS) — /flow/grayart/*
 */

const IS_DEV = import.meta.env.DEV;
const FLOW_URL = IS_DEV ? '' : (import.meta.env.VITE_FLOW_API_URL || '');
const FLOW_USER = import.meta.env.VITE_FLOW_API_USER || '';
const FLOW_PASS = import.meta.env.VITE_FLOW_API_PASS || '';

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const loginPath = IS_DEV ? '/flow/auth/login' : `${FLOW_URL}/flow/auth/login`;
  const resp = await fetch(loginPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: FLOW_USER, password: FLOW_PASS }),
  });

  if (!resp.ok) throw new Error(`Flow auth failed: HTTP ${resp.status}`);

  const data = await resp.json();
  cachedToken = data.token;
  tokenExpiry = Date.now() + 7 * 60 * 60 * 1000; // 7h (expira em 8h)
  return cachedToken!;
}

export async function flowFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const fullPath = IS_DEV ? `/flow/grayart${path}` : `${FLOW_URL}/flow/grayart${path}`;
  return fetch(fullPath, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
}

// ── Agendamento ──────────────────────────────────────────────────────────────

export interface ScheduledPost {
  id: string;
  division: string;
  platform: string;
  content: string;
  type: string;
  scheduledAt: string;
  createdAt: string;
  status: string;
}

export async function schedulePost(data: {
  division: string;
  platform: string;
  content: string;
  scheduledAt: string;
  type?: string;
}): Promise<ScheduledPost> {
  const resp = await flowFetch('/schedule', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error(`Schedule failed: HTTP ${resp.status}`);
  const result = await resp.json();
  return result.post;
}

export async function listScheduledPosts(division?: string): Promise<ScheduledPost[]> {
  const query = division ? `?division=${division}` : '';
  const resp = await flowFetch(`/schedule${query}`);
  if (!resp.ok) return [];
  const result = await resp.json();
  return result.posts || [];
}

export async function cancelScheduledPost(id: string): Promise<boolean> {
  const resp = await flowFetch(`/schedule/${id}`, { method: 'DELETE' });
  return resp.ok;
}

// ── Publicação ──────────────────────────────────────────────────────────────

export interface PublishedPost {
  id: string;
  division: string;
  platform: string;
  content: string;
  type: string;
  publishedAt: string;
}

export async function registerPublish(data: {
  division: string;
  platform: string;
  content: string;
  type?: string;
}): Promise<PublishedPost> {
  const resp = await flowFetch('/publish', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error(`Publish failed: HTTP ${resp.status}`);
  const result = await resp.json();
  return result.post;
}

// ── Stats ──────────────────────────────────────────────────────────────────

export interface GrayArtStats {
  totalPosts: number;
  totalVideos: number;
  totalScheduled: number;
  scheduledPending: number;
  posts?: number;
  videos?: number;
  recentPosts: PublishedPost[];
  byDivision?: Record<string, { posts: number; videos: number }>;
}

export async function getStats(division?: string): Promise<GrayArtStats> {
  const query = division ? `?division=${division}` : '';
  const resp = await flowFetch(`/stats${query}`);
  if (!resp.ok) throw new Error(`Stats failed: HTTP ${resp.status}`);
  const result = await resp.json();
  return result.stats;
}

export function isFlowConfigured(): boolean {
  return !!(FLOW_URL && FLOW_USER && FLOW_PASS);
}

// ── Social Credentials ──────────────────────────────────────────────────────

export async function saveSocialCredential(platform: string, appId: string, appSecret: string): Promise<boolean> {
  const resp = await flowFetch('/social/credentials', {
    method: 'POST',
    body: JSON.stringify({ platform, appId, appSecret }),
  });
  return resp.ok;
}

export async function listSocialCredentials(): Promise<{ platform: string; hasAppId: boolean; hasAppSecret: boolean }[]> {
  const resp = await flowFetch('/social/credentials');
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.credentials || [];
}

export async function deleteSocialCredential(platform: string): Promise<boolean> {
  const resp = await flowFetch(`/social/credentials/${platform}`, { method: 'DELETE' });
  return resp.ok;
}

export interface SocialAccountStatus {
  platform: string;
  status: 'connected' | 'disconnected' | 'expired';
  handle?: string;
  userId?: string;
}

export async function getSocialStatus(): Promise<SocialAccountStatus[]> {
  const resp = await flowFetch('/social/status');
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.accounts || [];
}

export async function getSocialConfig(): Promise<{ platform: string; configured: boolean }[]> {
  const resp = await flowFetch('/social/config');
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.platforms || [];
}
