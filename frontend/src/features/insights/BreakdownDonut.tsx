import { Cell, Legend, Pie, PieChart } from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatMoney } from '@/lib/money'

type BreakdownItem = {
  category: {
    id: number
    name: string
    colour: string
    side: string
    protected_role: string | null
  }
  amount: string
  share: string
}

type BreakdownDonutProps = {
  title: string
  items: BreakdownItem[]
  testId: string
}

export function BreakdownDonut({ title, items, testId }: BreakdownDonutProps) {
  const chartConfig = Object.fromEntries(
    items.map((item) => [
      String(item.category.id),
      {
        label: item.category.name,
        color: item.category.colour,
      },
    ]),
  ) satisfies ChartConfig

  const data = items.map((item) => ({
    key: String(item.category.id),
    name: item.category.name,
    value: Number(item.amount),
    fill: item.category.colour,
    protectedRole: item.category.protected_role,
  }))

  return (
    <div data-testid={testId}>
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      <ChartContainer config={chartConfig} className="mx-auto min-h-[240px] max-w-sm">
        <PieChart accessibilityLayer>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => formatMoney(String(value))}
              />
            }
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={90}
            isAnimationActive={false}
            strokeWidth={2}
          >
            {data.map((entry) => (
              <Cell
                key={entry.key}
                fill={entry.fill}
                className={
                  entry.protectedRole === 'unaccounted'
                    ? 'unaccounted-pattern cursor-default'
                    : 'cursor-default'
                }
              />
            ))}
          </Pie>
          <Legend
            formatter={(value, entry) => {
              const protectedRole = (
                entry.payload as { protectedRole?: string | null } | undefined
              )?.protectedRole
              if (protectedRole === 'unaccounted') {
                return (
                  <span className="unaccounted-legend-label">{String(value)}</span>
                )
              }
              return value
            }}
          />
        </PieChart>
      </ChartContainer>
    </div>
  )
}
