import { Router } from 'express';
import { db, nowIso } from '../database';
import { verifyToken } from '../middleware/auth';
import { decrypt, encrypt } from '../utils/crypto';
import { env } from '../config/env';
import { flowFetch } from '../utils/flow';
import { logAudit } from '../utils/audit';
import { SOCIAL_PLATFORMS, getOAuthRedirectUri, getPlatformConfig, type SocialPlatform } from '../utils/social';
import { signToken, verifyJwt } from '../utils/auth';

const socialRouter = Router();

type OAuthStatePayload = {
  userId: number;
  email: string;
  role: string;
  platform: SocialPlatform;
  redirectUri: string;
  frontendOrigin: string;
};

function buildAuthUrl(platform: SocialPlatform, redirectUri: string, state: string) {
  const config = getPlatformConfig(platform);
  if (!config.clientId || !config.clientSecret) {
    throw new Error(`OAuth não configurado para ${platform}`);
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    scope: config.scopes.join(platform === 'linkedin' || platform === 'youtube' ? ' ' : ','),
  });

  if (platform === 'tiktok') {
    params.set('client_key', config.clientId);
    params.delete('client_id');
  }

  if (platform === 'youtube') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  }

  return `${config.authUrl}?${params.toString()}`;
}

socialRouter.post('/connect', verifyToken, (req, res) => {
  const { platform, frontendOrigin } = req.body as { platform?: SocialPlatform; frontendOrigin?: string };
  if (!platform || !SOCIAL_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'platform inválida' });
  }

  try {
    const redirectUri = getOAuthRedirectUri(platform);
    const statePayload: OAuthStatePayload = {
      userId: req.user!.userId,
      email: req.user!.email,
      role: req.user!.role,
      platform,
      redirectUri,
      frontendOrigin: frontendOrigin || env.frontendUrl,
    };
    const state = signToken(statePayload);
    const authUrl = buildAuthUrl(platform, redirectUri, state);
    logAudit({ userId: req.user!.userId, action: 'social.connect_init', details: { platform }, ipAddress: req.ip });
    return res.json({ platform, authUrl, redirectUri });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Erro ao iniciar OAuth' });
  }
});

