"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Mail01Icon,
  Calendar02Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { TYPE_META, type TemplateType } from "../lib/templates-utils";

const TEMPLATE_TYPES: TemplateType[] = ["email", "event"];

const TYPE_ICONS: Record<TemplateType, typeof Mail01Icon> = {
  email: Mail01Icon,
  event: Calendar02Icon,
};

const TYPE_DESCRIPTIONS: Record<TemplateType, string> = {
  email: "Send emails to candidates",
  event: "Interview scheduling with time slots & calendar sync",
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
      <DialogContent className="sm:max-w-[480px] rounded-2xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-bold text-slate-900 dark:text-neutral-100">
            What type of template is this?
          </DialogTitle>
          <p className="text-[13px] text-slate-500 dark:text-neutral-400 mt-1">
            The type sets which variables are available in the builder.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {TEMPLATE_TYPES.map((type) => {
            const isSelected = pickedType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onPickType(type)}
                className={`relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "border-theme bg-theme/5 dark:bg-theme/10"
                    : "border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700"
                }`}
              >
                {isSelected && (
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    className="absolute top-3 right-3 size-4 text-theme"
                  />
                )}
                <div
                  className={`flex size-9 items-center justify-center rounded-full ${TYPE_META[type].badge}`}
                >
                  <HugeiconsIcon icon={TYPE_ICONS[type]} className="size-4" />
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold text-slate-900 dark:text-neutral-100">
                    {TYPE_META[type].label}
                  </p>
                  <p className="mt-0.5 text-[12px] text-slate-500 dark:text-neutral-400 leading-snug">
                    {TYPE_DESCRIPTIONS[type]}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!pickedType}
            onClick={onContinue}
            className="bg-theme hover:bg-theme-hover text-white disabled:opacity-40"
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
