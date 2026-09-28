import { useMemo, useState } from 'react'

import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  usePatchCategory,
} from '@/api/queries/categories'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { CategoryForm, formatApiError } from './CategoryForm'

type Side = 'expense' | 'income'

type CategoryRow = {
  id: number
  name: string
  colour: string
  side: string
  protected_role: string | null
}

export function CategoriesPage() {
  const { data: categories = [] } = useCategories()
  const createCategory = useCreateCategory()
  const patchCategory = usePatchCategory()
  const deleteCategory = useDeleteCategory()

  const [side, setSide] = useState<Side>('expense')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<CategoryRow | null>(null)
  const [deleting, setDeleting] = useState<CategoryRow | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const bySide = useMemo(() => {
    const expense = categories.filter((c) => c.side === 'expense')
    const income = categories.filter((c) => c.side === 'income')
    return { expense, income }
  }, [categories])

  const visible = side === 'expense' ? bySide.expense : bySide.income
  const otherSideCount =
    side === 'expense' ? bySide.income.length : bySide.expense.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <Button type="button" onClick={() => setCreating(true)}>
          New category
        </Button>
      </div>

      <Tabs
        value={side}
        onValueChange={(value) => setSide(value as Side)}
      >
        <TabsList>
          <TabsTrigger value="expense">Expense</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
        </TabsList>
        <TabsContent value={side}>
          <Card>
            <CardHeader>
              <CardTitle>
                {side === 'expense' ? 'Expense' : 'Income'} categories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {visible.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="size-4 shrink-0 rounded-full border"
                      style={{ backgroundColor: category.colour }}
                      aria-hidden
                    />
                    <span>{category.name}</span>
                    {category.protected_role ? (
                      <Badge variant="secondary">Protected</Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditError(null)
                        setEditing(category)
                      }}
                    >
                      Edit
                    </Button>
                    {category.protected_role ? (
                      <span
                        className="text-muted-foreground max-w-48 text-xs"
                        title="Uncategorised and Unaccounted cannot be deleted; rename or recolour them instead."
                      >
                        Cannot delete protected categories
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleting(category)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-muted-foreground sr-only" aria-live="polite">
        {otherSideCount} categories on the other side are hidden in this tab.
      </p>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New {side} category</DialogTitle>
          </DialogHeader>
          <CategoryForm
            errorMessage={createError}
            submitLabel="Create"
            onSubmit={async (values) => {
              setCreateError(null)
              try {
                await createCategory.mutateAsync({ ...values, side })
                setCreating(false)
              } catch (error) {
                setCreateError(formatApiError(error))
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>
          {editing ? (
            <CategoryForm
              initial={editing}
              errorMessage={editError}
              submitLabel="Save changes"
              onSubmit={async (values) => {
                setEditError(null)
                try {
                  await patchCategory.mutateAsync({
                    id: editing.id,
                    body: values,
                  })
                  setEditing(null)
                } catch (error) {
                  setEditError(formatApiError(error))
                }
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Its transactions and any pending import rows will move to
              Uncategorised on the same side. Any budget on this category will
              be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleting) {
                  await deleteCategory.mutateAsync(deleting.id)
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
