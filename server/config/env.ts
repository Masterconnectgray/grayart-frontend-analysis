import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT || 3060),
  geminiApiKey: required('GEMINI_API_KEY'),
  evolutionApiKey: required('EVOLUTION_API_KEY'),
  evolutionApiUrl: required('EVOLUTION_API_URL'),
  flowApiUrl: required('FLOW_API_URL'),
  flowUser: required('FLOW_USER'),
  flowPass: required('FLOW_PASS'),
  jwtSecret: required('JWT_SECRET'),
  databaseUrl: required('DATABASE_URL'),
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3060',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  metaAppId: process.env.META_APP_ID || '',
  metaAppSecret: process.env.META_APP_SECRET || '',
  linkedinClientId: process.env.LINKEDIN_CLIENT_ID || '',
  linkedinClientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
  tiktokClientKey: process.env.TIKTOK_CLIENT_KEY || '',
  tiktokClientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
};

export function resolveSqlitePath(databaseUrl: string): string {
  if (!databaseUrl.startsWith('sqlite:')) {
    throw new Error('DATABASE_URL deve usar o formato sqlite:./caminho.sqlite');
  }

  const rawPath = databaseUrl.replace(/^sqlite:/, '');
  return path.resolve(process.cwd(), rawPath);
}
