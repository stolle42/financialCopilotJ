import { Link, useNavigate, useParams } from 'react-router'

import {
  useConfirmImportBatch,
  useDiscardImportBatch,
  useImportBatch,
  usePatchImportRows,
} from '@/api/queries/import'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { HiddenRowsDisclosure } from './HiddenRowsDisclosure'
import { PendingRowControls } from './PendingRowControls'
import { VendorGroup } from './VendorGroup'

export function ImportReviewPage() {
  const { batchId } = useParams()
  const navigate = useNavigate()
  const id = Number(batchId)
  const { data: batch, isLoading, isError } = useImportBatch(Number.isFinite(id) ? id : undefined)
  const patchRows = usePatchImportRows(id)
  const confirm = useConfirmImportBatch()
  const discard = useDiscardImportBatch()

  if (!Number.isFinite(id)) {
    return <p className="text-destructive text-sm">Invalid batch.</p>
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading batch…</p>
  }

  if (isError || !batch) {
    return (
      <div className="space-y-3">
        <p className="text-destructive text-sm">Batch not found.</p>
        <Link
          to="/import"
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          Back to import
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Review import</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {batch.source_filename} · {batch.row_count} rows
          </p>
        </div>
        <Link
          to="/import"
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          Back to import
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <HiddenRowsDisclosure
          label="Unparsable rows"
          rows={batch.unparsable_rows}
          renderRow={(row) => (
            <div className="rounded border p-2 text-sm">
              <p className="text-destructive">{row.parse_error}</p>
              <pre className="text-muted-foreground mt-1 whitespace-pre-wrap text-xs">
                {row.raw_line}
              </pre>
            </div>
          )}
        />
        <HiddenRowsDisclosure
          label="Duplicate rows"
          rows={[...batch.ungrouped_rows, ...batch.groups.flatMap((g) => g.rows)].filter(
            (r) => r.is_duplicate,
          )}
          renderRow={(row) => (
            <PendingRowControls
              row={row}
              batchAccountId={batch.account_id}
              onPatch={(patch) => patchRows.mutate([patch])}
            />
          )}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor groups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {batch.groups.length === 0 ? (
            <p className="text-muted-foreground text-sm">No vendor groups for this file.</p>
          ) : (
            batch.groups.map((group) => (
              <VendorGroup
                key={group.counterparty}
                counterparty={group.counterparty}
                rows={group.rows}
                batchAccountId={batch.account_id}
                onPatchRows={(patches) => patchRows.mutate(patches)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Other rows</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {batch.ungrouped_rows.map((row) => (
            <PendingRowControls
              key={row.id}
              row={row}
              batchAccountId={batch.account_id}
              onPatch={(patch) => patchRows.mutate([patch])}
            />
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={confirm.isPending}
          onClick={async () => {
            try {
              await confirm.mutateAsync(id)
              navigate('/import')
            } catch {
              /* surfaced via UI later */
            }
          }}
        >
          {confirm.isPending ? 'Confirming…' : 'Confirm import'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={discard.isPending}
          onClick={async () => {
            await discard.mutateAsync(id)
            navigate('/import')
          }}
        >
          Discard batch
        </Button>
      </div>
    </div>
  )
}
