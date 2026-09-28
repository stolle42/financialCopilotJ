import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { BudgetProgress } from './BudgetProgress'

describe('BudgetProgress', () => {
  it('shows month heading and progress bars with over-limit styling', () => {
    render(
      <BudgetProgress
        month="2026-09"
        items={[
          {
            category: { id: 1, name: 'Groceries' },
            monthly_limit: '400.00',
            spent: '450.00',
            over_limit: true,
          },
          {
            category: { id: 2, name: 'Transport' },
            monthly_limit: '200.00',
            spent: '50.00',
            over_limit: false,
          },
        ]}
      />,
    )
    expect(screen.getByRole('heading', { name: /september 2026/i })).toBeInTheDocument()
    expect(screen.getAllByRole('progressbar')).toHaveLength(2)
    expect(document.querySelector('.budget-over-limit')).toBeTruthy()
    expect(screen.getByText('Over budget limit')).toBeInTheDocument()
    expect(screen.getByText('Within budget limit')).toBeInTheDocument()
  })
})
