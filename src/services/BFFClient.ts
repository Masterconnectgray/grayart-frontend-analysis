const API_BASE = import.meta.env.DEV ? '/api' : '/grayart/api'
const TOKEN_KEY = 'grayart_bff_token'
const CACHE_TTL = 5 * 60 * 1000

const responseCache = new Map<string, { data: Response; timestamp: number }>()

function getCached(key: string): Response | null {
  const entry = responseCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    responseCache.delete(key)
    return null
  }
  return entry.data.clone()
}

function setCache(key: string, response: Response) {
  if (responseCache.size > 100) {
    const oldest = responseCache.keys().next().value
    if (oldest) responseCache.delete(oldest)
  }
  responseCache.set(key, { data: response.clone(), timestamp: Date.now() })
}

export function invalidateCache(pathPrefix?: string) {
  if (!pathPrefix) {
    responseCache.clear()
    return
  }
  for (const key of responseCache.keys()) {
    if (key.startsWith(pathPrefix)) responseCache.delete(key)
  }
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

const NO_CACHE_PATTERNS = ['/status/', '/poll', '/health', '/ws']

function shouldCache(path: string): boolean {
  return !NO_CACHE_PATTERNS.some(p => path.includes(p))
}

export async function bffFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  if (!token) {
    throw new Error('NOT_AUTHENTICATED')
  }

  const method = (options.method || 'GET').toUpperCase()
  const isGet = method === 'GET'
  const cacheable = isGet && shouldCache(path)
  const cacheKey = `${token}::${path}`

  if (cacheable) {
    const cached = getCached(cacheKey)
    if (cached) return cached
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
    invalidateCache()
    window.dispatchEvent(new Event('grayart:logout'))
  }

  if (cacheable && response.ok) {
    setCache(cacheKey, response)
  }

  if (!isGet) {
    invalidateCache()
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
  invalidateCache()
}

export function isAuthenticated(): boolean {
  return !!getToken()
}
