"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LABEL_CLASS } from "../../../lib/template-form-constants";

interface TimeSlotsEditorProps {
  slots: { datetime: string }[];
  onAdd: () => void;
  onUpdate: (index: number, datetime: string) => void;
  onRemove: (index: number) => void;
  readOnly?: boolean;
}

/** Split "2025-06-15T14:30" into { date: "2025-06-15", time: "14:30" } */
function splitDatetime(dt: string) {
  const [date = "", time = ""] = dt.split("T");
  return { date, time };
}

/** Merge date + time back into "YYYY-MM-DDTHH:mm" */
function mergeDatetime(date: string, time: string) {
  if (!date && !time) return "";
  return `${date}T${time}`;
}

const inputCls =
  "h-8 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 shadow-none rounded-md placeholder:text-slate-400 dark:placeholder:text-neutral-500 text-slate-900 dark:text-neutral-100 text-sm focus-visible:border-slate-400 dark:focus-visible:border-neutral-500 focus-visible:ring-0";

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
        <Label className={LABEL_CLASS}>Time Slots</Label>
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
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-neutral-500 pl-1">
              Date
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-neutral-500 pl-1">
              Time
            </span>
            <span className="w-8" />
          </div>

          {slots.map((slot, i) => {
            const { date, time } = splitDatetime(slot.datetime);
            return (
              <div key={i} className={`grid gap-2 items-center ${readOnly ? "grid-cols-2" : "grid-cols-[1fr_1fr_auto]"}`}>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => onUpdate(i, mergeDatetime(e.target.value, time))}
                  readOnly={readOnly}
                  className={inputCls}
                />
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => onUpdate(i, mergeDatetime(date, e.target.value))}
                  readOnly={readOnly}
                  className={inputCls}
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onRemove(i)}
                    disabled={slots.length === 1}
                    className="size-8 flex items-center justify-center rounded-md text-slate-300 dark:text-neutral-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
