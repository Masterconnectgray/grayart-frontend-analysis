import { env } from '../config/env';

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getFlowToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const response = await fetch(`${env.flowApiUrl}/flow/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: env.flowUser,
      password: env.flowPass,
    }),
  });

  if (!response.ok) {
    throw new Error(`Flow auth failed: HTTP ${response.status}`);
  }

  const data = await response.json() as { token: string };
  cachedToken = data.token;
  tokenExpiry = Date.now() + 7 * 60 * 60 * 1000;
  return cachedToken;
}

export async function flowFetch(path: string, options: RequestInit = {}) {
  const token = await getFlowToken();

  return fetch(`${env.flowApiUrl}/flow/grayart${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}
