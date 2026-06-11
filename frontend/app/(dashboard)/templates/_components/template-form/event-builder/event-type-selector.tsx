"use client";

import { Label } from "@/components/ui/label";
import { INPUT_CLASS, LABEL_CLASS } from "../../../lib/template-form-constants";

interface EventTypeSelectorProps {
  value: "virtual" | "onsite";
  onChange: (type: "virtual" | "onsite") => void;
}

export function EventTypeSelector({ value, onChange }: EventTypeSelectorProps) {
  const options: { value: "virtual" | "onsite"; label: string }[] = [
    { value: "virtual", label: "Virtual" },
    { value: "onsite", label: "On-site" },
  ];

  return (
    <div className="space-y-2">
      <Label className={LABEL_CLASS}>Event Type</Label>
      <div className="flex items-center gap-4">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 transition-colors ${
              value === opt.value
                ? "border-[var(--theme-color)] bg-(--theme-color)/5 dark:bg-(--theme-color)/10"
                : "border-slate-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800"
            }`}
          >
            <input
              type="radio"
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="text-[var(--theme-color)]"
            />
            <span className="text-[13px] font-semibold text-slate-700 dark:text-neutral-300">
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
