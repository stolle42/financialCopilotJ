import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { importState, resetImportState } from '@/test/handlers/import'
import { resetLedgerState } from '@/test/handlers/ledger'
import { renderWithProviders } from '@/test/render'

import { ProfileForm } from './ProfileForm'

describe('ProfileForm', () => {
  beforeEach(() => {
    resetLedgerState()
    resetImportState()
  })

  it('creates a signed-amount profile on save', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<ProfileForm onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText(/profile name/i), 'Bank export')
    await user.click(screen.getByRole('button', { name: /save profile/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Bank export',
      amount_column: 'amount',
      debit_column: null,
      credit_column: null,
    })
  })

  it('supports debit and credit column layout', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<ProfileForm onSubmit={onSubmit} />)
    await user.click(screen.getByRole('tab', { name: /debit \/ credit/i }))
    await user.type(screen.getByLabelText(/profile name/i), 'Split columns')
    await user.clear(screen.getByLabelText(/debit column/i))
    await user.type(screen.getByLabelText(/debit column/i), 'Soll')
    await user.clear(screen.getByLabelText(/credit column/i))
    await user.type(screen.getByLabelText(/credit column/i), 'Haben')
    await user.click(screen.getByRole('button', { name: /save profile/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      amount_column: null,
      debit_column: 'Soll',
      credit_column: 'Haben',
    })
  })
})
