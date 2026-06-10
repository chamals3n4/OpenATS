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
import { CandidateStatusFilter, getStatusLabel } from "../libs/candidate-utils";

interface CandidateFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedJobId: number | undefined;
  onJobChange: (id: number | undefined) => void;
  selectedStatus: CandidateStatusFilter;
  onStatusChange: (status: CandidateStatusFilter) => void;
  jobs: Job[];
  onClear: () => void;
}

const STATUS_OPTIONS: CandidateStatusFilter[] = ["all", "active", "rejected"];

export function CandidateFilters({
  search,
  onSearchChange,
  selectedJobId,
  onJobChange,
  selectedStatus,
  onStatusChange,
  jobs,
  onClear,
}: CandidateFiltersProps) {
  return (
    <div className="border-y border-slate-300 dark:border-neutral-700 px-8 py-3.5 flex items-center gap-4">
      <div className="relative w-80">
        <HugeiconsIcon
          icon={Search01Icon}
          className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
        />
        <Input
          placeholder="Search Candidate"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-11 h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0"
        />
      </div>

      <Select
        value={selectedJobId ? String(selectedJobId) : "all"}
        onValueChange={(v) => onJobChange(v === "all" ? undefined : Number(v))}
      >
        <SelectTrigger className="w-62 h-10! bg-gray-100 cursor-pointer dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 focus-visible:ring-0 px-3">
          <SelectValue>
            {selectedJobId
              ? (jobs.find((j) => j.id === selectedJobId)?.title ??
                "Select Job")
              : "All Positions"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="rounded-lg shadow-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          <SelectItem value="all">All Positions</SelectItem>
          {jobs.map((j) => (
            <SelectItem key={j.id} value={String(j.id)}>
              {j.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedStatus}
        onValueChange={(value) =>
          onStatusChange(value as CandidateStatusFilter)
        }
      >
        <SelectTrigger className="w-44 h-10! bg-gray-100 cursor-pointer dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 focus-visible:ring-0 px-3">
          <SelectValue>{getStatusLabel(selectedStatus)}</SelectValue>
        </SelectTrigger>
        <SelectContent className="rounded-lg shadow-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          {STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {getStatusLabel(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        onClick={onClear}
        className="text-slate-600 cursor-pointer dark:text-neutral-400 font-medium text-sm h-10 px-4 hover:bg-transparent hover:text-slate-900 dark:hover:text-neutral-100 border-none ml-2"
      >
        Clear All
      </Button>
    </div>
  );
}
