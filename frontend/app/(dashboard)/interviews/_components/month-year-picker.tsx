"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const stepCls =
  "flex size-8 cursor-pointer items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-theme/10 hover:text-theme dark:text-neutral-300 dark:hover:text-primary";

/** Calendar title that opens a month and year picker */
export function MonthYearPicker({
  year,
  month,
  today,
  onChange,
}: {
  year: number;
  /** 0 for January. */
  month: number;
  today: Date;
  onChange: (year: number, month: number) => void;
}) {
  const [open, setOpen] = useState(false);
  // Year shown in the picker
  const [viewYear, setViewYear] = useState(year);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setViewYear(year);
      }}
    >
      <PopoverTrigger
        aria-label={`${MONTH_NAMES[month]} ${year}. Choose another month`}
        className="-ml-2 flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-lg font-semibold text-slate-900 transition-colors hover:bg-theme/10 aria-expanded:bg-theme/10 dark:text-neutral-100"
      >
        <span aria-live="polite">
          {MONTH_NAMES[month]} <span className="font-normal text-slate-500 dark:text-neutral-400">{year}</span>
        </span>
        <ChevronDown className="size-4 text-slate-500 dark:text-neutral-400" strokeWidth={2} />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 gap-3 p-3">
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Previous year" onClick={() => setViewYear((y) => y - 1)} className={stepCls}>
            <ChevronLeft className="size-4" strokeWidth={2} />
          </button>
          <span aria-live="polite" className="text-[15px] font-semibold tabular-nums text-slate-900 dark:text-neutral-100">
            {viewYear}
          </span>
          <button type="button" aria-label="Next year" onClick={() => setViewYear((y) => y + 1)} className={stepCls}>
            <ChevronRight className="size-4" strokeWidth={2} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {MONTHS.map((label, index) => {
            const isShown = viewYear === year && index === month;
            const isThisMonth = viewYear === today.getFullYear() && index === today.getMonth();
            return (
              <button
                key={label}
                type="button"
                aria-label={`${MONTH_NAMES[index]} ${viewYear}`}
                aria-pressed={isShown}
                onClick={() => {
                  onChange(viewYear, index);
                  setOpen(false);
                }}
                className={`h-9 cursor-pointer rounded-md text-sm font-medium transition-colors ${
                  isShown
                    ? "bg-theme text-white"
                    : isThisMonth
                      ? "text-theme ring-1 ring-theme hover:bg-theme/10 dark:text-primary"
                      : "text-slate-800 hover:bg-theme/10 dark:text-neutral-200"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
