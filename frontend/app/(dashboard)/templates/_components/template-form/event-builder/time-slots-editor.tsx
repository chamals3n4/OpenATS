"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { LABEL_CLASS } from "../../../lib/template-form-constants";

interface TimeSlotsEditorProps {
  slots: { datetime: string }[];
  onAdd: () => void;
  onUpdate: (index: number, datetime: string) => void;
  onRemove: (index: number) => void;
  readOnly?: boolean;
}

export function TimeSlotsEditor({
  slots,
  onAdd,
  onUpdate,
  onRemove,
  readOnly = false,
}: TimeSlotsEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className={LABEL_CLASS}>
          Time Slots{"  "}
          <span className="text-slate-400 dark:text-neutral-500 font-normal">
            -{"  "}candidates pick one
          </span>
        </Label>
        {!readOnly && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onAdd}
            className="h-7 px-2.5 text-xs font-semibold text-[var(--theme-color)] hover:text-[var(--theme-color)] hover:bg-[var(--theme-color)]/8 gap-1 shadow-none"
          >
            <HugeiconsIcon icon={PlusSignIcon} className="size-3" />
            Add slot
          </Button>
        )}
      </div>

      {slots.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-neutral-500 py-2">
          No time slots yet.
        </p>
      ) : (
        <div className="space-y-2">
          {slots.map((slot, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-[var(--theme-color)]/30 bg-[var(--theme-color)]/5 dark:bg-[var(--theme-color)]/10 pl-3 pr-1.5 py-1"
            >
              <span className="flex size-6 shrink-0 items-center justify-center text-slate-400 dark:text-neutral-500 text-xs font-semibold">
                {i + 1}
              </span>
              <DateTimePicker
                value={slot.datetime}
                onChange={(datetime) => onUpdate(i, datetime)}
                disabled={readOnly}
                className="h-9 flex-1 min-w-0 text-sm"
              />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  disabled={slots.length === 1}
                  className="size-7 flex items-center justify-center shrink-0 rounded-md text-slate-300 dark:text-neutral-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
