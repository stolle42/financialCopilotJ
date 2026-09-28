import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ledgerState, resetLedgerState } from '@/test/handlers/ledger'
import { renderWithProviders } from '@/test/render'

import { TransactionsPage } from './TransactionsPage'

describe('TransactionsPage', () => {
  beforeEach(() => {
    resetLedgerState()
    ledgerState.transactions = [
      {
        id: 1,
        date: '2026-02-01',
        amount: '2.00',
        description: 'beta shop',
        kind: 'expense',
        account_id: 1,
        category_id: 11,
        destination_account_id: null,
      },
      {
        id: 2,
        date: '2026-01-01',
        amount: '1.00',
        description: 'alpha',
        kind: 'expense',
        account_id: 1,
        category_id: 11,
        destination_account_id: null,
      },
    ]
  })

  it('renders transactions sorted by date', async () => {
    renderWithProviders(<TransactionsPage />)
    await screen.findByText('beta shop')
    await screen.findByText('alpha')
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('2026-02-01')
    expect(rows[2]).toHaveTextContent('2026-01-01')
  })

  it('asks for confirmation before delete', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TransactionsPage />)
    await screen.findByText('beta shop')
    const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i })
    await user.click(deleteButtons[0])
    expect(
      await screen.findByText(/delete transaction\?/i),
    ).toBeInTheDocument()
  })
})