socialRouter.get('/callback', async (req, res) => {
  const { code, state, platform } = req.query as { code?: string; state?: string; platform?: SocialPlatform };
  if (!code || !state || !platform) {
    return res.status(400).send('Callback OAuth inválido.');
  }

  try {
    const payload = verifyJwt<OAuthStatePayload>(state);
    const exchangeResponse = await flowFetch('/social/oauth/exchange', {
      method: 'POST',
      body: JSON.stringify({
        platform,
        code,
        redirect_uri: payload.redirectUri,
      }),
    });

    if (!exchangeResponse.ok) {
      const err = await exchangeResponse.json().catch(() => ({}));
      throw new Error((err as { message?: string; error?: string }).message || (err as { error?: string }).error || `HTTP ${exchangeResponse.status}`);
    }

    const tokenData = await exchangeResponse.json() as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      user_id?: string;
      sub?: string;
      page_id?: string;
      token?: { accessToken?: string; refreshToken?: string; expiresAt?: number; userId?: string; handle?: string };
    };

    const accessToken = tokenData.access_token || tokenData.token?.accessToken;
    const refreshToken = tokenData.refresh_token || tokenData.token?.refreshToken || null;
    const accountId = tokenData.page_id || tokenData.user_id || tokenData.sub || tokenData.token?.userId || null;
    const expiresAt = tokenData.token?.expiresAt
      ? new Date(tokenData.token.expiresAt).toISOString()
      : new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    if (!accessToken) {
      throw new Error('Token de acesso não retornado pelo Flow');
    }

    let accountName = tokenData.token?.handle || null;

    try {
      const profileResponse = await flowFetch('/social/profile', {
        method: 'POST',
        body: JSON.stringify({
          platform,
          access_token: accessToken,
          page_id: tokenData.page_id,
        }),
      });

      if (profileResponse.ok) {
        const profile = await profileResponse.json() as { name?: string; username?: string; handle?: string };
        accountName = profile.handle || profile.username || profile.name || accountName;
      }
    } catch {
      // Busca de perfil é complementar.
    }

    db.prepare(`
      INSERT INTO social_connections (
        user_id, platform, access_token_encrypted, refresh_token_encrypted,
        expires_at, account_name, account_id, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, platform, account_id)
      DO UPDATE SET
        access_token_encrypted = excluded.access_token_encrypted,
        refresh_token_encrypted = excluded.refresh_token_encrypted,
        expires_at = excluded.expires_at,
        account_name = excluded.account_name,
        updated_at = excluded.updated_at
    `).run(
      payload.userId,
      platform,
      encrypt(accessToken, env.jwtSecret),
      refreshToken ? encrypt(refreshToken, env.jwtSecret) : null,
      expiresAt,
      accountName,
      accountId,
      nowIso(),
    );

    logAudit({ userId: payload.userId, action: 'social.callback', details: { platform, accountId }, ipAddress: req.ip });

    return res.type('html').send(`
      <!doctype html>
      <html lang="pt-BR">
        <head><meta charset="utf-8"><title>Conexão concluída</title></head>
        <body style="font-family: sans-serif; padding: 32px;">
          <h2>Conta conectada com sucesso</h2>
          <p>Esta janela será fechada automaticamente.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'oauth_callback', platform: ${JSON.stringify(platform)}, success: true }, ${JSON.stringify(payload.frontendOrigin)});
              window.close();
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro no callback OAuth';
    return res.status(400).type('html').send(`
      <!doctype html>
      <html lang="pt-BR">
        <head><meta charset="utf-8"><title>Erro na conexão</title></head>
        <body style="font-family: sans-serif; padding: 32px;">
          <h2>Falha ao conectar a conta</h2>
          <p>${message}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'oauth_callback', platform: ${JSON.stringify(platform || null)}, success: false, error: ${JSON.stringify(message)} }, '*');
            }
          </script>
        </body>
      </html>
    `);
  }
});

socialRouter.get('/accounts', verifyToken, (req, res) => {
  const rows = db.prepare(`
    SELECT id, platform, expires_at, account_name, account_id, created_at, updated_at
    FROM social_connections
    WHERE user_id = ?
    ORDER BY updated_at DESC
  `).all(req.user!.userId);

  return res.json({ accounts: rows });
});

socialRouter.delete('/disconnect/:platform', verifyToken, (req, res) => {
  const platform = req.params.platform;
  const result = db.prepare(`
    DELETE FROM social_connections
    WHERE user_id = ? AND platform = ?
  `).run(req.user!.userId, platform);

  logAudit({
    userId: req.user!.userId,
    action: 'social.disconnect',
    details: { platform, removed: result.changes },
    ipAddress: req.ip,
  });

  if (!result.changes) {
    return res.status(404).json({ error: 'Conta social não encontrada' });
  }

  return res.status(204).end();
});

socialRouter.post('/publish', verifyToken, async (req, res) => {
  const { platform, content, media_url } = req.body as { platform?: string; content?: string; media_url?: string };
  if (!platform || !content) {
    return res.status(400).json({ error: 'platform e content são obrigatórios' });
  }

  const connection = db.prepare(`
    SELECT access_token_encrypted, account_id
    FROM social_connections
    WHERE user_id = ? AND platform = ?
    ORDER BY updated_at DESC
    LIMIT 1
  `).get(req.user!.userId, platform) as
    | { access_token_encrypted: string; account_id: string | null }
    | undefined;

  if (!connection) {
    return res.status(404).json({ error: 'Conta social não conectada' });
  }

  const publishJob = db.prepare(`
    INSERT INTO publish_jobs (user_id, platform, content, media_url, status)
    VALUES (?, ?, ?, ?, 'processing')
  `).run(req.user!.userId, platform, content, media_url || null);
  const publishJobId = Number(publishJob.lastInsertRowid);

  try {
    const response = await flowFetch('/social/publish', {
      method: 'POST',
      body: JSON.stringify({
        platform,
        access_token: decrypt(connection.access_token_encrypted, env.jwtSecret),
        page_id: connection.account_id,
        caption: content,
        media_url,
        media_type: media_url ? 'IMAGE' : 'IMAGE',
        hashtags: content.match(/#\w+/g) || [],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    db.prepare(`
      UPDATE publish_jobs
      SET status = 'published', published_at = ?, updated_at = ?
      WHERE id = ?
    `).run(nowIso(), nowIso(), publishJobId);

    logAudit({ userId: req.user!.userId, action: 'social.publish', details: { platform, publishJobId }, ipAddress: req.ip });
    return res.json({ job_id: publishJobId, result });
  } catch (error) {
    db.prepare(`
      UPDATE publish_jobs
      SET status = 'failed', error_message = ?, retry_count = retry_count + 1, updated_at = ?
      WHERE id = ?
    `).run(error instanceof Error ? error.message : 'Erro ao publicar', nowIso(), publishJobId);
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Erro ao publicar' });
  }
});

socialRouter.post('/schedule', verifyToken, (req, res) => {
  const { platform, content, media_url, scheduled_at } = req.body as {
    platform?: string;
    content?: string;
    media_url?: string;
    scheduled_at?: string;
  };

  if (!platform || !content || !scheduled_at) {
    return res.status(400).json({ error: 'platform, content e scheduled_at são obrigatórios' });
  }

  let mediaAssetId: number | null = null;
  if (media_url) {
    const asset = db.prepare(`
      INSERT INTO media_assets (user_id, type, file_path, format)
      VALUES (?, 'image', ?, 'remote_url')
    `).run(req.user!.userId, media_url);
    mediaAssetId = Number(asset.lastInsertRowid);
  }

  const result = db.prepare(`
    INSERT INTO scheduled_posts (user_id, platform, content, media_asset_id, scheduled_at, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).run(req.user!.userId, platform, content, mediaAssetId, scheduled_at);

  logAudit({ userId: req.user!.userId, action: 'social.schedule', details: { platform, scheduled_at }, ipAddress: req.ip });
  return res.status(201).json({ scheduled_post_id: Number(result.lastInsertRowid), status: 'pending' });
});

socialRouter.get('/publish-history', verifyToken, (req, res) => {
  const jobs = db.prepare(`
    SELECT id, platform, content, media_url, status, scheduled_at, published_at, error_message, retry_count, created_at, updated_at
    FROM publish_jobs
    WHERE user_id = ?
    ORDER BY datetime(created_at) DESC, id DESC
    LIMIT 50
  `).all(req.user!.userId) as Array<{
    id: number;
    platform: string;
    content: string;
    media_url: string | null;
    status: string;
    scheduled_at: string | null;
    published_at: string | null;
    error_message: string | null;
    retry_count: number;
    created_at: string;
    updated_at: string;
  }>;

  const scheduled = db.prepare(`
    SELECT id, platform, content, scheduled_at, status, publish_job_id, created_at
    FROM scheduled_posts
    WHERE user_id = ?
    ORDER BY datetime(created_at) DESC, id DESC
    LIMIT 50
  `).all(req.user!.userId) as Array<{
    id: number;
    platform: string;
    content: string;
    scheduled_at: string | null;
    status: string;
    publish_job_id: number | null;
    created_at: string;
  }>;

  return res.json({
    publishJobs: jobs,
    scheduledPosts: scheduled,
  });
});

export { socialRouter };
