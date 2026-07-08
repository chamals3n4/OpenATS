"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar02Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DateTimePickerProps {
  /** "YYYY-MM-DDTHH:mm" (24h), or "" when unset */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ["AM", "PM"] as const;

function parseValue(value: string) {
  if (!value) return null;
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildValue(date: Date, hour24: number, minute: number) {
  return `${format(date, "yyyy-MM-dd")}T${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function TimeColumn<T extends number | string>({
  items,
  selected,
  onSelect,
  render,
}: {
  items: T[];
  selected: T | null;
  onSelect: (item: T) => void;
  render: (item: T) => string;
}) {
  const itemRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  React.useEffect(() => {
    if (selected !== null) {
      itemRefs.current[String(selected)]?.scrollIntoView({ block: "nearest" });
    }
  }, [selected]);

  return (
    <ScrollArea
      className="h-64 w-14"
      scrollbarClassName="w-1 data-vertical:w-1"
      thumbClassName="bg-[var(--theme-color)]"
    >
      <div className="p-1">
        {items.map((item) => (
          <button
            key={String(item)}
            ref={(el) => {
              itemRefs.current[String(item)] = el;
            }}
            type="button"
            onClick={() => onSelect(item)}
            className={cn(
              "flex w-full items-center justify-center rounded-sm py-1.5 text-sm outline-hidden select-none cursor-pointer text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800",
              item === selected && "font-semibold text-slate-950 dark:text-neutral-50",
            )}
          >
            {render(item)}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date & time",
  disabled = false,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const current = parseValue(value);

  const selectedHour12 = current ? (current.getHours() % 12 || 12) : null;
  const selectedMinute = current ? current.getMinutes() : null;
  const selectedPeriod = current ? (current.getHours() >= 12 ? "PM" : "AM") : null;

  function handleSelectDate(date: Date | undefined) {
    if (!date) return;
    const hour = current ? current.getHours() : 0;
    const minute = current ? current.getMinutes() : 0;
    onChange(buildValue(date, hour, minute));
    // Time was already set — picking a date completes the selection.
    if (current) setOpen(false);
  }

  function handleSelectHour(hour12: number) {
    const date = current ?? new Date();
    const isPM = current ? current.getHours() >= 12 : false;
    const hour24 = (hour12 % 12) + (isPM ? 12 : 0);
    const minute = current ? current.getMinutes() : 0;
    onChange(buildValue(date, hour24, minute));
  }

  function handleSelectMinute(minute: number) {
    const date = current ?? new Date();
    const hour = current ? current.getHours() : 0;
    onChange(buildValue(date, hour, minute));
  }

  function handleSelectPeriod(period: (typeof PERIODS)[number]) {
    const date = current ?? new Date();
    const hour12 = current ? current.getHours() % 12 || 12 : 12;
    const hour24 = period === "PM" ? (hour12 % 12) + 12 : hour12 % 12;
    const minute = current ? current.getMinutes() : 0;
    onChange(buildValue(date, hour24, minute));
    // AM/PM is the last step in the picking flow — close once it's chosen.
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 text-left outline-none disabled:cursor-default",
          className,
        )}
      >
        <HugeiconsIcon
          icon={Calendar02Icon}
          className="size-3.5 text-slate-400 dark:text-neutral-500 shrink-0"
        />
        <span
          className={cn(
            "truncate",
            current
              ? "text-slate-900 dark:text-neutral-100"
              : "text-slate-400 dark:text-neutral-500",
          )}
        >
          {current ? format(current, "MMM d, yyyy · h:mm a") : placeholder}
        </span>
      </PopoverTrigger>
      {!disabled && (
        <PopoverContent align="start" className="w-auto gap-0 p-0">
          <div className="flex">
            <Calendar
              mode="single"
              selected={current ?? undefined}
              onSelect={handleSelectDate}
            />
            <div className="flex divide-x divide-slate-100 dark:divide-neutral-800 border-l border-slate-100 dark:border-neutral-800">
              <TimeColumn
                items={HOURS}
                selected={selectedHour12}
                onSelect={handleSelectHour}
                render={(h) => String(h)}
              />
              <TimeColumn
                items={MINUTES}
                selected={selectedMinute}
                onSelect={handleSelectMinute}
                render={(m) => String(m).padStart(2, "0")}
              />
              <TimeColumn
                items={[...PERIODS]}
                selected={selectedPeriod}
                onSelect={handleSelectPeriod}
                render={(p) => p}
              />
            </div>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
