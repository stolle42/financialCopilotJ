import { useEffect, useState } from 'react'

import {
  useDeleteBudget,
  useUpsertBudget,
} from '@/api/queries/budgets'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type BudgetLimitFormProps = {
  categoryId: number
  categoryName: string
  currentLimit?: string
}

export function BudgetLimitForm({
  categoryId,
  categoryName,
  currentLimit,
}: BudgetLimitFormProps) {
  const [limit, setLimit] = useState(currentLimit ?? '')
  const upsert = useUpsertBudget()
  const remove = useDeleteBudget()

  useEffect(() => {
    setLimit(currentLimit ?? '')
  }, [currentLimit])

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!limit.trim()) {
          return
        }
        await upsert.mutateAsync({
          categoryId,
          monthly_limit: limit,
        })
      }}
    >
      <label className="text-sm">
        <span className="text-muted-foreground">{categoryName}</span>
        <Input
          className="mt-1 w-32"
          inputMode="decimal"
          aria-label={`Monthly limit for ${categoryName}`}
          value={limit}
          onChange={(event) => setLimit(event.target.value)}
        />
      </label>
      <Button type="submit" size="sm" disabled={upsert.isPending}>
        Save
      </Button>
      {currentLimit ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={remove.isPending}
          onClick={() => remove.mutate(categoryId)}
        >
          Remove
        </Button>
      ) : null}
    </form>
  )
}
