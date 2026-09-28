import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ledgerState, resetLedgerState } from '@/test/handlers/ledger'
import { renderWithProviders } from '@/test/render'

import { TransactionForm } from './TransactionForm'

describe('TransactionForm', () => {
  beforeEach(() => {
    resetLedgerState()
  })

  it('opens on Cash and expense Uncategorised before manual entry', async () => {
    renderWithProviders(
      <TransactionForm onSubmit={vi.fn()} />,
    )
    await waitFor(() => {
      expect(screen.getByText('Cash')).toBeInTheDocument()
    })
    expect(screen.getAllByText('Uncategorised').length).toBeGreaterThan(0)
  })

  it('posts a zero expense when saved untouched', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<TransactionForm onSubmit={onSubmit} />)
    await screen.findByText('Cash')
    await user.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      amount: '0.00',
      kind: 'expense',
      account_id: 1,
      category_id: 10,
    })
  })

  it('uses the last manual entry account from defaults', async () => {
    ledgerState.defaults.account_id = 2
    ledgerState.accounts.push({
      id: 2,
      name: 'Checking',
      type: 'checking',
      opening_balance: '0.00',
      balance: '0.00',
    })
    renderWithProviders(<TransactionForm onSubmit={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Checking')).toBeInTheDocument()
    })
  })

  it('rejects negative amounts in the amount field', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TransactionForm onSubmit={vi.fn()} />)
    await screen.findByText('Cash')
    const amount = screen.getByLabelText('Amount')
    await user.clear(amount)
    await user.type(amount, '-5')
    expect(amount).toHaveValue('5')
  })
})
