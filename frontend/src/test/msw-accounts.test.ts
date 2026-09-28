import { beforeEach, describe, expect, it } from 'vitest'

import { apiClient } from '@/api/client'
import { resetLedgerState } from '@/test/handlers/ledger'

describe('MSW ledger handlers', () => {
  beforeEach(() => {
    resetLedgerState()
  })

  it('raw fetch returns accounts', async () => {
    const res = await fetch('http://localhost/api/accounts')
    expect(res.ok).toBe(true)
    const json = await res.json()
    expect(json[0].name).toBe('Cash')
  })

  it('fetch with Request object returns accounts', async () => {
    const res = await fetch(new Request('http://localhost/api/accounts'))
    expect(res.ok).toBe(true)
  })

  it('apiClient returns accounts', async () => {
    const { data, error } = await apiClient.GET('/api/accounts')
    expect(error).toBeUndefined()
    expect(data?.[0]?.name).toBe('Cash')
  })
})
