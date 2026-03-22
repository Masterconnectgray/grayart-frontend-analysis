import { Router } from 'express';
import { db, nowIso } from '../database';
import { verifyToken } from '../middleware/auth';
import { flowFetch } from '../utils/flow';
import { logAudit } from '../utils/audit';
import { env } from '../config/env';
import { clearOAuthCredential, listOAuthCredentialFlags, setOAuthCredential } from '../utils/oauthCredentials';
import { SOCIAL_PLATFORMS, type SocialPlatform } from '../utils/social';

const flowRouter = Router();

flowRouter.use(verifyToken);

// ─── Health Checks (reais) ─────────────────────────────────────────────────
flowRouter.get('/health/:service', async (req, res) => {
  const service = req.params.service;

  if (service === 'evolution') {
    try {
      const r = await fetch(env.evolutionApiUrl + '/instance/fetchInstances', {
        headers: { apikey: env.evolutionApiKey },
        signal: AbortSignal.timeout(5000),
      });
      return res.json({ ok: r.ok, service, status: r.status });
    } catch (e) {
      return res.json({ ok: false, service, error: (e as Error).message });
    }
  }

  if (service === 'gemini' || service === 'veo') {
    try {
      const r = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models?key=' + env.geminiApiKey,
        { signal: AbortSignal.timeout(5000) }
      );
      return res.json({ ok: r.ok, service, status: r.status });
    } catch (e) {
      return res.json({ ok: false, service, error: (e as Error).message });
    }
  }

  try {
    const r = await fetch(env.flowApiUrl + '/flow/health', { signal: AbortSignal.timeout(5000) });
    return res.json({ ok: r.ok, service: 'flow', status: r.status });
  } catch (e) {
    return res.json({ ok: false, service: 'flow', error: (e as Error).message });
  }
});

// ─── Publish (registrar publicação) ────────────────────────────────────────
flowRouter.post('/publish', (req, res) => {
  const userId = req.user!.userId;
  const { division, platform, content, type } = req.body as {
    division?: string; platform?: string; content?: string; type?: string;
  };

  if (!platform || !content) {
    return res.status(400).json({ error: 'platform e content são obrigatórios' });
  }

  const result = db.prepare(`
    INSERT INTO publish_jobs (user_id, platform, content, status, published_at, created_at, updated_at)
    VALUES (?, ?, ?, 'published', ?, ?, ?)
  `).run(userId, platform, content, nowIso(), nowIso(), nowIso());

  const id = Number(result.lastInsertRowid);
  logAudit(userId, 'flow.publish', { division, platform, id }, req.ip || '');

  return res.status(201).json({
    post: {
      id: String(id),
      division: division || 'gray-art',
      platform,
      content,
      type: type || 'post',
      publishedAt: nowIso(),
    },
  });
});

// ─── Schedule (agendar post) ───────────────────────────────────────────────
flowRouter.post('/schedule', (req, res) => {
  const userId = req.user!.userId;
  const { division, platform, content, scheduledAt, type } = req.body as {
    division?: string; platform?: string; content?: string; scheduledAt?: string; type?: string;
  };

  if (!platform || !content) {
    return res.status(400).json({ error: 'platform e content são obrigatórios' });
  }

  const result = db.prepare(`
    INSERT INTO scheduled_posts (user_id, platform, content, scheduled_at, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?)
  `).run(userId, platform, content, scheduledAt || null, nowIso());

  const id = Number(result.lastInsertRowid);
  logAudit(userId, 'flow.schedule_create', { division, platform, id }, req.ip || '');

  return res.status(201).json({
    post: {
      id: String(id),
      division: division || 'gray-art',
      platform,
      content,
      type: type || 'post',
      scheduledAt: scheduledAt || null,
      createdAt: nowIso(),
      status: 'pending',
    },
  });
});

flowRouter.get('/schedule', (req, res) => {
  const userId = req.user!.userId;
  const division = req.query.division as string | undefined;

  const rows = db.prepare(`
    SELECT id, platform, content, scheduled_at, status, created_at
    FROM scheduled_posts
    WHERE user_id = ?
    ORDER BY datetime(created_at) DESC
    LIMIT 100
  `).all(userId) as Array<{
    id: number; platform: string; content: string;
    scheduled_at: string | null; status: string; created_at: string;
  }>;

  return res.json({
    posts: rows.map(r => ({
      id: String(r.id),
      division: division || 'gray-art',
      platform: r.platform,
      content: r.content,
      type: 'post',
      scheduledAt: r.scheduled_at,
      createdAt: r.created_at,
      status: r.status,
    })),
  });
});

