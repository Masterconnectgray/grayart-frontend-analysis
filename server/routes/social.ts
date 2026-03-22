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

type TokenExchangeResult = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  accountId: string | null;
  accountName: string | null;
};

async function exchangeCodeForToken(
  platform: SocialPlatform,
  code: string,
  redirectUri: string
): Promise<TokenExchangeResult> {
  const config = getPlatformConfig(platform);

  if (platform === 'instagram' || platform === 'facebook') {
    const tokenRes = await fetch('https://graph.facebook.com/v21.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });
    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(err.error?.message || `Meta token exchange HTTP ${tokenRes.status}`);
    }
    const tokenData = await tokenRes.json() as { access_token: string; token_type: string; expires_in?: number };

    const longRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${config.clientId}&client_secret=${config.clientSecret}&fb_exchange_token=${tokenData.access_token}`
    );
    let accessToken = tokenData.access_token;
    let expiresIn = tokenData.expires_in || 3600;
    if (longRes.ok) {
      const longData = await longRes.json() as { access_token: string; expires_in?: number };
      accessToken = longData.access_token;
      expiresIn = longData.expires_in || 5184000;
    }

    let accountId: string | null = null;
    let accountName: string | null = null;
    try {
      if (platform === 'instagram') {
        const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`);
        if (pagesRes.ok) {
          const pagesData = await pagesRes.json() as { data: Array<{ id: string; name: string; access_token: string }> };
          const page = pagesData.data?.[0];
          if (page) {
            const igRes = await fetch(`https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`);
            if (igRes.ok) {
              const igData = await igRes.json() as { instagram_business_account?: { id: string } };
              if (igData.instagram_business_account) {
                accountId = igData.instagram_business_account.id;
                const profileRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}?fields=username,name&access_token=${accessToken}`);
                if (profileRes.ok) {
                  const profile = await profileRes.json() as { username?: string; name?: string };
                  accountName = profile.username || profile.name || null;
                }
              }
            }
          }
        }
      } else {
        const meRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${accessToken}`);
        if (meRes.ok) {
          const meData = await meRes.json() as { id: string; name: string };
          accountId = meData.id;
          accountName = meData.name;
        }
      }
    } catch { /* profile fetch is best-effort */ }

    return { accessToken, refreshToken: null, expiresIn, accountId, accountName };
  }

  if (platform === 'youtube') {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        code,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({})) as { error_description?: string };
      throw new Error(err.error_description || `Google token exchange HTTP ${tokenRes.status}`);
    }
    const tokenData = await tokenRes.json() as { access_token: string; refresh_token?: string; expires_in: number; id_token?: string };

    let accountId: string | null = null;
    let accountName: string | null = null;
    try {
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json() as { id: string; name?: string; email?: string };
        accountId = profile.id;
        accountName = profile.name || profile.email || null;
      }
    } catch { /* best-effort */ }

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      expiresIn: tokenData.expires_in || 3600,
      accountId,
      accountName,
    };
  }

  if (platform === 'linkedin') {
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });
    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({})) as { error_description?: string };
      throw new Error(err.error_description || `LinkedIn token exchange HTTP ${tokenRes.status}`);
    }
    const tokenData = await tokenRes.json() as { access_token: string; refresh_token?: string; expires_in: number };

    let accountId: string | null = null;
    let accountName: string | null = null;
    try {
      const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json() as { sub: string; name?: string; email?: string };
        accountId = profile.sub;
        accountName = profile.name || profile.email || null;
      }
    } catch { /* best-effort */ }

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      expiresIn: tokenData.expires_in || 3600,
      accountId,
      accountName,
    };
  }

  if (platform === 'tiktok') {
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({})) as { error?: { message?: string }; error_description?: string };
      throw new Error(err.error?.message || err.error_description || `TikTok token exchange HTTP ${tokenRes.status}`);
    }
    const tokenData = await tokenRes.json() as { data?: { access_token: string; refresh_token?: string; expires_in: number; open_id?: string } };
    const data = tokenData.data;
    if (!data?.access_token) throw new Error('TikTok nao retornou access_token');

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      expiresIn: data.expires_in || 86400,
      accountId: data.open_id || null,
      accountName: null,
    };
  }

  throw new Error(`Exchange nao implementado para ${platform}`);
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
    const tokenResult = await exchangeCodeForToken(platform, code, payload.redirectUri);

    const expiresAt = new Date(Date.now() + tokenResult.expiresIn * 1000).toISOString();

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
      encrypt(tokenResult.accessToken, env.jwtSecret),
      tokenResult.refreshToken ? encrypt(tokenResult.refreshToken, env.jwtSecret) : null,
      expiresAt,
      tokenResult.accountName,
      tokenResult.accountId,
      nowIso(),
    );

    logAudit({ userId: payload.userId, action: 'social.callback', details: { platform, accountId: tokenResult.accountId }, ipAddress: req.ip });

    return res.type('html').send(`
      <!doctype html>
      <html lang="pt-BR">
        <head><meta charset="utf-8"><title>Conexao concluida</title></head>
        <body style="font-family: sans-serif; padding: 32px; text-align: center;">
          <h2 style="color: #10b981;">Conta conectada com sucesso!</h2>
          <p>${tokenResult.accountName ? `<strong>${tokenResult.accountName}</strong> vinculada.` : 'Esta janela sera fechada automaticamente.'}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'oauth_callback',
                platform: ${JSON.stringify(platform)},
                success: true,
                accountName: ${JSON.stringify(null)}
              }, ${JSON.stringify(payload.frontendOrigin)});
              setTimeout(function() { window.close(); }, 1500);
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro no callback OAuth';
    const safePlatform = SOCIAL_PLATFORMS.includes(platform) ? platform : null;
    return res.status(400).type('html').send(`
      <!doctype html>
      <html lang="pt-BR">
        <head><meta charset="utf-8"><title>Erro na conexao</title></head>
        <body style="font-family: sans-serif; padding: 32px; text-align: center;">
          <h2 style="color: #ef4444;">Falha ao conectar a conta</h2>
          <p>${message}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'oauth_callback',
                platform: ${JSON.stringify(safePlatform)},
                success: false,
                error: ${JSON.stringify(message)}
              }, '*');
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
