"use client";

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
      <DialogContent className="!top-[20%] !translate-y-0 sm:max-w-[500px] max-w-[500px] rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-7 duration-0 data-open:zoom-in-100 data-closed:zoom-out-100">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold text-slate-900 dark:text-neutral-100">
            What type of template is this?
          </DialogTitle>
          <p className="text-[13px] text-slate-500 dark:text-neutral-400 mt-1">
            The type sets which variables are available in the builder.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-5">
          {TEMPLATE_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => onPickType(type)}
              className={`flex flex-col items-start gap-2.5 p-4 rounded-xl border-2 text-left transition-all ${
                pickedType === type
                  ? "border-[var(--theme-color)] bg-[var(--theme-color)]/5 dark:bg-[var(--theme-color)]/10"
                  : "border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900"
              }`}
            >
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${TYPE_META[type].badge}`}
              >
                {TYPE_META[type].label}
              </span>
              <span className="text-[12px] text-slate-500 dark:text-neutral-400 leading-snug">
                {TYPE_DESCRIPTIONS[type]}
              </span>
            </button>
          ))}
        </div>

        <DialogFooter className="mt-6 gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-10 px-6 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800 font-medium shadow-none rounded-lg text-sm"
          >
            Cancel
          </Button>
          <Button
            disabled={!pickedType}
            onClick={onContinue}
            className="h-10 px-6 bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-medium shadow-none rounded-lg text-sm border-none disabled:opacity-40"
          >
            Continue →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
