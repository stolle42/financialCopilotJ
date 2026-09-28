import { http, HttpResponse } from 'msw'

const API = 'http://localhost/api'

type BudgetRow = {
  category: {
    id: number
    name: string
    colour: string
    side: string
    protected_role: string | null
  }
  monthly_limit: string
  spent: string
  over_limit: boolean
}

export const budgetsState = {
  limits: new Map<number, string>(),
  lastPutCategoryId: 0,
  lastDeleteCategoryId: 0,
  getCalls: 0,
}

function progressRows(month: string): BudgetRow[] {
  budgetsState.getCalls += 1
  const spent = month === '2026-09' ? '450.00' : '0.00'
  return [...budgetsState.limits.entries()].map(([categoryId, monthly_limit]) => ({
    category: {
      id: categoryId,
      name: categoryId === 11 ? 'Groceries' : `Category ${categoryId}`,
      colour: 'hsl(var(--chart-1))',
      side: 'expense',
      protected_role: null,
    },
    monthly_limit,
    spent,
    over_limit: Number(spent) > Number(monthly_limit),
  }))
}

export const budgetHandlers = [
  http.get(`${API}/budgets`, ({ request }) => {
    const month = new URL(request.url).searchParams.get('month') ?? '2026-09'
    return HttpResponse.json(progressRows(month))
  }),
  http.put(`${API}/budgets/:categoryId`, async ({ params, request }) => {
    const categoryId = Number(params.categoryId)
    const body = (await request.json()) as { monthly_limit: string }
    budgetsState.lastPutCategoryId = categoryId
    budgetsState.limits.set(categoryId, body.monthly_limit)
    return HttpResponse.json({
      category: {
        id: categoryId,
        name: 'Groceries',
        colour: 'hsl(var(--chart-1))',
        side: 'expense',
        protected_role: null,
      },
      monthly_limit: body.monthly_limit,
    })
  }),
  http.delete(`${API}/budgets/:categoryId`, ({ params }) => {
    const categoryId = Number(params.categoryId)
    budgetsState.lastDeleteCategoryId = categoryId
    budgetsState.limits.delete(categoryId)
    return new HttpResponse(null, { status: 204 })
  }),
]
