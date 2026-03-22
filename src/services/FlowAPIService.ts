import { bffFetch } from './BFFClient';

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

export interface PublishedPost {
  id: string;
  division: string;
  platform: string;
  content: string;
  type: string;
  publishedAt: string;
}

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

async function parseOrThrow(response: Response, fallback: string) {
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || fallback);
  }
  return response.json();
}

export async function schedulePost(data: {
  division: string;
  platform: string;
  content: string;
  scheduledAt: string;
  type?: string;
}): Promise<ScheduledPost> {
  const response = await bffFetch('/flow/schedule', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const result = await parseOrThrow(response, `Schedule failed: HTTP ${response.status}`) as { post: ScheduledPost };
  return result.post;
}

export async function listScheduledPosts(division?: string): Promise<ScheduledPost[]> {
  const query = division ? `?division=${encodeURIComponent(division)}` : '';
  const response = await bffFetch(`/flow/schedule${query}`);
  if (!response.ok) return [];
  const result = await response.json() as { posts?: ScheduledPost[] };
  return result.posts || [];
}

export async function cancelScheduledPost(id: string): Promise<boolean> {
  const response = await bffFetch(`/flow/schedule/${id}`, { method: 'DELETE' });
  return response.ok;
}

export async function registerPublish(data: {
  division: string;
  platform: string;
  content: string;
  type?: string;
}): Promise<PublishedPost> {
  const response = await bffFetch('/flow/publish', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const result = await parseOrThrow(response, `Publish failed: HTTP ${response.status}`) as { post: PublishedPost };
  return result.post;
}

export async function getStats(division?: string): Promise<GrayArtStats> {
  const query = division ? `?division=${encodeURIComponent(division)}` : '';
  const response = await bffFetch(`/flow/stats${query}`);
  const result = await parseOrThrow(response, `Stats failed: HTTP ${response.status}`) as { stats: GrayArtStats };
  return result.stats;
}

export function isFlowConfigured(): boolean {
  return true;
}

export async function saveSocialCredential(platform: string, appId: string, appSecret: string): Promise<boolean> {
  const response = await bffFetch('/flow/social/credentials', {
    method: 'POST',
    body: JSON.stringify({ platform, appId, appSecret }),
  });
  return response.ok;
}

export async function listSocialCredentials(): Promise<{ platform: string; hasAppId: boolean; hasAppSecret: boolean }[]> {
  const response = await bffFetch('/flow/social/credentials');
  if (!response.ok) return [];
  const data = await response.json() as { credentials?: { platform: string; hasAppId: boolean; hasAppSecret: boolean }[] };
  return data.credentials || [];
}

export async function deleteSocialCredential(platform: string): Promise<boolean> {
  const response = await bffFetch(`/flow/social/credentials/${platform}`, { method: 'DELETE' });
  return response.ok;
}

export interface SocialAccountStatus {
  platform: string;
  status: 'connected' | 'disconnected' | 'expired';
  handle?: string;
  userId?: string;
}

export async function getSocialStatus(): Promise<SocialAccountStatus[]> {
  const response = await bffFetch('/flow/social/status');
  if (!response.ok) return [];
  const data = await response.json() as { accounts?: SocialAccountStatus[] };
  return data.accounts || [];
}

export async function getSocialConfig(): Promise<{ platform: string; configured: boolean }[]> {
  const response = await bffFetch('/flow/social/config');
  if (!response.ok) return [];
  const data = await response.json() as { platforms?: { platform: string; configured: boolean }[] };
  return data.platforms || [];
}
