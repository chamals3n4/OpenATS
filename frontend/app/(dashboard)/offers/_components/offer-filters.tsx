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
import type { Job } from "@/types";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" },
];

interface OfferFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedJobId: number | undefined;
  onJobChange: (id: number | undefined) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  jobs: Job[];
  onClear: () => void;
}

export function OfferFilters({
  search,
  onSearchChange,
  selectedJobId,
  onJobChange,
  statusFilter,
  onStatusChange,
  jobs,
  onClear,
}: OfferFiltersProps) {
  return (
    <div className="border-b border-slate-300 dark:border-neutral-700 px-6 py-2.5 flex items-center gap-2">
      <div className="relative w-64">
        <HugeiconsIcon
          icon={Search01Icon}
          className="pointer-events-none absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
        />
        <Input
          placeholder="Search Candidate"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-8! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-md text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0"
        />
      </div>

      <Select
        value={selectedJobId ? String(selectedJobId) : "all"}
        onValueChange={(v) => onJobChange(v === "all" ? undefined : Number(v))}
      >
        <SelectTrigger className="w-40 h-8! bg-gray-100 cursor-pointer dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-md text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 focus-visible:ring-0 px-3">
          <SelectValue>
            {selectedJobId
              ? (jobs.find((j) => j.id === selectedJobId)?.title ??
                "Select Job")
              : "All Positions"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="rounded-md shadow-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          <SelectItem value="all">All Positions</SelectItem>
          {jobs.map((j) => (
            <SelectItem key={j.id} value={String(j.id)}>
              {j.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={statusFilter}
        onValueChange={(value) => {
          if (value !== null) onStatusChange(value);
        }}
      >
        <SelectTrigger className="w-40 h-8! bg-gray-100 cursor-pointer dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-md text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 focus-visible:ring-0 px-3">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="rounded-md shadow-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        onClick={onClear}
        className="text-slate-600 cursor-pointer dark:text-neutral-400 font-medium text-sm h-8 px-4 hover:bg-transparent hover:text-slate-900 dark:hover:text-neutral-100 border-none ml-2"
      >
        Clear All
      </Button>
    </div>
  );
}
