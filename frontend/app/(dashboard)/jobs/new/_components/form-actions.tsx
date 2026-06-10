"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FormActionsProps {
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitDisabled: boolean;
  isPending: boolean;
}

export function FormActions({
  onSubmit,
  onCancel,
  isSubmitDisabled,
  isPending,
}: FormActionsProps) {
  return (
    <div className="pt-10 flex items-center gap-2">
      <Button
        onClick={onSubmit}
        disabled={isSubmitDisabled}
        className="h-10! rounded-md border-none bg-theme hover:bg-theme-hover px-4 text-base font-semibold leading-none text-white shadow-none cursor-pointer gap-2 flex items-center"
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 shrink-0 animate-spin" />
            <span>Saving…</span>
          </>
        ) : (
          <>
            <Save className="size-4" />
            <span>Save Job</span>
          </>
        )}
      </Button>
      <Button
        type="button"
        className="h-10! rounded-md border border-slate-300 dark:border-neutral-600 bg-transparent hover:bg-slate-50 dark:hover:bg-neutral-900/50 px-4 text-base font-semibold leading-none text-slate-700 dark:text-neutral-300 shadow-none cursor-pointer gap-2 flex items-center"
        onClick={onCancel}
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
        <span>Cancel</span>
      </Button>
    </div>
  );
}
