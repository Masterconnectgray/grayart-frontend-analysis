import { db, nowIso } from '../database';
import { env } from '../config/env';
import type { SocialPlatform } from './social';

type CredentialRecord = {
  clientId: string;
  clientSecret: string;
};

const ENV_FALLBACKS: Record<SocialPlatform, CredentialRecord> = {
  instagram: { clientId: env.metaAppId, clientSecret: env.metaAppSecret },
  facebook: { clientId: env.metaAppId, clientSecret: env.metaAppSecret },
  linkedin: { clientId: env.linkedinClientId, clientSecret: env.linkedinClientSecret },
  tiktok: { clientId: env.tiktokClientKey, clientSecret: env.tiktokClientSecret },
  youtube: { clientId: env.googleClientId, clientSecret: env.googleClientSecret },
};

export function getOAuthCredential(platform: SocialPlatform): CredentialRecord {
  const row = db.prepare(`
    SELECT client_id, client_secret
    FROM oauth_credentials
    WHERE platform = ?
    LIMIT 1
  `).get(platform) as
    | { client_id: string; client_secret: string }
    | undefined;

  if (row) {
    return {
      clientId: row.client_id,
      clientSecret: row.client_secret,
    };
  }

  return ENV_FALLBACKS[platform];
}

export function setOAuthCredential(platform: SocialPlatform, clientId: string, clientSecret: string) {
  db.prepare(`
    INSERT INTO oauth_credentials (platform, client_id, client_secret, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(platform) DO UPDATE SET
      client_id = excluded.client_id,
      client_secret = excluded.client_secret,
      updated_at = excluded.updated_at
  `).run(platform, clientId, clientSecret, nowIso());
}

export function clearOAuthCredential(platform: SocialPlatform) {
  db.prepare(`
    DELETE FROM oauth_credentials
    WHERE platform = ?
  `).run(platform);
}

export function listOAuthCredentialFlags(platforms: SocialPlatform[]) {
  return platforms.map((platform) => {
    const credential = getOAuthCredential(platform);
    return {
      platform,
      hasAppId: !!credential.clientId,
      hasAppSecret: !!credential.clientSecret,
      configured: !!credential.clientId && !!credential.clientSecret,
    };
  });
}
