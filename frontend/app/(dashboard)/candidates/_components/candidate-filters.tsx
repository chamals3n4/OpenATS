"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  Briefcase01Icon,
  Cancel01Icon,
  FilterHorizontalIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Job } from "@/types";
import { getStatusLabel, type CandidateStatusFilter } from "../lib/candidate-utils";
import {
  FLAG_LABELS,
  FLAG_ORDER,
  activeFilterChips,
  clearFilter,
  filtersMenuCount,
  type CandidateFilterState,
  type CandidateSort,
  type FlagChoice,
} from "../lib/candidate-filter-state";

export type { CandidateSort, FlagChoice } from "../lib/candidate-filter-state";

interface CandidateFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  jobs: Job[];
  value: CandidateFilterState;
  onChange: (next: CandidateFilterState) => void;
  /** Interviewers cannot filter by score, which would give away scores hidden from them. */
  hideScoreFilters?: boolean;
  onClear: () => void;
}

const STATUS_OPTIONS: CandidateStatusFilter[] = ["all", "active", "rejected"];

const SORT_LABELS: Record<CandidateSort, string> = {
  newest: "Newest first",
  score: "Highest score",
};

const triggerCls =
  "h-8! cursor-pointer rounded-md border border-slate-300 bg-gray-100 px-3 text-sm text-slate-800 shadow-none focus:ring-0 focus-visible:ring-0 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200";

const barButtonCls = "h-8 gap-2 px-3 text-sm";

/** A searchable list of positions. Choosing one shows as a chip, so it stays visible and can be removed. */
function PositionPicker({
  jobs,
  jobId,
  onSelect,
}: {
  jobs: Job[];
  jobId: number | undefined;
  onSelect: (jobId: number | undefined) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="cancel"
            aria-label="Choose a position"
            className={`${barButtonCls} ${jobId ? "border-theme bg-theme/10" : ""}`}
          />
        }
      >
        <HugeiconsIcon icon={Briefcase01Icon} className="size-4" strokeWidth={1.75} />
        Position
        <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5 opacity-60" strokeWidth={2} />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search positions..." />
          <CommandList>
            <CommandEmpty>No positions found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="All positions"
                data-checked={jobId === undefined}
                onSelect={() => {
                  onSelect(undefined);
                  setOpen(false);
                }}
              >
                All positions
              </CommandItem>
              {jobs.map((job) => (
                <CommandItem
                  key={job.id}
                  value={`${job.title} ${job.id}`}
                  data-checked={job.id === jobId}
                  onSelect={() => {
                    onSelect(job.id);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{job.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** The minimum score box. It applies once typing pauses, so "7" then "70" is one search. */
function MinScoreField({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));

  useEffect(() => {
    const t = setTimeout(() => {
      const parsed = draft.trim() === "" ? NaN : Number(draft);
      const next = Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : undefined;
      if (next !== value) onChange(next);
    }, 350);
    return () => clearTimeout(t);
  }, [draft, value, onChange]);

  return (
    <Input
      id="filter-min-score"
      type="number"
      inputMode="numeric"
      min={0}
      max={100}
      placeholder="e.g. 70"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      className="h-8! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-md text-sm focus-visible:ring-0"
    />
  );
}

function FiltersMenu({
  value,
  onChange,
  hideScoreFilters,
}: {
  value: CandidateFilterState;
  onChange: (next: CandidateFilterState) => void;
  hideScoreFilters?: boolean | undefined;
}) {
  // The score filters are hidden for interviewers, so they are not counted either.
  const count = filtersMenuCount(hideScoreFilters ? { ...value, minScore: undefined, fullyScored: false } : value);
  const label = (text: string) => (
    <p className="mb-1.5 text-xs font-medium text-slate-600 dark:text-neutral-400">{text}</p>
  );

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="cancel"
            aria-label={count > 0 ? `Filters, ${count} on` : "Filters"}
            className={`${barButtonCls} ${count > 0 ? "border-theme bg-theme/10" : ""}`}
          />
        }
      >
        <HugeiconsIcon icon={FilterHorizontalIcon} className="size-4" strokeWidth={1.75} />
        Filters
        {count > 0 && (
          <span className="rounded-full bg-theme px-1.5 text-[11px] font-semibold leading-5 text-white">{count}</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 gap-4" align="start">
        <div>
          {label("Status")}
          <Select
            value={value.status}
            onValueChange={(v) => onChange({ ...value, status: v as CandidateStatusFilter })}
          >
            <SelectTrigger aria-label="Status" className={`${triggerCls} w-full`}>
              <SelectValue>{getStatusLabel(value.status)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {getStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          {label("Flags")}
          <Select value={value.flag} onValueChange={(v) => onChange({ ...value, flag: v as FlagChoice })}>
            <SelectTrigger aria-label="Filter by flag" className={`${triggerCls} w-full`}>
              <SelectValue>{FLAG_LABELS[value.flag]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {FLAG_ORDER.map((flag) => (
                <SelectItem key={flag} value={flag}>
                  {FLAG_LABELS[flag]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!hideScoreFilters && (
          <>
            <div>
              <label htmlFor="filter-min-score" className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-neutral-400">
                Minimum score
              </label>
              <MinScoreField value={value.minScore} onChange={(minScore) => onChange({ ...value, minScore })} />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800 dark:text-neutral-200">
              <Checkbox
                variant="theme"
                checked={value.fullyScored}
                onCheckedChange={(checked) => onChange({ ...value, fullyScored: !!checked })}
              />
              All parts scored
            </label>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function CandidateFilters({
  search,
  onSearchChange,
  jobs,
  value,
  onChange,
  hideScoreFilters,
  onClear,
}: CandidateFiltersProps) {
  const chips = activeFilterChips(value, jobs).filter(
    (chip) => !(hideScoreFilters && (chip.key === "minScore" || chip.key === "fullyScored")),
  );

  return (
    <div className="flex flex-col gap-2 border-b border-slate-300 px-4 py-2.5 sm:px-6 dark:border-neutral-700">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
          />
          <Input
            placeholder="Search Candidate"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-8! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-md text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:ring-0"
          />
        </div>

        <PositionPicker jobs={jobs} jobId={value.jobId} onSelect={(jobId) => onChange({ ...value, jobId })} />
        <FiltersMenu value={value} onChange={onChange} hideScoreFilters={hideScoreFilters} />

        <Select value={value.sort} onValueChange={(v) => onChange({ ...value, sort: v as CandidateSort })}>
          <SelectTrigger aria-label="Sort candidates" className={`${triggerCls} w-40`}>
            <SelectValue>{SORT_LABELS[value.sort]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as CandidateSort[]).map((sort) => (
              <SelectItem key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-theme/30 bg-theme/10 py-0.5 pl-3 pr-1 text-xs font-medium text-slate-900 dark:text-neutral-100"
            >
              <span className="truncate">{chip.label}</span>
              <button
                type="button"
                aria-label={`Remove filter: ${chip.label}`}
                onClick={() => onChange(clearFilter(value, chip.key))}
                className="flex size-5 cursor-pointer items-center justify-center rounded-full text-slate-600 hover:bg-theme/20 dark:text-neutral-300"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3" strokeWidth={2.5} />
              </button>
            </span>
          ))}
          <Button
            type="button"
            variant="ghost"
            onClick={onClear}
            className="h-6 px-2 text-xs font-medium text-slate-600 hover:bg-transparent hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
