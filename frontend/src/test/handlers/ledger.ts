import { http, HttpResponse } from 'msw'

import { budgetsState } from '@/test/handlers/budgets'

export const ledgerState = {
  accounts: [
    {
      id: 1,
      name: 'Cash',
      type: 'cash',
      opening_balance: '0.00',
      balance: '0.00',
    },
  ],
  categories: [
    {
      id: 10,
      name: 'Uncategorised',
      colour: '#94a3b8',
      side: 'expense',
      protected_role: 'uncategorised',
    },
    {
      id: 11,
      name: 'Groceries',
      colour: 'hsl(var(--chart-1))',
      side: 'expense',
      protected_role: null,
    },
    {
      id: 12,
      name: 'Unaccounted',
      colour: '#94a3b8',
      side: 'expense',
      protected_role: 'unaccounted',
    },
    {
      id: 20,
      name: 'Uncategorised',
      colour: '#94a3b8',
      side: 'income',
      protected_role: 'uncategorised',
    },
    {
      id: 21,
      name: 'Salary',
      colour: 'hsl(var(--chart-1))',
      side: 'income',
      protected_role: null,
    },
    {
      id: 22,
      name: 'Unaccounted',
      colour: '#94a3b8',
      side: 'income',
      protected_role: 'unaccounted',
    },
  ],
  transactions: [] as Array<Record<string, unknown>>,
  defaults: {
    account_id: 1,
    expense_category_id: 10,
    income_category_id: 20,
  },
  nextAccountId: 2,
  nextCategoryId: 30,
  nextTxId: 1,
}

const defaultCategories = () => [
  {
    id: 10,
    name: 'Uncategorised',
    colour: '#94a3b8',
    side: 'expense',
    protected_role: 'uncategorised',
  },
  {
    id: 11,
    name: 'Groceries',
    colour: 'hsl(var(--chart-1))',
    side: 'expense',
    protected_role: null,
  },
  {
    id: 12,
    name: 'Unaccounted',
    colour: '#94a3b8',
    side: 'expense',
    protected_role: 'unaccounted',
  },
  {
    id: 20,
    name: 'Uncategorised',
    colour: '#94a3b8',
    side: 'income',
    protected_role: 'uncategorised',
  },
  {
    id: 21,
    name: 'Salary',
    colour: 'hsl(var(--chart-1))',
    side: 'income',
    protected_role: null,
  },
  {
    id: 22,
    name: 'Unaccounted',
    colour: '#94a3b8',
    side: 'income',
    protected_role: 'unaccounted',
  },
]

export function resetLedgerState() {
  ledgerState.accounts = [
    {
      id: 1,
      name: 'Cash',
      type: 'cash',
      opening_balance: '0.00',
      balance: '0.00',
    },
  ]
  ledgerState.categories = defaultCategories()
  ledgerState.transactions = []
  ledgerState.defaults = {
    account_id: 1,
    expense_category_id: 10,
    income_category_id: 20,
  }
  ledgerState.nextAccountId = 2
  ledgerState.nextCategoryId = 30
  ledgerState.nextTxId = 1
}

const API = 'http://localhost/api'

