"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TemplatesFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  filterType: string;
  onFilterTypeChange: (type: string) => void;
  onClear: () => void;
}

export function TemplatesFilters({
  search,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  onClear,
}: TemplatesFiltersProps) {
  const hasFilters = search || filterType !== "all";

  return (
    <div className="border-y border-slate-200 dark:border-neutral-800 px-6 py-2.5 flex items-center gap-2">
      <div className="relative w-64">
        <HugeiconsIcon
          icon={Search01Icon}
          className="pointer-events-none absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
        />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-8! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-md text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0"
        />
      </div>

      <Select
        value={filterType}
        onValueChange={(value) => {
          if (value !== null) onFilterTypeChange(value);
        }}
      >
        <SelectTrigger className="w-40 h-8! bg-gray-100 cursor-pointer dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-md text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 focus-visible:ring-0 px-3">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent className="rounded-md shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="email">Email</SelectItem>
          <SelectItem value="event">Interview Event</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          onClick={onClear}
          className="text-slate-600 dark:text-neutral-400 text-sm h-8 px-4 hover:bg-transparent hover:text-slate-900 dark:hover:text-neutral-100 border-none"
        >
          Clear All
        </Button>
      )}
    </div>
  );
}
