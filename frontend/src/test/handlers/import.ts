import { http, HttpResponse } from 'msw'

import { ledgerState } from './ledger'

const API = 'http://localhost/api'

export type ImportProfile = {
  id: number
  name: string
  date_column: string
  amount_column: string | null
  debit_column: string | null
  credit_column: string | null
  description_column: string
  counterparty_column: string | null
  date_format: string
  decimal_separator: string
  encoding: string
}

export type ImportRow = {
  id: number
  row_number: number
  raw_line: string
  parse_error: string | null
  date: string | null
  amount: string | null
  description: string
  counterparty: string | null
  kind: string
  category_id: number | null
  destination_account_id: number | null
  is_duplicate: boolean
  include: boolean
}

export type ImportBatchDetail = {
  id: number
  account_id: number
  profile_id: number
  source_filename: string
  created_at: string
  row_count: number
  unparsable_count: number
  duplicate_count: number
  groups: Array<{ counterparty: string; rows: ImportRow[] }>
  ungrouped_rows: ImportRow[]
  unparsable_rows: ImportRow[]
}

export const importState = {
  profiles: [] as ImportProfile[],
  batches: new Map<number, ImportBatchDetail>(),
  nextProfileId: 1,
  nextBatchId: 1,
  nextRowId: 1,
}

export function resetImportState() {
  importState.profiles = []
  importState.batches = new Map()
  importState.nextProfileId = 1
  importState.nextBatchId = 1
  importState.nextRowId = 1
}

function summarize(batch: ImportBatchDetail) {
  return {
    id: batch.id,
    account_id: batch.account_id,
    profile_id: batch.profile_id,
    source_filename: batch.source_filename,
    created_at: batch.created_at,
    row_count: batch.row_count,
    unparsable_count: batch.unparsable_count,
    duplicate_count: batch.duplicate_count,
  }
}

function cloneBatch(batch: ImportBatchDetail): ImportBatchDetail {
  return structuredClone(batch)
}

export function seedReviewBatch(overrides?: Partial<ImportBatchDetail>) {
  const row: ImportRow = {
    id: importState.nextRowId++,
    row_number: 1,
    raw_line: '2026-01-01,-5.00,Shop',
    parse_error: null,
    date: '2026-01-01',
    amount: '5.00',
    description: 'Shop',
    counterparty: 'ACME Corp',
    kind: 'expense',
    category_id: 10,
    destination_account_id: null,
    is_duplicate: false,
    include: true,
  }
  const batch: ImportBatchDetail = {
    id: importState.nextBatchId++,
    account_id: 1,
    profile_id: 1,
    source_filename: 'import.csv',
    created_at: new Date().toISOString(),
    row_count: 2,
    unparsable_count: 1,
    duplicate_count: 1,
    groups: [
      {
        counterparty: 'ACME Corp',
        rows: [
          row,
          {
            ...row,
            id: importState.nextRowId++,
            row_number: 2,
            description: 'Paper',
          },
        ],
      },
    ],
    ungrouped_rows: [
      {
        id: importState.nextRowId++,
        row_number: 3,
        raw_line: '2026-01-03,-2.00,Coffee',
        parse_error: null,
        date: '2026-01-03',
        amount: '2.00',
        description: 'Coffee',
        counterparty: null,
        kind: 'expense',
        category_id: 10,
        destination_account_id: null,
        is_duplicate: true,
        include: false,
      },
    ],
    unparsable_rows: [
      {
        id: importState.nextRowId++,
        row_number: 4,
        raw_line: 'bad row',
        parse_error: 'unreadable date',
        date: null,
        amount: null,
        description: '',
        counterparty: null,
        kind: 'expense',
        category_id: null,
        destination_account_id: null,
        is_duplicate: false,
        include: false,
      },
    ],
    ...overrides,
  }
  importState.batches.set(batch.id, batch)
  return batch
}

