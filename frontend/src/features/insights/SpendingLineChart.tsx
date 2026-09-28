import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatMoney } from '@/lib/money'

type SpendingPoint = {
  bucket: string
  amount: string
}

const chartConfig = {
  amount: {
    label: 'Spending',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig

type SpendingLineChartProps = {
  data: SpendingPoint[]
}

export function SpendingLineChart({ data }: SpendingLineChartProps) {
  const points = data.map((row) => ({
    bucket: row.bucket,
    amount: Number(row.amount),
  }))

  return (
    <ChartContainer
      config={chartConfig}
      className="min-h-[240px] w-full"
      data-testid="spending-line-chart"
    >
      <LineChart data={points} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="bucket"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => formatMoney(value)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatMoney(String(value))}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="var(--color-amount)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  )
}
