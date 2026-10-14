"use client";

import { useMemo, useState } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { ChevronDownIcon, SearchIcon } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface SearchSelectOption {
  /** What is saved, such as "Asia/Colombo" or "LKR". */
  value: string;
  /** What is shown for it. */
  label: string;
  /** Small note next to the label */
  hint?: string;
  /** Extra search words */
  keywords?: string;
}

/** Max rows to draw at once */
const MAX_SHOWN = 50;

const haystackOf = (option: SearchSelectOption) =>
  `${option.value} ${option.label} ${option.hint ?? ""} ${option.keywords ?? ""}`.toLowerCase();

/** Select with search for long lists */
export function SearchSelect({
  id,
  value,
  onChange,
  options,
  describe,
  searchPlaceholder,
  emptyText = "Nothing matches that.",
  ariaLabel,
  compact = false,
  className,
  contentClassName,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: () => SearchSelectOption[];
  /** Optional label for the selected value */
  describe?: (value: string) => Pick<SearchSelectOption, "label" | "hint">;
  searchPlaceholder: string;
  emptyText?: string;
  ariaLabel?: string;
  /** Show only the label on the button */
  compact?: boolean;
  className?: string;
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const matches = useMemo(() => {
    if (!open) return [];
    const all = options();
    const words = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      return [...all].sort((a, b) => Number(b.value === value) - Number(a.value === value));
    }
    return all.filter((option) => {
      const haystack = haystackOf(option);
      return words.every((word) => haystack.includes(word));
    });
  }, [open, options, search, value]);
  const shown = matches.slice(0, MAX_SHOWN);

  const chosen = useMemo(
    () => (describe ? describe(value) : options().find((option) => option.value === value)),
    [describe, options, value],
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          "flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-slate-300 bg-gray-100 px-3 text-left text-sm text-slate-900 outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100",
          className,
        )}
      >
        <span className="truncate">
          {chosen?.label ?? value}
          {!compact && chosen?.hint && (
            <span className="ml-2 text-slate-500 dark:text-neutral-400">{chosen.hint}</span>
          )}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-slate-500 dark:text-neutral-400" aria-hidden />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        // No animation, it feels slow on long lists
        className={cn(
          "w-(--anchor-width) min-w-72 gap-0 p-0 duration-0 data-open:animate-none data-closed:animate-none",
          contentClassName,
        )}
      >
        <Command shouldFilter={false}>
          <div className="p-2 pb-1">
            <div className="flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-gray-100 px-2.5 dark:border-neutral-600 dark:bg-neutral-800">
              <SearchIcon className="size-4 shrink-0 text-slate-500 dark:text-neutral-400" aria-hidden />
              <CommandPrimitive.Input
                value={search}
                onValueChange={setSearch}
                placeholder={searchPlaceholder}
                className="h-full w-full min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-neutral-100 dark:placeholder:text-neutral-500"
              />
            </div>
          </div>
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {shown.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  data-checked={option.value === value}
                  onSelect={() => {
                    onChange(option.value);
                    handleOpenChange(false);
                  }}
                  className="cursor-pointer"
                >
                  <span className="truncate">{option.label}</span>
                  {option.hint && (
                    <span className="shrink-0 text-xs text-slate-500 dark:text-neutral-400">{option.hint}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {matches.length > shown.length && (
            <p className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
              Showing {shown.length} of {matches.length}. Type to narrow the list.
            </p>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
