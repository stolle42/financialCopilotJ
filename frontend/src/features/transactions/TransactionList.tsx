import { formatMoney } from '@/lib/money'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'

type TransactionRow = {
  id: number
  date: string
  amount: string
  description: string
  kind: string
  account_id: number
  category_id: number | null
  destination_account_id: number | null
}

type TransactionListProps = {
  rows: TransactionRow[]
  onEdit: (row: TransactionRow) => void
  onDelete: (row: TransactionRow) => void
}

export function TransactionList({ rows, onEdit, onDelete }: TransactionListProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Kind</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.date}</TableCell>
            <TableCell>{row.kind}</TableCell>
            <TableCell>{row.description}</TableCell>
            <TableCell className="text-right">{formatMoney(row.amount)}</TableCell>
            <TableCell className="space-x-2 text-right">
              <Button type="button" variant="outline" size="sm" onClick={() => onEdit(row)}>
                Edit
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(row)}>
                Delete
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
