import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { TransactionFilters } from '@/api/queries/transactions'

type TransactionFiltersProps = {
  filters: TransactionFilters
  onChange: (filters: TransactionFilters) => void
  accounts: Array<{ id: number; name: string }>
}

export function TransactionFiltersBar({
  filters,
  onChange,
  accounts,
}: TransactionFiltersProps) {
  return (
    <div className="mb-4 grid gap-3 md:grid-cols-5">
      <div>
        <Label htmlFor="filter-account">Account</Label>
        <Select
          value={filters.account_id ?? 'all'}
          onValueChange={(value) =>
            onChange({
              ...filters,
              account_id: value === 'all' ? undefined : value,
            })
          }
        >
          <SelectTrigger id="filter-account">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={String(account.id)}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="filter-kind">Kind</Label>
        <Select
          value={filters.kind ?? 'all'}
          onValueChange={(value) =>
            onChange({
              ...filters,
              kind: value === 'all' ? undefined : value,
            })
          }
        >
          <SelectTrigger id="filter-kind">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="filter-from">From</Label>
        <Input
          id="filter-from"
          type="date"
          value={filters.from ?? ''}
          onChange={(event) =>
            onChange({ ...filters, from: event.target.value || undefined })
          }
        />
      </div>
      <div>
        <Label htmlFor="filter-to">To</Label>
        <Input
          id="filter-to"
          type="date"
          value={filters.to ?? ''}
          onChange={(event) =>
            onChange({ ...filters, to: event.target.value || undefined })
          }
        />
      </div>
      <div>
        <Label htmlFor="filter-q">Search</Label>
        <Input
          id="filter-q"
          value={filters.q ?? ''}
          onChange={(event) =>
            onChange({ ...filters, q: event.target.value || undefined })
          }
        />
      </div>
    </div>
  )
}
