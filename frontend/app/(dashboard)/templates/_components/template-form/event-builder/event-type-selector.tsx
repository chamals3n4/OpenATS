"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Video01Icon, Location01Icon } from "@hugeicons/core-free-icons";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LABEL_CLASS } from "../../../lib/template-form-constants";

interface EventTypeSelectorProps {
  value: "virtual" | "onsite";
  onChange: (type: "virtual" | "onsite") => void;
  readOnly?: boolean;
}

const OPTIONS = [
  { value: "virtual" as const, label: "Virtual", desc: "Video call link", icon: Video01Icon },
  { value: "onsite" as const, label: "On-site", desc: "In-person interview", icon: Location01Icon },
];

export function EventTypeSelector({ value, onChange, readOnly = false }: EventTypeSelectorProps) {
  return (
    <div className="space-y-1.5">
      <Label className={LABEL_CLASS}>Event Type</Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as "virtual" | "onsite")}
        disabled={readOnly}
        className="grid grid-cols-2 gap-2"
      >
        {OPTIONS.map((opt) => (
          <label
            key={opt.value}
            htmlFor={`event-type-${opt.value}`}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors select-none ${
              value === opt.value
                ? "border-[var(--theme-color)] bg-[var(--theme-color)]/5 dark:bg-[var(--theme-color)]/10"
                : "border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-slate-300 dark:hover:border-neutral-600"
            }`}
          >
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
                value === opt.value
                  ? "bg-[var(--theme-color)]/15 text-[var(--theme-color)]"
                  : "bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500"
              }`}
            >
              <HugeiconsIcon icon={opt.icon} className="size-4" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-slate-800 dark:text-neutral-200">
                {opt.label}
              </span>
              <span className="block text-xs text-slate-400 dark:text-neutral-500">
                {opt.desc}
              </span>
            </span>
            <RadioGroupItem
              value={opt.value}
              id={`event-type-${opt.value}`}
              className="border-slate-300 dark:border-neutral-600 size-3.5 shrink-0"
            />
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
