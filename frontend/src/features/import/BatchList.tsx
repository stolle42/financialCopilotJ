import { Link } from 'react-router'

import type { PendingBatchSummary } from '@/api/queries/import'
import { buttonVariants } from '@/components/ui/button'
import { cn } from 'cn'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type BatchListProps = {
  batches: PendingBatchSummary[]
}

export function BatchList({ batches }: BatchListProps) {
  if (batches.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No pending imports.</p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File</TableHead>
          <TableHead>Rows</TableHead>
          <TableHead>Issues</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {batches.map((batch) => (
          <TableRow key={batch.id}>
            <TableCell>{batch.source_filename}</TableCell>
            <TableCell>{batch.row_count}</TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {batch.unparsable_count > 0
                ? `${batch.unparsable_count} unparsable`
                : null}
              {batch.unparsable_count > 0 && batch.duplicate_count > 0
                ? ', '
                : null}
              {batch.duplicate_count > 0
                ? `${batch.duplicate_count} duplicates`
                : null}
              {batch.unparsable_count === 0 && batch.duplicate_count === 0
                ? '—'
                : null}
            </TableCell>
            <TableCell className="text-right">
              <Link
                to={`/import/${batch.id}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Review
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
