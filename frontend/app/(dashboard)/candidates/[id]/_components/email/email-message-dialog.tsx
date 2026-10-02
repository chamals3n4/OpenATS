"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface EmailHeaderRow {
  label: string;
  value: React.ReactNode;
}

interface EmailMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** To, Subject and so on, shown above the message like an email client does. */
  rows: EmailHeaderRow[];
  /** The message itself. */
  children: React.ReactNode;
}

/** One layout for looking at an email, whether it is a draft preview or one already sent. */
export function EmailMessageDialog({
  open,
  onOpenChange,
  title,
  description,
  rows,
  children,
}: EmailMessageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-4 border-slate-200 bg-white p-6 sm:max-w-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900 dark:text-neutral-100">
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <article
          aria-label={title}
          className="max-h-[60vh] overflow-y-auto rounded-md border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-950/40"
        >
          <dl className="space-y-1.5 border-b border-slate-300 px-5 py-4 dark:border-neutral-700">
            {rows.map((row) => (
              <div key={row.label} className="flex gap-3 text-sm">
                <dt className="w-16 shrink-0 font-medium text-slate-500 dark:text-neutral-400">
                  {row.label}
                </dt>
                <dd className="min-w-0 break-words text-slate-900 dark:text-neutral-100">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
          {children}
        </article>

        <DialogFooter>
          <Button
            variant="cancel"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 text-sm"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
