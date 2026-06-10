"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INPUT_CLASS, LABEL_CLASS } from "../../../lib/template-form-constants";

interface TimeSlotsEditorProps {
  slots: { datetime: string }[];
  onAdd: () => void;
  onUpdate: (index: number, datetime: string) => void;
  onRemove: (index: number) => void;
}

export function TimeSlotsEditor({
  slots,
  onAdd,
  onUpdate,
  onRemove,
}: TimeSlotsEditorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className={LABEL_CLASS}>Default Time Slots</Label>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--theme-color)] hover:underline"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="size-3" /> Add Slot
        </button>
      </div>
      <div className="space-y-2">
        {slots.map((slot, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              type="datetime-local"
              value={slot.datetime}
              onChange={(e) => onUpdate(i, e.target.value)}
              className={INPUT_CLASS + " flex-1"}
            />
            {slots.length > 1 && (
              <button
                onClick={() => onRemove(i)}
                className="size-9 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500"
              >
                <HugeiconsIcon icon={Delete02Icon} className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
