import type { ProblemDetails, TokenModel } from './types'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/headless/v1'
const STORE_URL = (import.meta.env.VITE_STORE_URL ?? 'http://localhost:5000').replace(/\/$/, '')
const TOKEN_KEY = 'nop.token'

export class ApiError extends Error {
  readonly status: number
  readonly problem?: ProblemDetails

  constructor(status: number, problem?: ProblemDetails) {
    const messages = problem?.errors ? Object.values(problem.errors).flat() : []
    super(messages.join(' ') || problem?.detail || problem?.title || `HTTP ${status}`)
    this.status = status
    this.problem = problem
  }

  /** all messages, e.g. to display them as a list */
  get messages(): string[] {
    const messages = this.problem?.errors ? Object.values(this.problem.errors).flat() : []
    return messages.length ? messages : [this.message]
  }
}

/** Makes a storefront-relative URL (e.g. an image path) absolute. */
export function storeUrl(url: string | null | undefined) {
  if (!url) return ''
  return url.startsWith('/') ? `${STORE_URL}${url}` : url
}

/* ---------- token ---------- */

let currentToken: TokenModel | null = readStoredToken()
const tokenListeners = new Set<(token: TokenModel | null) => void>()

function readStoredToken(): TokenModel | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    return raw ? (JSON.parse(raw) as TokenModel) : null
  } catch {
    return null
  }
}

export function getToken() {
  return currentToken
}

export function setToken(token: TokenModel | null) {
  currentToken = token
  try {
    if (token) localStorage.setItem(TOKEN_KEY, JSON.stringify(token))
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // storage unavailable (private mode); the token then lives only for this page load
  }
  tokenListeners.forEach(listener => listener(token))
}

export function onTokenChange(listener: (token: TokenModel | null) => void) {
  tokenListeners.add(listener)
  return () => {
    tokenListeners.delete(listener)
  }
}

let guestTokenRequest: Promise<TokenModel> | null = null

/** Gets a new guest token; concurrent callers share one request. */
export function issueGuestToken(): Promise<TokenModel> {
  guestTokenRequest ??= request<TokenModel>('POST', '/auth/guest', { auth: false })
    .then(token => {
      setToken(token)
      return token
    })
    .finally(() => {
      guestTokenRequest = null
    })
  return guestTokenRequest
}

/* ---------- request log (shown in the API log panel) ---------- */

export interface RequestLogEntry {
  id: number
  method: string
  url: string
  status: number
  durationMs: number
  at: Date
  requestBody?: unknown
  responseBody?: unknown
}

const requestLog: RequestLogEntry[] = []
const logListeners = new Set<() => void>()
let logId = 0

function addLogEntry(entry: Omit<RequestLogEntry, 'id'>) {
  requestLog.unshift({ ...entry, id: ++logId })
  requestLog.length = Math.min(requestLog.length, 100)
  logListeners.forEach(listener => listener())
}

export function getRequestLog() {
  return requestLog
}

export function clearRequestLog() {
  requestLog.length = 0
  logListeners.forEach(listener => listener())
}

export function onRequestLog(listener: () => void) {
  logListeners.add(listener)
  return () => {
    logListeners.delete(listener)
  }
}

/* ---------- requests ---------- */

type QueryValue = string | number | boolean | Array<string | number> | undefined | null
export type Query = Record<string, QueryValue>

export interface RequestOptions {
  body?: unknown
  query?: Query
  /** send the bearer token (default true) */
  auth?: boolean
  /** return the raw response instead of parsing it */
  raw?: boolean
}

function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, String(item))
  }
  const qs = params.toString()
  return `${API_BASE}${path}${qs ? `?${qs}` : ''}`
}

async function send(method: string, url: string, options: RequestOptions) {
  const headers: Record<string, string> = { Accept: 'application/json' }
  let body: BodyInit | undefined

  if (options.body instanceof FormData) body = options.body
  else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  if (options.auth !== false) {
    const token = currentToken ?? (await issueGuestToken())
    headers.Authorization = `Bearer ${token.accessToken}`
  }

  return fetch(url, { method, headers, body })
}

async function readBody(response: Response) {
  if (response.status === 204) return undefined
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('json')) return response.json()
  return response.blob()
}

export async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const url = buildUrl(path, options.query)
  const started = performance.now()
  let response = await send(method, url, options)

  // Token expired or revoked: continue as a new guest (see API.md, "Anmeldung mit Tokens")
  if (response.status === 401 && options.auth !== false) {
    setToken(null)
    await issueGuestToken()
    response = await send(method, url, options)
  }

  const durationMs = Math.round(performance.now() - started)
  const requestBody = options.body instanceof FormData ? '[multipart/form-data]' : options.body

  if (options.raw) {
    addLogEntry({ method, url, status: response.status, durationMs, at: new Date(), requestBody, responseBody: '[raw]' })
    if (!response.ok) throw new ApiError(response.status, (await readBody(response).catch(() => undefined)) as ProblemDetails)
    return response as T
  }

  const data = await readBody(response).catch(() => undefined)
  addLogEntry({
    method,
    url,
    status: response.status,
    durationMs,
    at: new Date(),
    requestBody,
    responseBody: data instanceof Blob ? `[${data.type || 'file'}, ${data.size} bytes]` : data,
  })

  if (!response.ok) throw new ApiError(response.status, data instanceof Blob ? undefined : (data as ProblemDetails))
  return data as T
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, query?: Query) => request<T>('POST', path, { body, query }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, { body }),

  /** Uploads a file as multipart/form-data. */
  upload<T>(path: string, file: File, field = 'file', method = 'POST', extra?: Record<string, string>) {
    const form = new FormData()
    form.append(field, file)
    for (const [key, value] of Object.entries(extra ?? {})) form.append(key, value)
    return request<T>(method, path, { body: form })
  },

  /**
   * Downloads a file. The API either returns the file or { downloadUrl } for external downloads
   * (see API.md, "Downloads"), so both are handled here.
   */
  async download(path: string, query?: Query, method = 'GET') {
    const response = await request<Response>(method, path, { query, raw: true })
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('json')) {
      const { downloadUrl } = (await response.json()) as { downloadUrl?: string }
      if (downloadUrl) window.open(downloadUrl, '_blank', 'noopener')
      return
    }
    const blob = await response.blob()
    const disposition = response.headers.get('content-disposition') ?? ''
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = match ? decodeURIComponent(match[1]) : 'download'
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000)
  },
}
