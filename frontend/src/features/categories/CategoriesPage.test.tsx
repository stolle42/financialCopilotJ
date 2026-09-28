import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ledgerState, resetLedgerState } from '@/test/handlers/ledger'
import { renderWithProviders } from '@/test/render'

import { CategoriesPage } from './CategoriesPage'

describe('CategoriesPage', () => {
  beforeEach(() => {
    resetLedgerState()
  })

  it('keeps expense and income categories in separate tabs', async () => {
    renderWithProviders(<CategoriesPage />)
    expect(await screen.findByText('Groceries')).toBeInTheDocument()
    expect(screen.queryByText('Salary')).not.toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('tab', { name: /income/i }))
    expect(await screen.findByText('Salary')).toBeInTheDocument()
    expect(screen.queryByText('Groceries')).not.toBeInTheDocument()
  })

  it('creates, renames, and recolours a category', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage />)
    await user.click(screen.getByRole('button', { name: /new category/i }))
    const createDialog = await screen.findByRole('dialog', {
      name: /new expense category/i,
    })
    await user.type(within(createDialog).getByLabelText(/^name$/i), 'Pets')
    await user.click(within(createDialog).getByRole('button', { name: /create/i }))
    await waitFor(() =>
      expect(screen.getByText('Pets')).toBeInTheDocument(),
    )

    const row = screen.getByText('Pets').closest('div')!.parentElement!
    await user.click(within(row).getByRole('button', { name: /^edit$/i }))
    const editDialog = await screen.findByRole('dialog', { name: /edit category/i })
    const name = within(editDialog).getByLabelText(/^name$/i)
    await user.clear(name)
    await user.type(name, 'Pet care')
    await user.click(
      within(editDialog).getByRole('button', { name: /save changes/i }),
    )
    expect(await screen.findByText('Pet care')).toBeInTheDocument()
  })

  it('confirms delete and mentions Uncategorised', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage />)
    const row = (await screen.findByText('Groceries')).closest('div')!
      .parentElement!
    await user.click(within(row).getByRole('button', { name: /^delete$/i }))
    expect(
      await screen.findByText(/move to uncategorised on the same side/i),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    await waitFor(() =>
      expect(screen.queryByText('Groceries')).not.toBeInTheDocument(),
    )
  })

  it('shows protected explanation instead of delete', async () => {
    renderWithProviders(<CategoriesPage />)
    const label = await screen.findByText('Uncategorised')
    const row = label.closest('div')!.parentElement!
    expect(
      within(row).getByText(/cannot delete protected categories/i),
    ).toBeInTheDocument()
    expect(
      within(row).queryByRole('button', { name: /^delete$/i }),
    ).not.toBeInTheDocument()
  })

  it('surfaces duplicate name errors from the API', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CategoriesPage />)
    await user.click(screen.getByRole('button', { name: /new category/i }))
    const dialog = await screen.findByRole('dialog', {
      name: /new expense category/i,
    })
    await user.type(within(dialog).getByLabelText(/^name$/i), 'Groceries')
    await user.click(within(dialog).getByRole('button', { name: /create/i }))
    expect(
      await within(dialog).findByText(/unique within this side/i),
    ).toBeInTheDocument()
    expect(ledgerState.categories.filter((c) => c.name === 'Groceries')).toHaveLength(1)
  })
})
