"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { StarIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export const RATING_LABELS = ["Poor", "Below average", "Average", "Good", "Excellent"];

interface StarRatingProps {
  value: number | null;
  onChange: (value: number | null) => void;
  /** Names the group for screen readers, e.g. "Technical skill". */
  label: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

/** Five stars to pick 1-5. Picking the current value again clears it. */
export function StarRating({ value, onChange, label, disabled, size = "md" }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value !== null && n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            disabled={disabled}
            aria-checked={value === n}
            aria-label={`${n} of 5, ${RATING_LABELS[n - 1]}`}
            title={RATING_LABELS[n - 1]}
            onClick={() => onChange(value === n ? null : n)}
            className="cursor-pointer rounded-md p-0.5 transition-colors hover:bg-amber-50 disabled:cursor-default dark:hover:bg-amber-950/30"
          >
            <HugeiconsIcon
              icon={StarIcon}
              className={cn(
                size === "sm" ? "size-5" : "size-6",
                active
                  ? "fill-amber-500 text-amber-500"
                  : "text-slate-300 dark:text-neutral-600",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
