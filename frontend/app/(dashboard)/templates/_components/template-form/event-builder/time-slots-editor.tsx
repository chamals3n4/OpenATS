"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { isPastSlot } from "../../../lib/template-form-utils";

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
  // Fixed when the form opens, so a slot does not flip to "passed" while it is being edited.
  const [now] = useState(() => Date.now());

  return (
    <div className="space-y-2">
      <ol className="space-y-2">
        {slots.map((slot, i) => {
          const past = isPastSlot(slot.datetime, now);
          return (
            <li key={i}>
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  {i + 1}
                </span>
                <DateTimePicker
                  value={slot.datetime}
                  onChange={(datetime) => onUpdate(i, datetime)}
                  disabled={readOnly}
                  placeholder="Choose a date and time"
                  className={`h-9 min-w-0 flex-1 cursor-pointer rounded-md border bg-gray-100 px-3 text-sm dark:bg-neutral-800 ${
                    past ? "border-amber-400 dark:border-amber-600" : "border-slate-300 dark:border-neutral-600"
                  }`}
                />
                {!readOnly && (
                  <button
                    type="button"
                    aria-label={`Remove time slot ${i + 1}`}
                    title="Remove"
                    onClick={() => onRemove(i)}
                    disabled={slots.length === 1}
                    className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-30 dark:text-neutral-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                  </button>
                )}
              </div>
              {past && (
                <p className="ml-8 mt-1 text-[13px] text-amber-700 dark:text-amber-400">
                  This time has passed, so candidates will not be offered it.
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {!readOnly && (
        <Button
          type="button"
          variant="cancel"
          onClick={onAdd}
          className="ml-8 h-9 cursor-pointer gap-2 border-dashed px-3 text-sm"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2} />
          Add a time slot
        </Button>
      )}
    </div>
  );
}
