import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function DeclineOfferDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-sm rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-semibold text-slate-900 dark:text-neutral-100">
            Decline this offer?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-500 dark:text-neutral-400 leading-relaxed">
            The hiring team will be notified. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="h-8 px-4 text-sm">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="h-8 rounded-md border-none bg-red-600 px-4 text-sm font-semibold leading-none text-white shadow-none hover:bg-red-500 cursor-pointer"
          >
            Decline offer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