flowRouter.delete('/schedule/:id', (req, res) => {
  const userId = req.user!.userId;
  const id = Number(req.params.id);

  const result = db.prepare(`
    DELETE FROM scheduled_posts WHERE id = ? AND user_id = ?
  `).run(id, userId);

  if (!result.changes) {
    return res.status(404).json({ error: 'Post agendado não encontrado' });
  }

  logAudit(userId, 'flow.schedule_delete', { id }, req.ip || '');
  return res.json({ ok: true });
});

// ─── Stats ─────────────────────────────────────────────────────────────────
flowRouter.get('/stats', (req, res) => {
  const userId = req.user!.userId;

  const totalPosts = (db.prepare(`
    SELECT COUNT(*) as count FROM publish_jobs WHERE user_id = ? AND status = 'published'
  `).get(userId) as { count: number }).count;

  const totalVideos = (db.prepare(`
    SELECT COUNT(*) as count FROM ai_jobs WHERE user_id = ? AND type = 'video'
  `).get(userId) as { count: number }).count;

  const totalScheduled = (db.prepare(`
    SELECT COUNT(*) as count FROM scheduled_posts WHERE user_id = ?
  `).get(userId) as { count: number }).count;

  const scheduledPending = (db.prepare(`
    SELECT COUNT(*) as count FROM scheduled_posts WHERE user_id = ? AND status = 'pending'
  `).get(userId) as { count: number }).count;

  const recentPosts = db.prepare(`
    SELECT id, platform, content, published_at, created_at
    FROM publish_jobs
    WHERE user_id = ? AND status = 'published'
    ORDER BY datetime(published_at) DESC
    LIMIT 10
  `).all(userId) as Array<{
    id: number; platform: string; content: string;
    published_at: string; created_at: string;
  }>;

  return res.json({
    stats: {
      totalPosts,
      totalVideos,
      totalScheduled,
      scheduledPending,
      posts: totalPosts,
      videos: totalVideos,
      recentPosts: recentPosts.map(r => ({
        id: String(r.id),
        division: 'gray-art',
        platform: r.platform,
        content: r.content,
        type: 'post',
        publishedAt: r.published_at,
      })),
    },
  });
});

// ─── Social Credentials (config de OAuth por plataforma) ───────────────────
flowRouter.post('/social/credentials', (req, res) => {
  const { platform, appId, appSecret } = req.body as {
    platform?: string; appId?: string; appSecret?: string;
  };

  if (!platform || !appId || !appSecret) {
    return res.status(400).json({ error: 'platform, appId e appSecret são obrigatórios' });
  }

  if (!SOCIAL_PLATFORMS.includes(platform as SocialPlatform)) {
    return res.status(400).json({ error: `Plataforma ${platform} não suportada` });
  }

  setOAuthCredential(platform as SocialPlatform, appId, appSecret);

  logAudit(req.user!.userId, 'flow.social_credentials_save', { platform }, req.ip || '');
  return res.json({ ok: true, platform });
});

flowRouter.get('/social/credentials', (_req, res) => {
  return res.json({
    credentials: listOAuthCredentialFlags(SOCIAL_PLATFORMS).map((item) => ({
      platform: item.platform,
      hasAppId: item.hasAppId,
      hasAppSecret: item.hasAppSecret,
    })),
  });
});

flowRouter.delete('/social/credentials/:platform', (req, res) => {
  const platform = req.params.platform;
  if (SOCIAL_PLATFORMS.includes(platform as SocialPlatform)) {
    clearOAuthCredential(platform as SocialPlatform);
  }

  logAudit(req.user!.userId, 'flow.social_credentials_delete', { platform }, req.ip || '');
  return res.json({ ok: true });
});

// ─── Social Status / Config ────────────────────────────────────────────────
flowRouter.get('/social/status', (req, res) => {
  const userId = req.user!.userId;
  const connections = db.prepare(`
    SELECT platform, account_name, account_id, expires_at
    FROM social_connections
    WHERE user_id = ?
  `).all(userId) as Array<{
    platform: string; account_name: string | null;
    account_id: string | null; expires_at: string | null;
  }>;

  const accounts = connections.map(c => ({
    platform: c.platform,
    status: c.expires_at && new Date(c.expires_at) < new Date() ? 'expired' : 'connected',
    handle: c.account_name || c.account_id || c.platform,
    userId: c.account_id || '',
  }));

  return res.json({ accounts });
});

flowRouter.get('/social/config', (_req, res) => {
  const configuredPlatforms = new Map(
    listOAuthCredentialFlags(SOCIAL_PLATFORMS).map((item) => [item.platform, item.configured])
  );

  return res.json({
    platforms: ['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'pinterest'].map(p => ({
      platform: p,
      configured: configuredPlatforms.get(p as SocialPlatform) || false,
    })),
  });
});

export { flowRouter };
