import { useEffect, useState } from 'react'

import { useReconcileAccount } from '@/api/queries/accounts'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatMoney } from '@/lib/money'

type ReconcileResult = {
  transaction: {
    description: string
    amount: string
    kind: string
  } | null
  balance: string
}

type ReconcileDialogProps = {
  account: { id: number; name: string; balance: string } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReconcileDialog({
  account,
  open,
  onOpenChange,
}: ReconcileDialogProps) {
  const reconcile = useReconcileAccount()
  const [actualBalance, setActualBalance] = useState('')
  const [result, setResult] = useState<ReconcileResult | null>(null)

  const reset = () => {
    setActualBalance('')
    setResult(null)
    reconcile.reset()
  }

  useEffect(() => {
    if (open && account) {
      setActualBalance(account.balance)
      setResult(null)
    }
  }, [open, account?.id, account?.balance])

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset()
    }
    onOpenChange(next)
  }

  if (!account) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent aria-labelledby="reconcile-title">
        <DialogHeader>
          <DialogTitle id="reconcile-title">
            Reconcile {account.name}
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            {result.transaction ? (
              <p className="text-sm text-muted-foreground">
                Booked {result.transaction.kind}{' '}
                <span className="font-medium text-foreground">
                  {formatMoney(result.transaction.amount)}
                </span>{' '}
                as &ldquo;{result.transaction.description}&rdquo;. New balance:{' '}
                <span className="font-medium text-foreground">
                  {formatMoney(result.balance)}
                </span>
                .
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                This account already matches the balance you entered (
                {formatMoney(result.balance)}).
              </p>
            )}
            <Button type="button" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault()
              const data = await reconcile.mutateAsync({
                id: account.id,
                actual_balance: actualBalance,
              })
              setResult(data)
            }}
          >
            <p className="text-sm text-muted-foreground">
              Computed balance:{' '}
              <span className="font-medium text-foreground">
                {formatMoney(account.balance)}
              </span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="actual-balance">Actual balance</Label>
              <Input
                id="actual-balance"
                name="actual_balance"
                inputMode="decimal"
                value={actualBalance}
                onChange={(event) => setActualBalance(event.target.value)}
                required
              />
            </div>
            {reconcile.isError ? (
              <p className="text-sm text-destructive" role="alert">
                Could not reconcile. Check the amount and try again.
              </p>
            ) : null}
            <Button type="submit" disabled={reconcile.isPending}>
              Reconcile
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
