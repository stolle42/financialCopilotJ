import { useMemo, useState } from 'react'

import { useInsights } from '@/api/queries/insights'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { currentMonth, resolvePreset, type DateRange } from '@/lib/periods'

import { BudgetProgress } from './BudgetProgress'
import { BreakdownDonut } from './BreakdownDonut'
import { PeriodPicker } from './PeriodPicker'
import { SpendingLineChart } from './SpendingLineChart'

export function InsightsPage() {
  const [range, setRange] = useState<DateRange>(() => currentMonth())
  const { data, isLoading, isError } = useInsights(range)

  const isEmpty = useMemo(() => {
    if (!data) {
      return false
    }
    return (
      data.spending_over_time.length === 0 &&
      data.expense_breakdown.length === 0 &&
      data.income_breakdown.length === 0
    )
  }, [data])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Spending and income for the period you choose.
        </p>
      </div>

      <PeriodPicker
        value={range}
        onChange={setRange}
        onPreset={(presetId) => setRange(resolvePreset(presetId))}
      />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading insights…</p>
      ) : null}
      {isError ? (
        <p className="text-destructive text-sm">
          Could not load insights for this period.
        </p>
      ) : null}

      {data?.budgets ? (
        <Card>
          <CardHeader>
            <CardTitle>Budget progress</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetProgress
              month={data.budgets.month}
              items={data.budgets.items}
            />
          </CardContent>
        </Card>
      ) : null}

      {data && isEmpty ? (
        <p className="text-muted-foreground text-sm" data-testid="insights-empty">
          No activity in this period.
        </p>
      ) : null}

      {data && !isEmpty ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Spending over time</CardTitle>
            </CardHeader>
            <CardContent>
              <SpendingLineChart data={data.spending_over_time} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <BreakdownDonut
                title="Expense breakdown"
                items={data.expense_breakdown}
                testId="expense-donut"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <BreakdownDonut
                title="Income breakdown"
                items={data.income_breakdown}
                testId="income-donut"
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
