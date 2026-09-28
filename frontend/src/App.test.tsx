import { cleanup, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { AppRoutes } from './App'
import { renderWithProviders } from './test/render'

const NAV_LABELS = [
  'Transactions',
  'Accounts',
  'Categories',
  'Import',
  'Budgets',
  'Insights',
]

describe('App shell', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the transactions page at the index route', () => {
    renderWithProviders(<AppRoutes />, { route: '/' })
    expect(
      screen.getByRole('heading', { name: /transactions/i }),
    ).toBeInTheDocument()
  })

  it('lists every primary route in the navigation', () => {
    renderWithProviders(<AppRoutes />, { route: '/' })
    const nav = screen.getByRole('navigation', { name: 'Main' })
    for (const label of NAV_LABELS) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument()
    }
  })
})
