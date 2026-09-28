import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { resetLedgerState } from '@/test/handlers/ledger'
import { renderWithProviders } from '@/test/render'

import { AccountsPage } from './AccountsPage'

describe('AccountsPage', () => {
  beforeEach(() => {
    resetLedgerState()
  })

  it('lists accounts with balances', async () => {
    renderWithProviders(<AccountsPage />)
    expect(await screen.findByText('Cash')).toBeInTheDocument()
    expect(screen.getByText('0.00')).toBeInTheDocument()
  })

  it('warns before changing opening balance', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AccountsPage />)
    await user.click(await screen.findByRole('button', { name: /edit/i }))
    const opening = await screen.findByLabelText(/opening balance/i)
    await user.clear(opening)
    await user.type(opening, '50.00')
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(
      await screen.findByText(/every balance this account has ever shown/i),
    ).toBeInTheDocument()
  })
})
