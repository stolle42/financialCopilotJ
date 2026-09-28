import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ledgerState, resetLedgerState } from '@/test/handlers/ledger'
import { renderWithProviders } from '@/test/render'

import { AccountsPage } from './AccountsPage'

describe('ReconcileDialog', () => {
  beforeEach(() => {
    resetLedgerState()
    ledgerState.accounts.push({
      id: 2,
      name: 'Savings',
      type: 'savings',
      opening_balance: '100.00',
      balance: '100.00',
    })
  })

  it('opens from every account row regardless of type', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AccountsPage />)
    await screen.findByText('Cash')
    const reconcileButtons = await screen.findAllByRole('button', {
      name: /reconcile/i,
    })
    expect(reconcileButtons).toHaveLength(2)
    await user.click(reconcileButtons[1]!)
    expect(
      await screen.findByRole('dialog', { name: /reconcile savings/i }),
    ).toBeInTheDocument()
  })

  it('books a transaction when actual balance differs', async () => {
    ledgerState.accounts[0]!.balance = '100.00'
    ledgerState.accounts[0]!.opening_balance = '100.00'
    const user = userEvent.setup()
    renderWithProviders(<AccountsPage />)
    await screen.findByText('Cash')
    await user.click(
      screen.getAllByRole('button', { name: /reconcile/i })[0]!,
    )
    const dialog = await screen.findByRole('dialog', { name: /reconcile cash/i })
    const actual = within(dialog).getByLabelText(/actual balance/i)
    await user.clear(actual)
    await user.type(actual, '85.00')
    await user.click(within(dialog).getByRole('button', { name: /^reconcile$/i }))
    expect(
      await within(dialog).findByText(/reconciliation/i),
    ).toBeInTheDocument()
    expect(within(dialog).getByText(/15\.00/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /done/i }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(await screen.findByText('85.00')).toBeInTheDocument()
  })

  it('shows already matches when balances are equal', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AccountsPage />)
    await screen.findByText('Savings')
    await user.click(
      screen.getAllByRole('button', { name: /reconcile/i })[1]!,
    )
    const dialog = await screen.findByRole('dialog', {
      name: /reconcile savings/i,
    })
    const actual = within(dialog).getByLabelText(/actual balance/i)
    await user.clear(actual)
    await user.type(actual, '100.00')
    await user.click(within(dialog).getByRole('button', { name: /^reconcile$/i }))
    expect(
      await within(dialog).findByText(/already matches/i),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /done/i }))
    expect(await screen.findByText('100.00')).toBeInTheDocument()
  })
})
