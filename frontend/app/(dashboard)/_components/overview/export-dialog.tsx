"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Csv01Icon, DocumentCodeIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";

export type ExportFormat = "csv" | "json";

const FORMATS: { value: ExportFormat; label: string; description: string; icon: typeof Csv01Icon }[] = [
  { value: "csv", label: "CSV", description: "Rows and columns. Opens in Excel or Google Sheets.", icon: Csv01Icon },
  { value: "json", label: "JSON", description: "Structured data, for developers and other tools.", icon: DocumentCodeIcon },
];

interface ExportDialogProps {
  open: boolean;
  format: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  /** What the export covers, e.g. "Last 30 days, All departments". */
  scope: string;
  isPending: boolean;
  onClose: () => void;
  onExport: () => void;
}

export function ExportDialog({ open, format, onFormatChange, scope, isPending, onClose, onExport }: ExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isPending && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-0 rounded-xl border-slate-200 bg-white p-6 sm:max-w-[560px] dark:border-neutral-800 dark:bg-neutral-900">
        <DialogHeader className="mb-5 gap-1">
          <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
            Export report
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-slate-600 dark:text-neutral-400">
            Download the numbers behind this page. {scope}.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          aria-label="File format"
          value={format}
          onValueChange={(v) => v && onFormatChange(v as ExportFormat)}
          className="gap-2.5"
        >
          {FORMATS.map((f) => (
            <label
              key={f.value}
              className="flex cursor-pointer items-center gap-4 rounded-lg border border-slate-300 bg-white px-4 py-3.5 hover:border-slate-400 has-data-checked:border-theme has-data-checked:bg-theme/5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-theme dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-500 dark:has-data-checked:bg-theme/10"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-200">
                <HugeiconsIcon icon={f.icon} className="size-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-slate-900 dark:text-neutral-100">{f.label}</span>
                <span className="mt-0.5 block text-sm leading-snug text-slate-600 dark:text-neutral-400">
                  {f.description}
                </span>
              </span>
              <RadioGroupItem variant="theme" value={f.value} aria-label={f.label} className="shrink-0" />
            </label>
          ))}
        </RadioGroup>

        <DialogFooter className="mt-6">
          <Button variant="cancel" onClick={onClose} disabled={isPending} className="h-9 px-4 text-sm">
            Cancel
          </Button>
          <Button
            onClick={onExport}
            disabled={isPending}
            className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
          >
            {isPending && <Spinner className="size-3.5" />}
            {isPending ? "Exporting" : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
