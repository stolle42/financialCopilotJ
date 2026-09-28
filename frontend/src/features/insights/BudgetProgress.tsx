import { Progress } from '@/components/ui/progress'
import { formatMoney } from '@/lib/money'

type BudgetItem = {
  category: { id: number; name: string }
  monthly_limit: string
  spent: string
  over_limit: boolean
}

type BudgetProgressProps = {
  month: string
  items: BudgetItem[]
}

function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split('-').map(Number)
  return new Date(year, monthNum - 1, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export function BudgetProgress({ month, items }: BudgetProgressProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <section data-testid="budget-progress" className="space-y-4">
      <h2 className="text-lg font-semibold">{formatMonthLabel(month)}</h2>
      <ul className="space-y-4">
        {items.map((item) => {
          const limit = Number(item.monthly_limit)
          const spent = Number(item.spent)
          const percent =
            limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0
          return (
            <li key={item.category.id} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{item.category.name}</span>
                <span>
                  {formatMoney(item.spent)} / {formatMoney(item.monthly_limit)}
                </span>
              </div>
              <Progress
                value={percent}
                className={item.over_limit ? 'budget-over-limit' : undefined}
              />
              <span className="sr-only">
                {item.over_limit ? 'Over budget limit' : 'Within budget limit'}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
