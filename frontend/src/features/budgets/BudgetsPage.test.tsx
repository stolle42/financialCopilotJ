import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { budgetsState } from '@/test/handlers/budgets'
import { renderWithProviders } from '@/test/render'

import { BudgetsPage } from './BudgetsPage'

describe('BudgetsPage', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-09-15T12:00:00'))
    budgetsState.limits.clear()
    budgetsState.lastPutCategoryId = 0
    budgetsState.lastDeleteCategoryId = 0
    budgetsState.getCalls = 0
  })

  it('lists only non-protected expense categories as budgetable', async () => {
    renderWithProviders(<BudgetsPage />)
    expect(await screen.findByLabelText(/monthly limit for groceries/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/uncategorised/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/salary/i)).not.toBeInTheDocument()
  })

  it('set, change, and remove limits via PUT and DELETE', async () => {
    const user = userEvent.setup()
    renderWithProviders(<BudgetsPage />)
    const input = await screen.findByLabelText(/monthly limit for groceries/i)
    await user.clear(input)
    await user.type(input, '400')
    await user.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(budgetsState.lastPutCategoryId).toBe(11))

    await user.clear(input)
    await user.type(input, '500')
    await user.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(budgetsState.limits.get(11)).toBe('500'))

    await user.click(screen.getByRole('button', { name: /^remove$/i }))
    await waitFor(() => expect(budgetsState.lastDeleteCategoryId).toBe(11))
  })
})
