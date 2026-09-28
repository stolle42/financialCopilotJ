import type { ReactNode } from 'react'

import type { PendingRow } from '@/api/queries/import'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

type HiddenRowsDisclosureProps = {
  label: string
  rows: PendingRow[]
  renderRow: (row: PendingRow) => ReactNode
}

export function HiddenRowsDisclosure({
  label,
  rows,
  renderRow,
}: HiddenRowsDisclosureProps) {
  if (rows.length === 0) {
    return null
  }

  return (
    <Collapsible>
      <CollapsibleTrigger className="text-muted-foreground text-sm underline-offset-4 hover:underline">
        {label} ({rows.length})
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {rows.map((row) => (
          <div key={row.id}>{renderRow(row)}</div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}
