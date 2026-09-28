import { http, HttpResponse } from 'msw'

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
  ],
  transactions: [] as Array<Record<string, unknown>>,
  defaults: {
    account_id: 1,
    expense_category_id: 10,
    income_category_id: 20,
  },
  nextAccountId: 2,
  nextTxId: 1,
}

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
  ledgerState.transactions = []
  ledgerState.defaults = {
    account_id: 1,
    expense_category_id: 10,
    income_category_id: 20,
  }
  ledgerState.nextAccountId = 2
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
