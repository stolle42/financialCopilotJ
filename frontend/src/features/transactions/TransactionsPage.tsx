import { useState } from 'react'

import { useAccounts } from '@/api/queries/accounts'
import {
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
  type TransactionFilters,
} from '@/api/queries/transactions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { TransactionFiltersBar } from './TransactionFilters'
import { TransactionForm, type TransactionFormValues } from './TransactionForm'
import { TransactionList } from './TransactionList'

export function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>({})
  const { data: accounts = [] } = useAccounts()
  const { data: transactions = [] } = useTransactions(filters)
  const createTx = useCreateTransaction()
  const updateTx = useUpdateTransaction()
  const deleteTx = useDeleteTransaction()

  const [editing, setEditing] = useState<
    (TransactionFormValues & { id: number }) | null
  >(null)
  const [deleting, setDeleting] = useState<{ id: number } | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Ledger and quick entry.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick add</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm
            onSubmit={async (values) => {
              await createTx.mutateAsync({
                date: values.date,
                amount: values.amount,
                description: values.description,
                kind: values.kind,
                account_id: values.account_id,
                category_id: values.category_id,
                destination_account_id: values.destination_account_id,
              })
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionFiltersBar
            filters={filters}
            onChange={setFilters}
            accounts={accounts}
          />
          <TransactionList
            rows={transactions}
            onEdit={(row) =>
              setEditing({
                id: row.id,
                date: row.date,
                amount: row.amount,
                description: row.description,
                kind: row.kind as TransactionFormValues['kind'],
                account_id: row.account_id as number,
                category_id: row.category_id as number | undefined,
                destination_account_id: row.destination_account_id as
                  | number
                  | undefined,
              })
            }
            onDelete={(row) => setDeleting({ id: row.id })}
          />
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit transaction</DialogTitle>
          </DialogHeader>
          {editing ? (
            <TransactionForm
              initial={editing}
              submitLabel="Update"
              onSubmit={async (values) => {
                await updateTx.mutateAsync({ id: editing.id, body: values })
                setEditing(null)
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the entry from your ledger.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleting) {
                  await deleteTx.mutateAsync(deleting.id)
                  setDeleting(null)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
