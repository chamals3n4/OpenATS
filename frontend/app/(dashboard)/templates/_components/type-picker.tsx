"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon, Calendar02Icon, Mail01Icon } from "@hugeicons/core-free-icons";
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
import { TYPE_META, type TemplateType } from "../lib/templates-utils";

const TEMPLATE_TYPES: TemplateType[] = ["email", "event"];

const TYPE_ICONS: Record<TemplateType, typeof Mail01Icon> = {
  email: Mail01Icon,
  event: Calendar02Icon,
};

const TYPE_DESCRIPTIONS: Record<TemplateType, string> = {
  email: "A message sent to a candidate, such as a rejection or an offer letter.",
  event: "Invite a candidate to pick an interview time, with a meeting link or a location.",
};

interface TemplateTypePickerProps {
  isOpen: boolean;
  pickedType: string | null;
  onPickType: (type: string | null) => void;
  onClose: () => void;
  onContinue: () => void;
}

export function TemplateTypePicker({
  isOpen,
  pickedType,
  onPickType,
  onClose,
  onContinue,
}: TemplateTypePickerProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-0 rounded-xl border-slate-200 bg-white p-6 sm:max-w-[640px] dark:border-neutral-800 dark:bg-neutral-900">
        <DialogHeader className="mb-5 gap-1">
          <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
            New template
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-slate-600 dark:text-neutral-400">
            Choose what you are building. The type decides which variables you
            can use in the builder.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          aria-label="Template type"
          value={pickedType ?? ""}
          onValueChange={(v) => onPickType(v || null)}
          className="gap-2.5"
        >
          {TEMPLATE_TYPES.map((type) => (
            <label
              key={type}
              className="flex cursor-pointer items-center gap-4 rounded-lg border border-slate-300 bg-white px-4 py-3.5 transition-[border-color,background-color] duration-200 ease-out hover:border-slate-400 has-data-checked:border-theme has-data-checked:bg-theme/5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-theme motion-reduce:transition-none dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-500 dark:has-data-checked:bg-theme/10"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-200">
                <HugeiconsIcon icon={TYPE_ICONS[type]} className="size-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
                  {TYPE_META[type].label}
                </span>
                <span className="mt-0.5 block text-sm leading-snug text-slate-600 dark:text-neutral-400">
                  {TYPE_DESCRIPTIONS[type]}
                </span>
              </span>
              <RadioGroupItem
                variant="theme"
                value={type}
                aria-label={TYPE_META[type].label}
                className="shrink-0"
              />
            </label>
          ))}
        </RadioGroup>

        <DialogFooter className="mt-6">
          <Button variant="cancel" onClick={onClose} className="h-9 px-4 text-sm">
            Cancel
          </Button>
          <Button
            disabled={!pickedType}
            onClick={onContinue}
            className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover disabled:opacity-50"
          >
            Continue
            <HugeiconsIcon icon={ArrowRight02Icon} className="size-4" strokeWidth={2} />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
