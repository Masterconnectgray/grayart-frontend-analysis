const API_BASE = import.meta.env.DEV ? '/api' : '/grayart/api'
const TOKEN_KEY = 'grayart_bff_token'

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export async function bffFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  if (!token) {
    throw new Error('NOT_AUTHENTICATED')
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY)
    window.dispatchEvent(new Event('grayart:logout'))
  }

  return response
}

export async function bffUpload(path: string, formData: FormData): Promise<Response> {
  const token = getToken()
  if (!token) {
    throw new Error('NOT_AUTHENTICATED')
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY)
    window.dispatchEvent(new Event('grayart:logout'))
  }

  return response
}

export function clearBffSession() {
  localStorage.removeItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return !!getToken()
}
