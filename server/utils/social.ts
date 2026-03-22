export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube';

interface PlatformConfig {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  authUrl: string;
}

import { env } from '../config/env';
import { getOAuthCredential } from './oauthCredentials';

const PLATFORM_META: Record<SocialPlatform, Omit<PlatformConfig, 'clientId' | 'clientSecret'>> = {
  instagram: {
    scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights', 'pages_show_list'],
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
  },
  facebook: {
    scopes: ['pages_manage_posts', 'pages_read_engagement', 'publish_to_groups', 'pages_show_list'],
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
  },
  linkedin: {
    scopes: ['w_member_social', 'r_liteprofile', 'r_emailaddress', 'r_organization_social', 'w_organization_social'],
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
  },
  tiktok: {
    scopes: ['user.info.basic', 'video.upload', 'video.publish'],
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
  },
  youtube: {
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

export const SOCIAL_PLATFORMS: SocialPlatform[] = ['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube'];

export function getPlatformConfig(platform: SocialPlatform): PlatformConfig {
  const credential = getOAuthCredential(platform);
  return {
    clientId: credential.clientId,
    clientSecret: credential.clientSecret,
    scopes: PLATFORM_META[platform].scopes,
    authUrl: PLATFORM_META[platform].authUrl,
  };
}

export function getOAuthRedirectUri(platform: SocialPlatform) {
  return `${env.appBaseUrl}/api/social/callback?platform=${platform}`;
}
