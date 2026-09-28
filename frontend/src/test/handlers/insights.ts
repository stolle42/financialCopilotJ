import { http, HttpResponse } from 'msw'

const API = 'http://localhost/api'

type InsightsPayload = {
  spending_over_time: { bucket: string; amount: string }[]
  expense_breakdown: {
    category: {
      id: number
      name: string
      colour: string
      side: string
      protected_role: string | null
    }
    amount: string
    share: string
  }[]
  income_breakdown: InsightsPayload['expense_breakdown']
}

export const insightsState = {
  lastFrom: '',
  lastTo: '',
}

const septemberSample: InsightsPayload = {
  spending_over_time: [
    { bucket: '2026-09-01', amount: '40.00' },
    { bucket: '2026-09-02', amount: '10.00' },
  ],
  expense_breakdown: [
    {
      category: {
        id: 1,
        name: 'Groceries',
        colour: 'hsl(var(--chart-1))',
        side: 'expense',
        protected_role: null,
      },
      amount: '30.00',
      share: '0.6000',
    },
    {
      category: {
        id: 13,
        name: 'Unaccounted',
        colour: '#94a3b8',
        side: 'expense',
        protected_role: 'unaccounted',
      },
      amount: '20.00',
      share: '0.4000',
    },
  ],
  income_breakdown: [
    {
      category: {
        id: 14,
        name: 'Salary',
        colour: 'hsl(var(--chart-1))',
        side: 'income',
        protected_role: null,
      },
      amount: '100.00',
      share: '1.0000',
    },
  ],
}

const emptyPayload: InsightsPayload = {
  spending_over_time: [],
  expense_breakdown: [],
  income_breakdown: [],
}

function payloadForRange(from: string, to: string): InsightsPayload {
  if (from === '2030-01-01' && to === '2030-01-31') {
    return emptyPayload
  }
  if (from === '2026-08-01' && to === '2026-08-31') {
    return {
      ...septemberSample,
      spending_over_time: [{ bucket: '2026-08-15', amount: '5.00' }],
    }
  }
  return septemberSample
}

export const insightsHandlers = [
  http.get(`${API}/insights`, ({ request }) => {
    const url = new URL(request.url)
    const from = url.searchParams.get('from') ?? ''
    const to = url.searchParams.get('to') ?? ''
    insightsState.lastFrom = from
    insightsState.lastTo = to
    return HttpResponse.json(payloadForRange(from, to))
  }),
]
