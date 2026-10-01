"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField, inputCls } from "@/components/form/form-field";

interface DepartmentNameDialogProps {
  open: boolean;
  title: string;
  submitLabel: string;
  pendingLabel: string;
  initialName?: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

function NameForm({
  submitLabel,
  pendingLabel,
  initialName = "",
  isPending,
  onClose,
  onSubmit,
}: Omit<DepartmentNameDialogProps, "open" | "title">) {
  const [name, setName] = useState(initialName);
  const trimmed = name.trim();
  const canSubmit = Boolean(trimmed) && trimmed !== initialName.trim();

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit && !isPending) onSubmit(trimmed);
      }}
    >
      <FormField label="Department name" htmlFor="department-name">
        <Input
          id="department-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Engineering"
          className={inputCls}
        />
      </FormField>
      <DialogFooter>
        <Button
          type="button"
          variant="cancel"
          onClick={onClose}
          disabled={isPending}
          className="h-9 px-4 text-sm"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!canSubmit || isPending}
          className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
        >
          {isPending && <Spinner className="size-3.5" />}
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DepartmentNameDialog({
  open,
  title,
  onClose,
  ...formProps
}: DepartmentNameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm gap-5 rounded-xl border-slate-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900 dark:text-neutral-100">
            {title}
          </DialogTitle>
        </DialogHeader>
        {/* Mounted only while open, so the field always starts from the current name. */}
        <NameForm {...formProps} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
