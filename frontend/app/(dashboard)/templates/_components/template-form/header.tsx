"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar02Icon, Cancel01Icon, Mail01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { TemplateType } from "../../lib/template-form-types";

const TYPE_COPY: Record<TemplateType, { icon: typeof Mail01Icon; kind: string; newTitle: string }> = {
  email: { icon: Mail01Icon, kind: "Email template", newTitle: "New email template" },
  event: { icon: Calendar02Icon, kind: "Interview event template", newTitle: "New interview event template" },
};

interface TemplateFormHeaderProps {
  templateType: TemplateType;
  mode: "new" | "edit";
  /** The name as typed so far, shown as the title while editing. */
  name: string;
  isPending: boolean;
  onSave: () => void;
  readOnly?: boolean;
}

export function TemplateFormHeader({
  templateType,
  mode,
  name,
  isPending,
  onSave,
  readOnly = false,
}: TemplateFormHeaderProps) {
  const copy = TYPE_COPY[templateType];
  const title = mode === "new" ? copy.newTitle : name.trim() || "Untitled template";
  const subtitle = mode === "new" ? "Saved templates can be reused for any candidate." : copy.kind;

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-theme/10 text-theme dark:text-primary">
          <HugeiconsIcon icon={copy.icon} className="size-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold leading-tight text-slate-950 dark:text-neutral-50">
            {title}
          </h1>
          <p className="truncate text-[13px] text-slate-500 dark:text-neutral-400">
            {readOnly ? `${copy.kind} · View only` : subtitle}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {!readOnly && (
          <Button
            onClick={onSave}
            disabled={isPending}
            className="h-9 cursor-pointer gap-2 border-none px-4 text-sm font-semibold text-white shadow-none"
          >
            {isPending && <Spinner className="size-3.5" />}
            {isPending ? "Saving" : mode === "new" ? "Save template" : "Save changes"}
          </Button>
        )}
        <span aria-hidden className="mx-1 hidden h-6 w-px bg-slate-300 sm:block dark:bg-neutral-700" />
        <Link
          href="/templates"
          aria-label="Back to templates"
          title="Back to templates"
          className="flex size-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
        </Link>
      </div>
    </header>
  );
}