export const ledgerHandlers = [
  http.get(`${API}/accounts`, () =>
    HttpResponse.json(ledgerState.accounts),
  ),
  http.post(`${API}/accounts`, async ({ request }) => {
    const body = (await request.json()) as {
      name: string
      type: string
      opening_balance: string
    }
    const account = {
      id: ledgerState.nextAccountId++,
      name: body.name,
      type: body.type,
      opening_balance: body.opening_balance,
      balance: body.opening_balance,
    }
    ledgerState.accounts.push(account)
    return HttpResponse.json(account)
  }),
  http.post(`${API}/accounts/:id/reconcile`, async ({ params, request }) => {
    const id = Number(params.id)
    const body = (await request.json()) as { actual_balance: string }
    const account = ledgerState.accounts.find((a) => a.id === id)
    if (!account) {
      return HttpResponse.json({ detail: 'not found' }, { status: 404 })
    }
    const computed = Number(account.balance)
    const actual = Number(body.actual_balance)
    if (Number.isNaN(actual)) {
      return HttpResponse.json({ detail: 'invalid balance' }, { status: 400 })
    }
    const computedCents = Math.round(computed * 100)
    const actualCents = Math.round(actual * 100)
    if (computedCents === actualCents) {
      return HttpResponse.json({
        transaction: null,
        balance: account.balance,
      })
    }
    const diffCents = Math.abs(computedCents - actualCents)
    const diff = (diffCents / 100).toFixed(2)
    const kind = actualCents < computedCents ? 'expense' : 'income'
    const tx = {
      id: ledgerState.nextTxId++,
      date: new Date().toISOString().slice(0, 10),
      amount: diff,
      description: 'Reconciliation',
      kind,
      account_id: id,
      category_id: kind === 'expense' ? 10 : 20,
      destination_account_id: null,
    }
    ledgerState.transactions.unshift(tx)
    account.balance = (actualCents / 100).toFixed(2)
    return HttpResponse.json({ transaction: tx, balance: account.balance })
  }),
  http.patch(`${API}/accounts/:id`, async ({ params, request }) => {
    const id = Number(params.id)
    const body = (await request.json()) as Record<string, string>
    const account = ledgerState.accounts.find((a) => a.id === id)
    if (!account) {
      return HttpResponse.json({ detail: 'not found' }, { status: 404 })
    }
    Object.assign(account, body)
    if (body.opening_balance) {
      account.balance = body.opening_balance
    }
    return HttpResponse.json(account)
  }),
  http.get(`${API}/categories`, () =>
    HttpResponse.json(ledgerState.categories),
  ),
  http.post(`${API}/categories`, async ({ request }) => {
    const body = (await request.json()) as {
      name: string
      colour: string
      side: string
    }
    const duplicate = ledgerState.categories.some(
      (c) => c.side === body.side && c.name === body.name,
    )
    if (duplicate) {
      return HttpResponse.json(
        { detail: 'category name must be unique within this side' },
        { status: 400 },
      )
    }
    const category = {
      id: ledgerState.nextCategoryId++,
      name: body.name,
      colour: body.colour,
      side: body.side,
      protected_role: null,
    }
    ledgerState.categories.push(category)
    return HttpResponse.json(category)
  }),
  http.patch(`${API}/categories/:id`, async ({ params, request }) => {
    const id = Number(params.id)
    const body = (await request.json()) as { name?: string; colour?: string }
    const category = ledgerState.categories.find((c) => c.id === id)
    if (!category) {
      return HttpResponse.json({ detail: 'not found' }, { status: 404 })
    }
    const nextName = body.name ?? category.name
    const clash = ledgerState.categories.some(
      (c) =>
        c.id !== id && c.side === category.side && c.name === nextName,
    )
    if (clash) {
      return HttpResponse.json(
        { detail: 'category name must be unique within this side' },
        { status: 400 },
      )
    }
    Object.assign(category, body)
    return HttpResponse.json(category)
  }),
  http.delete(`${API}/categories/:id`, ({ params }) => {
    const id = Number(params.id)
    const category = ledgerState.categories.find((c) => c.id === id)
    if (!category) {
      return HttpResponse.json({ detail: 'not found' }, { status: 404 })
    }
    if (category.protected_role) {
      return HttpResponse.json(
        { detail: 'protected categories cannot be deleted' },
        { status: 409 },
      )
    }
    const uncat = ledgerState.categories.find(
      (c) => c.side === category.side && c.protected_role === 'uncategorised',
    )
    for (const tx of ledgerState.transactions) {
      if (tx.category_id === id) {
        tx.category_id = uncat?.id
      }
    }
    budgetsState.limits.delete(id)
    ledgerState.categories = ledgerState.categories.filter((c) => c.id !== id)
    return new HttpResponse(null, { status: 204 })
  }),
  http.get(`${API}/transactions/defaults`, () =>
    HttpResponse.json(ledgerState.defaults),
  ),
  http.get(`${API}/transactions`, ({ request }) => {
    const url = new URL(request.url)
    let rows = [...ledgerState.transactions]
    const accountId = url.searchParams.get('account_id')
    const kind = url.searchParams.get('kind')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const q = url.searchParams.get('q')
    if (accountId) {
      rows = rows.filter((t) => String(t.account_id) === accountId)
    }
    if (kind) {
      rows = rows.filter((t) => t.kind === kind)
    }
    if (from) {
      rows = rows.filter((t) => String(t.date) >= from)
    }
    if (to) {
      rows = rows.filter((t) => String(t.date) <= to)
    }
    if (q) {
      rows = rows.filter((t) =>
        String(t.description).toLowerCase().includes(q.toLowerCase()),
      )
    }
    rows.sort((a, b) => String(b.date).localeCompare(String(a.date)))
    return HttpResponse.json(rows)
  }),
  http.post(`${API}/transactions`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    ledgerState.defaults.account_id = body.account_id as number
    const tx = {
      id: ledgerState.nextTxId++,
      date: body.date,
      amount: body.amount,
      description: body.description ?? '',
      kind: body.kind,
      account_id: body.account_id,
      category_id: body.category_id ?? null,
      destination_account_id: body.destination_account_id ?? null,
    }
    ledgerState.transactions.unshift(tx)
    return HttpResponse.json(tx)
  }),
  http.patch(`${API}/transactions/:id`, async ({ params, request }) => {
    const id = Number(params.id)
    const body = (await request.json()) as Record<string, unknown>
    const tx = ledgerState.transactions.find((t) => t.id === id)
    if (!tx) {
      return HttpResponse.json({ detail: 'not found' }, { status: 404 })
    }
    Object.assign(tx, body)
    return HttpResponse.json(tx)
  }),
  http.delete(`${API}/transactions/:id`, ({ params }) => {
    const id = Number(params.id)
    ledgerState.transactions = ledgerState.transactions.filter((t) => t.id !== id)
    return new HttpResponse(null, { status: 204 })
  }),
  http.get(`${API}/health`, () => HttpResponse.json({ status: 'ok' })),
]
