import { useMemo } from 'react'

import { useCategories } from '@/api/queries/categories'
import { useBudgetProgress } from '@/api/queries/budgets'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { currentMonth } from '@/lib/periods'

import { BudgetLimitForm } from './BudgetLimitForm'

export function BudgetsPage() {
  const month = currentMonth().from.slice(0, 7)
  const { data: categories = [] } = useCategories()
  const { data: progress = [] } = useBudgetProgress(month)

  const limitsByCategory = useMemo(
    () => new Map(progress.map((row) => [row.category.id, row.monthly_limit])),
    [progress],
  )

  const budgetableCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.side === 'expense' && category.protected_role === null,
      ),
    [categories],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Monthly spending limits for expense categories.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {budgetableCategories.map((category) => (
            <BudgetLimitForm
              key={category.id}
              categoryId={category.id}
              categoryName={category.name}
              currentLimit={limitsByCategory.get(category.id)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
