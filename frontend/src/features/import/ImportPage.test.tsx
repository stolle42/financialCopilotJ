import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'

import { importState, resetImportState } from '@/test/handlers/import'
import { resetLedgerState } from '@/test/handlers/ledger'
import { renderWithProviders } from '@/test/render'

import { ImportReviewPage } from './ImportReviewPage'
import { ImportPage } from './ImportPage'

const navigateMock = vi.fn()
const uploadMutateAsync = vi.fn()

vi.mock('@/api/queries/import', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/queries/import')>()
  return {
    ...actual,
    useUploadImportBatch: () => ({
      mutateAsync: uploadMutateAsync,
      isPending: false,
    }),
  }
})

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

describe('ImportPage', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    uploadMutateAsync.mockReset()
    uploadMutateAsync.mockResolvedValue({ id: 1 })
    resetLedgerState()
    resetImportState()
    importState.profiles.push({
      id: 1,
      name: 'Default CSV',
      date_column: 'date',
      amount_column: 'amount',
      debit_column: null,
      credit_column: null,
      description_column: 'description',
      counterparty_column: null,
      date_format: '%Y-%m-%d',
      decimal_separator: '.',
      encoding: 'utf-8',
    })
    importState.batches.set(99, {
      id: 99,
      account_id: 1,
      profile_id: 1,
      source_filename: 'pending.csv',
      created_at: new Date().toISOString(),
      row_count: 5,
      unparsable_count: 1,
      duplicate_count: 2,
      groups: [],
      ungrouped_rows: [],
      unparsable_rows: [],
    })
  })

  it('lists pending batches with issue counts', async () => {
    renderWithProviders(<ImportRoutes />, { route: '/import' })
    expect(await screen.findByText('pending.csv')).toBeInTheDocument()
    expect(screen.getByText(/1 unparsable/)).toBeInTheDocument()
    expect(screen.getByText(/2 duplicates/)).toBeInTheDocument()
  })

  it('uploads a file and navigates to review', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ImportRoutes />, { route: '/import' })
    await screen.findByRole('button', { name: /upload and review/i })
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /account/i })).toHaveTextContent(
        'Cash',
      )
      expect(screen.getByRole('combobox', { name: /mapping profile/i })).toHaveTextContent(
        'Default CSV',
      )
    })
    const fileInput = screen.getByLabelText(/csv file/i)
    const file = new File(['date,amount,description\n2026-01-01,-1.00,Test'], 'test.csv', {
      type: 'text/csv',
    })
    await user.upload(fileInput, file)
    await user.click(screen.getByRole('button', { name: /upload and review/i }))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/import/1'))
  })
})
