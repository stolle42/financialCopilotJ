import createClient, { type Middleware } from 'openapi-fetch'

import type { paths } from './schema'

function readCsrfToken(): string | undefined {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : undefined
}

export const csrfMiddleware: Middleware = {
  async onRequest({ request }) {
    const method = request.method.toUpperCase()
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return request
    }
    const token = readCsrfToken()
    if (token) {
      request.headers.set('X-CSRFToken', token)
    }
    return request
  },
}

function resolveBaseUrl(): string {
  if (import.meta.env.VITEST) {
    return 'http://localhost'
  }
  if (typeof window !== 'undefined') {
    return ''
  }
  return 'http://localhost'
}

export const apiClient = createClient<paths>({ baseUrl: resolveBaseUrl() })
apiClient.use(csrfMiddleware)

export type { paths }
