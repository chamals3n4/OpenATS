"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LABEL_CLASS } from "../../../lib/template-form-constants";

interface EventTypeSelectorProps {
  value: "virtual" | "onsite";
  onChange: (type: "virtual" | "onsite") => void;
}

export function EventTypeSelector({ value, onChange }: EventTypeSelectorProps) {
  return (
    <div className="space-y-1.5">
      <Label className={LABEL_CLASS}>Event Type</Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as "virtual" | "onsite")}
        className="flex gap-2"
      >
        {(["virtual", "onsite"] as const).map((opt) => (
          <label
            key={opt}
            htmlFor={`event-type-${opt}`}
            className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 transition-colors select-none ${
              value === opt
                ? "border-[var(--theme-color)] bg-[var(--theme-color)]/5 dark:bg-[var(--theme-color)]/10"
                : "border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-slate-300 dark:hover:border-neutral-600"
            }`}
          >
            <RadioGroupItem
              value={opt}
              id={`event-type-${opt}`}
              className="border-slate-300 dark:border-neutral-600 size-3.5"
            />
            <span className="text-[13px] text-slate-700 dark:text-neutral-300">
              {opt === "virtual" ? "Virtual" : "On-site"}
            </span>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
