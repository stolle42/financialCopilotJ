import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { currentMonth, resolvePreset } from '@/lib/periods'
import { insightsState } from '@/test/handlers/insights'
import { renderWithProviders } from '@/test/render'

import { InsightsPage } from './InsightsPage'

describe('InsightsPage', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-09-15T12:00:00'))
    insightsState.lastFrom = ''
    insightsState.lastTo = ''
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens on the current calendar month', async () => {
    renderWithProviders(<InsightsPage />)
    const { from, to } = currentMonth()
    await waitFor(() => {
      expect(insightsState.lastFrom).toBe(from)
      expect(insightsState.lastTo).toBe(to)
    })
  })

  it('refetches when presets or date inputs change', async () => {
    const user = userEvent.setup()
    renderWithProviders(<InsightsPage />)
    await waitFor(() => expect(insightsState.lastFrom).toBe('2026-09-01'))

    await user.click(screen.getByRole('button', { name: /last month/i }))
    const lastMonth = resolvePreset('last-month')
    await waitFor(() => {
      expect(insightsState.lastFrom).toBe(lastMonth.from)
      expect(insightsState.lastTo).toBe(lastMonth.to)
    })

    const fromInput = screen.getByLabelText(/^from$/i)
    await user.clear(fromInput)
    await user.type(fromInput, '2026-07-01')
    await waitFor(() => expect(insightsState.lastFrom).toBe('2026-07-01'))
  })

  it('renders charts from mocked data with unaccounted styling', async () => {
    renderWithProviders(<InsightsPage />)
    expect(await screen.findByTestId('spending-line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('expense-donut')).toBeInTheDocument()
    expect(screen.getByTestId('income-donut')).toBeInTheDocument()
    expect(document.querySelector('.unaccounted-pattern')).toBeTruthy()
    expect(document.querySelector('.unaccounted-legend-label')).toHaveTextContent(
      'Unaccounted',
    )
  })

  it('shows empty state for periods with no data', async () => {
    const user = userEvent.setup()
    renderWithProviders(<InsightsPage />)
    await screen.findByTestId('spending-line-chart')

    await user.clear(screen.getByLabelText(/^from$/i))
    await user.type(screen.getByLabelText(/^from$/i), '2030-01-01')
    await user.clear(screen.getByLabelText(/^to$/i))
    await user.type(screen.getByLabelText(/^to$/i), '2030-01-31')

    expect(
      await screen.findByTestId('insights-empty'),
    ).toHaveTextContent(/no activity/i)
  })

  it('does not attach click handlers to chart surfaces', async () => {
    renderWithProviders(<InsightsPage />)
    await screen.findByTestId('spending-line-chart')
    const interactive = document.querySelectorAll(
      '.recharts-sector[onclick], .recharts-curve[onclick], .recharts-line-curve[onclick]',
    )
    expect(interactive.length).toBe(0)
  })
})
