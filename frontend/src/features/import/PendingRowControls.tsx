import { useMemo } from 'react'

import type { PendingRow } from '@/api/queries/import'
import { useAccounts } from '@/api/queries/accounts'
import { useCategories } from '@/api/queries/categories'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatMoney } from '@/lib/money'

type PendingRowControlsProps = {
  row: PendingRow
  batchAccountId: number
  onPatch: (patch: {
    row_id: number
    category_id?: number
    kind?: string
    destination_account_id?: number | null
    include?: boolean
  }) => void
}

export function PendingRowControls({
  row,
  batchAccountId,
  onPatch,
}: PendingRowControlsProps) {
  const { data: categories = [] } = useCategories()
  const { data: accounts = [] } = useAccounts()

  const sideCategories = useMemo(
    () => categories.filter((c) => c.side === row.kind),
    [categories, row.kind],
  )

  const destinations = accounts.filter((a) => a.id !== batchAccountId)

  if (row.parse_error) {
    return null
  }

  return (
    <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
      <div>
        <p className="text-muted-foreground text-xs">
          {row.date} · {formatMoney(row.amount ?? '0')}
        </p>
        <p className="text-sm">{row.description}</p>
      </div>
      <div>
        <Label className="text-xs">Kind</Label>
        <Select
          value={row.kind}
          onValueChange={(kind) => {
            if (!kind) {
              return
            }
            onPatch({
              row_id: row.id,
              kind,
              destination_account_id:
                kind === 'transfer' ? row.destination_account_id : null,
            })
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {row.kind === 'transfer' ? (
        <div>
          <Label className="text-xs">Destination</Label>
          <Select
            value={row.destination_account_id ? String(row.destination_account_id) : ''}
            onValueChange={(value) =>
              onPatch({
                row_id: row.id,
                destination_account_id: Number(value),
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select account">
                {destinations.find((a) => a.id === row.destination_account_id)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {destinations.map((account) => (
                <SelectItem key={account.id} value={String(account.id)}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div>
          <Label className="text-xs">Category</Label>
          <Select
            value={row.category_id ? String(row.category_id) : ''}
            onValueChange={(value) =>
              onPatch({ row_id: row.id, category_id: Number(value) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Category">
                {sideCategories.find((c) => c.id === row.category_id)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sideCategories.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {row.is_duplicate ? (
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={row.include}
              onChange={(event) =>
                onPatch({ row_id: row.id, include: event.target.checked })
              }
            />
            Include duplicate
          </label>
        </div>
      ) : null}
    </div>
  )
}
