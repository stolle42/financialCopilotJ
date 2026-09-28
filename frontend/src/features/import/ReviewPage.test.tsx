import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'

import {
  importState,
  resetImportState,
  seedReviewBatch,
} from '@/test/handlers/import'
import { ledgerState, resetLedgerState } from '@/test/handlers/ledger'
import { renderWithProviders } from '@/test/render'

import { ImportPage } from './ImportPage'
import { ImportReviewPage } from './ImportReviewPage'

const navigateMock = vi.fn()

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

function ImportRoutes() {
  return (
    <Routes>
      <Route path="/import" element={<ImportPage />} />
      <Route path="/import/:batchId" element={<ImportReviewPage />} />
    </Routes>
  )
}

describe('ImportReviewPage', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    resetLedgerState()
    resetImportState()
    ledgerState.accounts.push({
      id: 2,
      name: 'Checking',
      type: 'checking',
      opening_balance: '0.00',
      balance: '0.00',
    })
    seedReviewBatch()
  })

  it('renders vendor groups and low-prominence issue links', async () => {
    renderWithProviders(<ImportRoutes />, { route: '/import/1' })
    expect(await screen.findByText('ACME Corp')).toBeInTheDocument()
    expect(screen.getByText(/unparsable rows \(1\)/i)).toBeInTheDocument()
    expect(screen.getByText(/duplicate rows/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getAllByText('Uncategorised').length).toBeGreaterThan(0)
    })
  })

  it('expands unparsable rows with a reason', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ImportRoutes />, { route: '/import/1' })
    await user.click(await screen.findByText(/unparsable rows \(1\)/i))
    expect(await screen.findByText('unreadable date')).toBeInTheDocument()
  })

  it('confirms the batch and navigates back to import', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ImportRoutes />, { route: '/import/1' })
    await screen.findByText('ACME Corp')
    await user.click(screen.getByRole('button', { name: /confirm import/i }))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/import'))
    expect(importState.batches.has(1)).toBe(false)
  })

  it('discards the batch and navigates back', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ImportRoutes />, { route: '/import/1' })
    await screen.findByText('ACME Corp')
    await user.click(screen.getByRole('button', { name: /discard batch/i }))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/import'))
  })
})
