"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PipelineStage } from "@/types";
import {
  APPLIED_OPTIONS,
  IN_STAGE_OPTIONS,
  STATUS_OPTIONS,
  activeFilterCount,
  type BoardFilters,
} from "../lib/board-filters";

interface BoardFiltersBarProps {
  filters: BoardFilters;
  stages: PipelineStage[];
  onChange: (patch: Partial<BoardFilters>) => void;
  onClear: () => void;
}

const triggerCls =
  "h-9! w-auto min-w-40 cursor-pointer gap-2 rounded-md border border-slate-300 bg-gray-100 px-3! py-0! text-sm text-slate-800 shadow-none focus-visible:ring-0 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200";

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <Select items={options} value={value} onValueChange={(v) => v && onChange(v as T)}>
      <SelectTrigger aria-label={label} className={triggerCls}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function BoardFiltersBar({ filters, stages, onChange, onClear }: BoardFiltersBarProps) {
  const count = activeFilterCount(filters);
  const shownStages = filters.stageIds.length;
  const stagesLabel =
    shownStages === 0 || shownStages === stages.length
      ? "All stages"
      : `${shownStages} of ${stages.length} stages`;

  const toggleStage = (id: number, on: boolean) => {
    const next = on ? [...filters.stageIds, id] : filters.stageIds.filter((s) => s !== id);
    // Picking every stage is the same as no filter, so keep the state in one form.
    onChange({ stageIds: next.length === stages.length ? [] : next });
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-300 bg-white px-4 py-2.5 sm:px-6 dark:border-neutral-700 dark:bg-neutral-950">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Stages shown"
          className={`${triggerCls} inline-flex items-center justify-between outline-none`}
        >
          {stagesLabel}
          <HugeiconsIcon icon={ArrowDown01Icon} className="size-4 text-slate-500 dark:text-neutral-400" strokeWidth={2} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            {stages.map((stage) => (
              <DropdownMenuCheckboxItem
                key={stage.id}
                checked={shownStages === 0 || filters.stageIds.includes(stage.id)}
                closeOnClick={false}
                onCheckedChange={(on) => {
                  // From "all stages", the first click means "just the others".
                  if (shownStages === 0) {
                    onChange({ stageIds: stages.filter((s) => s.id !== stage.id).map((s) => s.id) });
                  } else {
                    toggleStage(stage.id, on);
                  }
                }}
              >
                {stage.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <FilterSelect
        label="Status"
        value={filters.status}
        options={STATUS_OPTIONS}
        onChange={(status) => onChange({ status })}
      />
      <FilterSelect
        label="Applied"
        value={filters.applied}
        options={APPLIED_OPTIONS}
        onChange={(applied) => onChange({ applied })}
      />
      <FilterSelect
        label="Time in stage"
        value={filters.inStage}
        options={IN_STAGE_OPTIONS}
        onChange={(inStage) => onChange({ inStage })}
      />

      {count > 0 && (
        <Button
          type="button"
          variant="ghost"
          onClick={onClear}
          className="h-9 cursor-pointer px-3 text-sm text-slate-700 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Clear filters ({count})
        </Button>
      )}
    </div>
  );
}
