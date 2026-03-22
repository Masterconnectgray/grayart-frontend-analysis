const API_BASE = import.meta.env.DEV ? '/api' : '/grayart/api'
const TOKEN_KEY = 'grayart_bff_token'
const EMAIL_KEY = 'grayart_bff_email'
const PASSWORD_KEY = 'grayart_bff_password'

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getStoredIdentity() {
  let email = localStorage.getItem(EMAIL_KEY)
  let password = localStorage.getItem(PASSWORD_KEY)

  if (!email || !password) {
    const seed = randomId()
    email = `grayart-${seed}@local.grayart`
    password = `GrayArt!${seed}`
    localStorage.setItem(EMAIL_KEY, email)
    localStorage.setItem(PASSWORD_KEY, password)
  }

  return { email, password }
}

async function bootstrapSession() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) return token

  const { email, password } = getStoredIdentity()
  const payload = {
    email,
    password,
    name: 'GrayArt Local User',
  }

  let response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (response.status === 409) {
    response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || 'Falha ao autenticar no BFF')
  }

  const data = await response.json() as { token: string }
  localStorage.setItem(TOKEN_KEY, data.token)
  return data.token
}

export async function bffFetch(path: string, options: RequestInit = {}, retry = true): Promise<Response> {
  const token = await bootstrapSession()

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (response.status === 401 && retry) {
    localStorage.removeItem(TOKEN_KEY)
    return bffFetch(path, options, false)
  }

  return response
}

export async function bffUpload(path: string, formData: FormData, retry = true): Promise<Response> {
  const token = await bootstrapSession()
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status === 401 && retry) {
    localStorage.removeItem(TOKEN_KEY)
    return bffUpload(path, formData, false)
  }

  return response
}

export function clearBffSession() {
  localStorage.removeItem(TOKEN_KEY)
}
