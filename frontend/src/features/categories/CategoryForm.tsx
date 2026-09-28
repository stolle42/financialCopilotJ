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
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  colour: z.string().min(1, 'Colour is required'),
})

export type CategoryFormValues = z.infer<typeof schema>

type CategoryFormProps = {
  initial?: Partial<CategoryFormValues>
  onSubmit: (values: CategoryFormValues) => void | Promise<void>
  submitLabel?: string
  errorMessage?: string | null
}

export function CategoryForm({
  initial,
  onSubmit,
  submitLabel = 'Save',
  errorMessage,
}: CategoryFormProps) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      colour: initial?.colour ?? '#6366f1',
    },
  })

  return (
    <Form {...form}>
      <form
        className="grid gap-4"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(values)
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
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="colour"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Colour</FormLabel>
              <FormControl>
                <Input {...field} type="color" className="h-10 w-20 p-1" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <Button type="submit">{submitLabel}</Button>
      </form>
    </Form>
  )
}

function formatApiError(error: unknown): string {
  if (error && typeof error === 'object' && 'detail' in error) {
    const { detail } = error as { detail: unknown }
    if (typeof detail === 'string') {
      return detail
    }
  }
  return 'Could not save the category.'
}

export { formatApiError }
