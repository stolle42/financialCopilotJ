import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useAccounts } from '@/api/queries/accounts'
import { useCategories } from '@/api/queries/categories'
import { useTransactionDefaults } from '@/api/queries/transactions'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { todayIso } from '@/lib/dates'
import { parseMoneyInput } from '@/lib/money'

const schema = z
  .object({
    date: z.string().min(1),
    amount: z.string().refine((value) => {
      if (value.trim() === '') {
        return true
      }
      const n = Number(value)
      return !Number.isNaN(n) && n >= 0
    }, 'Amount must be zero or positive'),
    description: z.string(),
    kind: z.enum(['expense', 'income', 'transfer']),
    account_id: z.number(),
    category_id: z.number().optional(),
    destination_account_id: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === 'transfer') {
      if (!data.destination_account_id) {
        ctx.addIssue({
          code: 'custom',
          message: 'Choose a destination account',
          path: ['destination_account_id'],
        })
      }
    } else if (!data.category_id) {
      ctx.addIssue({
        code: 'custom',
        message: 'Choose a category',
        path: ['category_id'],
      })
    }
  })

export type TransactionFormValues = z.infer<typeof schema>

type TransactionFormProps = {
  initial?: Partial<TransactionFormValues> & { id?: number }
  onSubmit: (values: TransactionFormValues) => void | Promise<void>
  submitLabel?: string
}

export function TransactionForm({
  initial,
  onSubmit,
  submitLabel = 'Save',
}: TransactionFormProps) {
  const { data: defaults } = useTransactionDefaults()
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: todayIso(),
      amount: '0.00',
      description: '',
      kind: 'expense',
    },
  })

  const kind = form.watch('kind')
  const accountId = form.watch('account_id')

  useEffect(() => {
    if (initial) {
      form.reset({
        date: initial.date ?? todayIso(),
        amount: initial.amount ?? '0.00',
        description: initial.description ?? '',
        kind: initial.kind ?? 'expense',
        account_id: initial.account_id ?? defaults?.account_id ?? 1,
        category_id: initial.category_id,
        destination_account_id: initial.destination_account_id,
      })
      return
    }
    if (defaults) {
      form.reset({
        date: todayIso(),
        amount: '0.00',
        description: '',
        kind: 'expense',
        account_id: defaults.account_id,
        category_id: defaults.expense_category_id,
      })
    }
  }, [defaults, form, initial])

  const sideCategories = useMemo(
    () =>
      categories.filter((c) =>
        kind === 'transfer' ? false : c.side === kind,
      ),
    [categories, kind],
  )

  const uncategorisedForKind = useMemo(() => {
    return categories.find(
      (c) => c.side === kind && c.protected_role === 'uncategorised',
    )
  }, [categories, kind])

  useEffect(() => {
    if (initial || kind === 'transfer') {
      return
    }
    if (uncategorisedForKind) {
      form.setValue('category_id', uncategorisedForKind.id)
    }
  }, [form, initial, kind, uncategorisedForKind])

  const destinationAccounts = accounts.filter((a) => a.id !== accountId)
  const formReady =
    defaults !== undefined && accounts.length > 0 && categories.length > 0

  return (
    <Form {...form}>
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={form.handleSubmit(async (values) => {
          const amount = parseMoneyInput(values.amount || '0')
          await onSubmit({
            ...values,
            amount,
            category_id:
              values.kind === 'transfer' ? undefined : values.category_id,
            destination_account_id:
              values.kind === 'transfer'
                ? values.destination_account_id
                : undefined,
          })
        })}
      >
        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kind</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  if (value === 'transfer') {
                    form.setValue('category_id', undefined)
                    return
                  }
                  const uncategorised = categories.find(
                    (c) =>
                      c.side === value && c.protected_role === 'uncategorised',
                  )
                  if (uncategorised) {
                    form.setValue('category_id', uncategorised.id)
                  }
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="account_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account</FormLabel>
              <Select
                value={String(field.value)}
                onValueChange={(value) => field.onChange(Number(value))}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account">
                      {accounts.find((a) => a.id === field.value)?.name}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={String(account.id)}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        {kind === 'transfer' ? (
          <FormField
            control={form.control}
            name="destination_account_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destination</FormLabel>
                <Select
                  value={field.value ? String(field.value) : ''}
                  onValueChange={(value) => field.onChange(Number(value))}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account">
                        {destinationAccounts.find((a) => a.id === field.value)
                          ?.name}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {destinationAccounts.map((account) => (
                      <SelectItem key={account.id} value={String(account.id)}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  value={field.value ? String(field.value) : ''}
                  onValueChange={(value) => field.onChange(Number(value))}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category">
                        {sideCategories.find((c) => c.id === field.value)
                          ?.name}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sideCategories.map((category) => (
                      <SelectItem
                        key={category.id}
                        value={String(category.id)}
                      >
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  inputMode="decimal"
                  {...field}
                  onChange={(event) => {
                    const next = event.target.value
                    if (next.includes('-')) {
                      return
                    }
                    field.onChange(next)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="md:col-span-2 space-y-2">
          {Object.keys(form.formState.errors).length > 0 ? (
            <p className="text-destructive text-sm">
              Fix the highlighted fields before saving.
            </p>
          ) : null}
          <Button type="submit" disabled={!formReady || form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
