import { env } from '../config/env';

export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube';

interface PlatformConfig {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  authUrl: string;
}

export const PLATFORM_CONFIGS: Record<SocialPlatform, PlatformConfig> = {
  instagram: {
    clientId: env.metaAppId,
    clientSecret: env.metaAppSecret,
    scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights', 'pages_show_list'],
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
  },
  facebook: {
    clientId: env.metaAppId,
    clientSecret: env.metaAppSecret,
    scopes: ['pages_manage_posts', 'pages_read_engagement', 'publish_to_groups', 'pages_show_list'],
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
  },
  linkedin: {
    clientId: env.linkedinClientId,
    clientSecret: env.linkedinClientSecret,
    scopes: ['w_member_social', 'r_liteprofile', 'r_emailaddress', 'r_organization_social', 'w_organization_social'],
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
  },
  tiktok: {
    clientId: env.tiktokClientKey,
    clientSecret: env.tiktokClientSecret,
    scopes: ['user.info.basic', 'video.upload', 'video.publish'],
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
  },
  youtube: {
    clientId: env.googleClientId,
    clientSecret: env.googleClientSecret,
    scopes: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  },
};

export function getOAuthRedirectUri(platform: SocialPlatform) {
  return `${env.appBaseUrl}/api/social/callback?platform=${platform}`;
}