export const importHandlers = [
  http.get(`${API}/import/profiles`, () =>
    HttpResponse.json(importState.profiles),
  ),
  http.post(`${API}/import/profiles`, async ({ request }) => {
    const body = (await request.json()) as Omit<ImportProfile, 'id'>
    const profile: ImportProfile = { id: importState.nextProfileId++, ...body }
    importState.profiles.push(profile)
    return HttpResponse.json(profile)
  }),
  http.get(`${API}/import/batches`, () =>
    HttpResponse.json(
      [...importState.batches.values()].map((batch) => summarize(batch)),
    ),
  ),
  http.post(`${API}/import/batches`, async ({ request }) => {
    const form = await request.formData()
    const account_id = Number(form.get('account_id'))
    const profile_id = Number(form.get('profile_id'))
    const file = form.get('file')
    const filename =
      file instanceof File ? file.name : 'upload.csv'
    const batch: ImportBatchDetail = {
      id: importState.nextBatchId++,
      account_id,
      profile_id,
      source_filename: filename,
      created_at: new Date().toISOString(),
      row_count: 1,
      unparsable_count: 0,
      duplicate_count: 0,
      groups: [],
      ungrouped_rows: [
        {
          id: importState.nextRowId++,
          row_number: 1,
          raw_line: '2026-01-01,-1.00,Test',
          parse_error: null,
          date: '2026-01-01',
          amount: '1.00',
          description: 'Test',
          counterparty: null,
          kind: 'expense',
          category_id: 10,
          destination_account_id: null,
          is_duplicate: false,
          include: true,
        },
      ],
      unparsable_rows: [],
    }
    importState.batches.set(batch.id, batch)
    return HttpResponse.json(cloneBatch(batch))
  }),
  http.get(`${API}/import/batches/:id`, ({ params }) => {
    const batch = importState.batches.get(Number(params.id))
    if (!batch) {
      return HttpResponse.json({ detail: 'not found' }, { status: 404 })
    }
    return HttpResponse.json(cloneBatch(batch))
  }),
  http.patch(`${API}/import/batches/:id/rows`, async ({ params, request }) => {
    const batch = importState.batches.get(Number(params.id))
    if (!batch) {
      return HttpResponse.json({ detail: 'not found' }, { status: 404 })
    }
    const patches = (await request.json()) as Array<{
      row_id: number
      category_id?: number
      kind?: string
      destination_account_id?: number | null
      include?: boolean
    }>
    const allRows = [
      ...batch.groups.flatMap((g) => g.rows),
      ...batch.ungrouped_rows,
      ...batch.unparsable_rows,
    ]
    for (const patch of patches) {
      const row = allRows.find((r) => r.id === patch.row_id)
      if (!row || row.parse_error) {
        continue
      }
      if (patch.kind !== undefined) {
        row.kind = patch.kind
        if (patch.kind === 'transfer') {
          row.category_id = null
        } else {
          row.destination_account_id = null
          row.category_id =
            patch.kind === 'expense' ? 10 : 20
        }
      }
      if (patch.category_id !== undefined) {
        row.category_id = patch.category_id
      }
      if (patch.destination_account_id !== undefined) {
        row.destination_account_id = patch.destination_account_id
      }
      if (patch.include !== undefined) {
        row.include = patch.include
      }
    }
    importState.batches.set(batch.id, batch)
    return HttpResponse.json(cloneBatch(batch))
  }),
  http.post(`${API}/import/batches/:id/confirm`, ({ params }) => {
    const id = Number(params.id)
    importState.batches.delete(id)
    ledgerState.transactions.push({
      id: ledgerState.nextTxId++,
      date: '2026-01-01',
      amount: '1.00',
      description: 'import',
      kind: 'expense',
      account_id: 1,
      category_id: 10,
      destination_account_id: null,
    })
    return HttpResponse.json({ created: 1 })
  }),
  http.delete(`${API}/import/batches/:id`, ({ params }) => {
    importState.batches.delete(Number(params.id))
    return new HttpResponse(null, { status: 204 })
  }),
]
