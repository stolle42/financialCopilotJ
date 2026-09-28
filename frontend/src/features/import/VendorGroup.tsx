import type { PendingRow } from '@/api/queries/import'
import { useCategories } from '@/api/queries/categories'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

import { PendingRowControls } from './PendingRowControls'

type VendorGroupProps = {
  counterparty: string
  rows: PendingRow[]
  batchAccountId: number
  onPatchRows: (
    patches: Array<{
      row_id: number
      category_id?: number
      kind?: string
      destination_account_id?: number | null
      include?: boolean
    }>,
  ) => void
}

export function VendorGroup({
  counterparty,
  rows,
  batchAccountId,
  onPatchRows,
}: VendorGroupProps) {
  const { data: categories = [] } = useCategories()
  const expenseCategories = categories.filter((c) => c.side === 'expense')
  const firstKind = rows[0]?.kind ?? 'expense'
  const groupCategories =
    firstKind === 'income'
      ? categories.filter((c) => c.side === 'income')
      : expenseCategories

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-medium">{counterparty}</h3>
          <p className="text-muted-foreground text-sm">{rows.length} rows</p>
        </div>
        {firstKind !== 'transfer' ? (
          <div className="min-w-48">
            <Label className="text-xs">Category for group</Label>
            <Select
              onValueChange={(value) =>
                onPatchRows(
                  rows.map((row) => ({
                    row_id: row.id,
                    category_id: Number(value),
                  })),
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Set for all" />
              </SelectTrigger>
              <SelectContent>
                {groupCategories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      <Collapsible>
        <CollapsibleTrigger className="text-sm underline-offset-4 hover:underline">
          Show rows
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-2">
          {rows.map((row) => (
            <PendingRowControls
              key={row.id}
              row={row}
              batchAccountId={batchAccountId}
              onPatch={(patch) => onPatchRows([patch])}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
