import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { parseMoneyInput } from '@/lib/money'

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'other']),
  opening_balance: z.string(),
})

export type AccountFormValues = z.infer<typeof schema>

type AccountFormProps = {
  initial?: Partial<AccountFormValues>
  onSubmit: (values: AccountFormValues) => void | Promise<void>
  submitLabel?: string
}

export function AccountForm({
  initial,
  onSubmit,
  submitLabel = 'Save',
}: AccountFormProps) {
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      type: initial?.type ?? 'checking',
      opening_balance: initial?.opening_balance ?? '0.00',
    },
  })

  return (
    <Form {...form}>
      <form
        className="grid gap-4"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit({
            ...values,
            opening_balance: parseMoneyInput(values.opening_balance || '0'),
          })
        })}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="credit_card">Credit card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="opening_balance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Opening balance</FormLabel>
              <FormControl>
                <Input inputMode="decimal" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit">{submitLabel}</Button>
      </form>
    </Form>
  )
}
