"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import type { TemplateType } from "../../lib/template-form-types";

const TYPE_BADGE: Record<TemplateType, string> = {
  email:
    "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  event:
    "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800",
};

interface TemplateFormHeaderProps {
  templateType: TemplateType;
  mode: "new" | "edit";
  canSave: boolean;
  isPending: boolean;
  onSave: () => void;
}

export function TemplateFormHeader({
  templateType,
  mode,
  canSave,
  isPending,
  onSave,
}: TemplateFormHeaderProps) {
  return (
    <div className="flex items-center justify-between px-7 py-3.5 border-b border-slate-200 dark:border-neutral-800 shrink-0 bg-white dark:bg-neutral-950">
      <div className="flex items-center gap-4">
        <Link
          href="/templates"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" />
        </Link>
        <div className="h-4 w-px bg-slate-200 dark:bg-neutral-800" />
        <span
          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${TYPE_BADGE[templateType]}`}
        >
          {templateType === "email" ? "Email" : "Interview Event"}
        </span>
        <span className="text-[14px] text-slate-400 dark:text-neutral-500">
          {mode === "new" ? "New template" : "Edit template"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/templates">
          <Button
            type="button"
            variant="ghost"
            className="h-9 rounded-md px-4 text-[13px] font-semibold text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800"
          >
            Cancel
          </Button>
        </Link>
        <Button
          onClick={onSave}
          disabled={!canSave || isPending}
          className="h-9 rounded-md border-none bg-[var(--theme-color)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--theme-color-hover)] disabled:opacity-50 shadow-none"
        >
          {isPending ? "Saving…" : mode === "new" ? "Save Template" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
