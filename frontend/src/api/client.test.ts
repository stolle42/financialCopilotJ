import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { csrfMiddleware } from './client'

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : undefined
}

describe('apiClient CSRF middleware', () => {
  beforeEach(() => {
    document.cookie = 'csrftoken=abc123; path=/'
  })

  afterEach(() => {
    document.cookie = 'csrftoken=; Max-Age=0; path=/'
  })

  it('does not set X-CSRFToken on GET', async () => {
    const request = new Request('http://example/api/health', { method: 'GET' })
    const updated = await csrfMiddleware.onRequest!({
      request,
      schemaPath: '/api/health',
      params: {},
      options: {},
      id: 'test',
    })
    expect(updated.headers.get('X-CSRFToken')).toBeNull()
  })

  it('sets X-CSRFToken from csrftoken cookie on POST', async () => {
    const request = new Request('http://example/api/_csrf_probe', {
      method: 'POST',
    })
    const updated = await csrfMiddleware.onRequest!({
      request,
      schemaPath: '/api/_csrf_probe',
      params: {},
      options: {},
      id: 'test',
    })
    expect(updated.headers.get('X-CSRFToken')).toBe(getCookie('csrftoken'))
  })
})
