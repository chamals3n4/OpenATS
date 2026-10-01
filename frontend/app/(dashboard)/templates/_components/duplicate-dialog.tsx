"use client";

import { useState } from "react";
import { FormField, inputCls } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { Template } from "@/types";
import {
  TEMPLATE_NAME_MAX,
  suggestCopyName,
  validateTemplateName,
} from "../lib/templates-utils";

interface DuplicateTemplateDialogProps {
  /** The template being copied; the dialog is open while this is set. */
  template: Template | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

function DuplicateForm({
  template,
  isPending,
  onClose,
  onConfirm,
}: Omit<DuplicateTemplateDialogProps, "template"> & { template: Template }) {
  const [name, setName] = useState(() => suggestCopyName(template.name));
  const [showError, setShowError] = useState(false);
  const error = validateTemplateName(name);

  const submit = () => {
    if (error) {
      setShowError(true);
      return;
    }
    onConfirm(name.trim());
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isPending) submit();
      }}
    >
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
          Duplicate template
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed text-slate-600 dark:text-neutral-400">
          Make a copy of{" "}
          <strong className="font-semibold text-slate-800 dark:text-neutral-100">
            {template.name}
          </strong>
          . The copy keeps the same type, subject and content, and you can edit
          it afterwards.
        </DialogDescription>
      </DialogHeader>

      <FormField
        label="Name of the copy"
        htmlFor="duplicate-name"
        required
        error={showError ? error : null}
        hint={`${name.trim().length}/${TEMPLATE_NAME_MAX}`}
      >
        <Input
          id="duplicate-name"
          autoFocus
          // Select the suggestion so typing replaces it, while a click can still place the cursor.
          onFocus={(e) => e.currentTarget.select()}
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          disabled={isPending}
          className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
        >
          {isPending && <Spinner className="size-3.5" />}
          {isPending ? "Creating" : "Create copy"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DuplicateTemplateDialog({
  template,
  isPending,
  onClose,
  onConfirm,
}: DuplicateTemplateDialogProps) {
  return (
    <Dialog
      open={template !== null}
      onOpenChange={(open) => {
        // Don't let Escape or an outside click abandon a copy that is being created.
        if (!open && !isPending) onClose();
      }}
    >
      <DialogContent className="max-w-[calc(100%-2rem)] gap-0 rounded-xl border-slate-200 bg-white p-6 sm:max-w-[600px] dark:border-neutral-800 dark:bg-neutral-900">
        {/* Mounted only while open, so every copy starts from a fresh suggestion. */}
        {template && (
          <DuplicateForm
            template={template}
            isPending={isPending}
            onClose={onClose}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
