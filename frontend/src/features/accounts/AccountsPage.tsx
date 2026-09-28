import { useState } from 'react'

import {
  useAccounts,
  useCreateAccount,
  usePatchAccount,
} from '@/api/queries/accounts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatMoney } from '@/lib/money'

import { AccountForm, type AccountFormValues } from './AccountForm'
import { OpeningBalanceWarning } from './OpeningBalanceWarning'
import { ReconcileDialog } from './ReconcileDialog'

export function AccountsPage() {
  const { data: accounts = [] } = useAccounts()
  const createAccount = useCreateAccount()
  const patchAccount = usePatchAccount()

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<
    AccountFormValues & { id: number; balance: string }
  | null>(null)
  const [pendingOpeningBalance, setPendingOpeningBalance] = useState<
    string | null
  >(null)
  const [reconciling, setReconciling] = useState<{
    id: number
    name: string
    balance: string
  } | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
        <Button type="button" onClick={() => setCreating(true)}>
          New account
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>{account.name}</TableCell>
                  <TableCell>{account.type}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(account.balance)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setReconciling({
                            id: account.id,
                            name: account.name,
                            balance: account.balance,
                          })
                        }
                      >
                        Reconcile
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditing({
                            id: account.id,
                            name: account.name,
                            type: account.type as AccountFormValues['type'],
                            opening_balance: account.opening_balance,
                            balance: account.balance,
                          })
                        }
                      >
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create account</DialogTitle>
          </DialogHeader>
          <AccountForm
            onSubmit={async (values) => {
              await createAccount.mutateAsync(values)
              setCreating(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit account</DialogTitle>
          </DialogHeader>
          {editing ? (
            <AccountForm
              initial={editing}
              submitLabel="Save changes"
              onSubmit={async (values) => {
                if (values.opening_balance !== editing.opening_balance) {
                  setPendingOpeningBalance(values.opening_balance)
                  return
                }
                await patchAccount.mutateAsync({
                  id: editing.id,
                  body: values,
                })
                setEditing(null)
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <ReconcileDialog
        account={reconciling}
        open={reconciling !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReconciling(null)
          }
        }}
      />

      <OpeningBalanceWarning
        open={pendingOpeningBalance !== null && editing !== null}
        onCancel={() => setPendingOpeningBalance(null)}
        onConfirm={async () => {
          if (editing && pendingOpeningBalance !== null) {
            await patchAccount.mutateAsync({
              id: editing.id,
              body: { opening_balance: pendingOpeningBalance },
            })
            setPendingOpeningBalance(null)
            setEditing(null)
          }
        }}
      />
    </div>
  )
}
