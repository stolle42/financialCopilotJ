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

type OpeningBalanceWarningProps = {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function OpeningBalanceWarning({
  open,
  onConfirm,
  onCancel,
}: OpeningBalanceWarningProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change opening balance?</AlertDialogTitle>
          <AlertDialogDescription>
            Every balance this account has ever shown will change. Confirm only if
            you mean to restate history from the start.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
