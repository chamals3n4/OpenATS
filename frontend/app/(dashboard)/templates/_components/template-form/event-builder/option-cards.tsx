"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import type { Video01Icon } from "@hugeicons/core-free-icons";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface CardOption<T extends string> {
  value: T;
  label: string;
  description: string;
  icon: typeof Video01Icon;
}

/** A choice between a few options, each shown as a card with an icon and a line of help. */
export function OptionCards<T extends string>({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: CardOption<T>[];
  disabled?: boolean;
}) {
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onValueChange={(v) => onChange(v as T)}
      disabled={disabled}
      className="grid gap-2.5 sm:grid-cols-2"
    >
      {options.map((option) => (
        <label
          key={option.value}
          className={`flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-3.5 py-3 transition-[border-color,background-color] duration-200 ease-out has-data-checked:border-theme has-data-checked:bg-theme/5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-theme motion-reduce:transition-none dark:border-neutral-700 dark:bg-neutral-900 dark:has-data-checked:bg-theme/10 ${
            disabled ? "" : "cursor-pointer hover:border-slate-400 dark:hover:border-neutral-500"
          }`}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-200">
            <HugeiconsIcon icon={option.icon} className="size-[18px]" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900 dark:text-neutral-100">
              {option.label}
            </span>
            <span className="block text-[13px] leading-snug text-slate-600 dark:text-neutral-400">
              {option.description}
            </span>
          </span>
          <RadioGroupItem variant="theme" value={option.value} aria-label={option.label} className="shrink-0" />
        </label>
      ))}
    </RadioGroup>
  );
}
