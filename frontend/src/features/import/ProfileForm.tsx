import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import type { MappingProfileIn } from '@/api/queries/import'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const schema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    date_column: z.string().min(1),
    description_column: z.string().min(1),
    counterparty_column: z.string().optional(),
    date_format: z.string().min(1),
    decimal_separator: z.enum(['.', ',']),
    encoding: z.string().min(1),
    layout: z.enum(['signed', 'split']),
    amount_column: z.string().optional(),
    debit_column: z.string().optional(),
    credit_column: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.layout === 'signed' && !data.amount_column?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Amount column is required',
        path: ['amount_column'],
      })
    }
    if (data.layout === 'split') {
      if (!data.debit_column?.trim() || !data.credit_column?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'Debit and credit columns are required',
          path: ['debit_column'],
        })
      }
    }
  })

type ProfileFormValues = z.infer<typeof schema>

type ProfileFormProps = {
  onSubmit: (values: MappingProfileIn) => void | Promise<void>
  submitLabel?: string
}

export function ProfileForm({
  onSubmit,
  submitLabel = 'Save profile',
}: ProfileFormProps) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      date_column: 'date',
      description_column: 'description',
      counterparty_column: '',
      date_format: '%Y-%m-%d',
      decimal_separator: '.',
      encoding: 'utf-8',
      layout: 'signed',
      amount_column: 'amount',
      debit_column: '',
      credit_column: '',
    },
  })

  const layout = form.watch('layout')

  return (
    <Form {...form}>
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={form.handleSubmit(async (values) => {
          const body: MappingProfileIn = {
            name: values.name,
            date_column: values.date_column,
            description_column: values.description_column,
            counterparty_column: values.counterparty_column?.trim() || null,
            date_format: values.date_format,
            decimal_separator: values.decimal_separator,
            encoding: values.encoding,
            amount_column:
              values.layout === 'signed' ? values.amount_column ?? null : null,
            debit_column:
              values.layout === 'split' ? values.debit_column ?? null : null,
            credit_column:
              values.layout === 'split' ? values.credit_column ?? null : null,
          }
          await onSubmit(body)
        })}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Profile name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="date_column"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date column</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description_column"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description column</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="counterparty_column"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Counterparty column (optional)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="date_format"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date format</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="%Y-%m-%d">ISO (%Y-%m-%d)</SelectItem>
                  <SelectItem value="%d.%m.%Y">European (%d.%m.%Y)</SelectItem>
                  <SelectItem value="%d/%m/%Y">%d/%m/%Y</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="decimal_separator"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Decimal separator</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value=".">Period (1.50)</SelectItem>
                  <SelectItem value=",">Comma (1,50)</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="encoding"
          render={({ field }) => (
            <FormItem>
              <FormLabel>File encoding</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="utf-8">UTF-8</SelectItem>
                  <SelectItem value="cp1252">Windows (cp1252)</SelectItem>
                  <SelectItem value="iso-8859-1">ISO-8859-1</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <div className="md:col-span-2">
          <Tabs
            value={layout}
            onValueChange={(value) =>
              form.setValue('layout', value as 'signed' | 'split')
            }
          >
            <TabsList>
              <TabsTrigger value="signed">Signed amount</TabsTrigger>
              <TabsTrigger value="split">Debit / credit</TabsTrigger>
            </TabsList>
            <TabsContent value="signed" className="pt-3">
              <FormField
                control={form.control}
                name="amount_column"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount column</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
            <TabsContent value="split" className="grid gap-4 pt-3 md:grid-cols-2">
              <FormField
                control={form.control}
                name="debit_column"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Debit column</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="credit_column"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit column</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
          </Tabs>
        </div>
        <div className="md:col-span-2">
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Form>
  )
}
