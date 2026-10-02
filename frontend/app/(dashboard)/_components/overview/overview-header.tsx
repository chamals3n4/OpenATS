"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Download05Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PERIODS, type Period } from "../../lib/overview-utils";

interface OverviewHeaderProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
  departmentId: string;
  onDepartmentChange: (id: string) => void;
  departments: { id: number; name: string }[];
  canExport: boolean;
  onExport: () => void;
}

const triggerCls =
  "h-9! w-auto min-w-44 cursor-pointer gap-2 rounded-md border border-slate-300 bg-white px-3! py-0! text-sm text-slate-800 shadow-none focus-visible:ring-0 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200";
const contentCls = "border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900";

export function OverviewHeader({
  period,
  onPeriodChange,
  departmentId,
  onDepartmentChange,
  departments,
  canExport,
  onExport,
}: OverviewHeaderProps) {
  const periodItems = PERIODS.map((p) => ({ value: p.value, label: p.label }));
  const departmentItems = [
    { value: "all", label: "All departments" },
    ...departments.map((d) => ({ value: String(d.id), label: d.name })),
  ];

  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-medium leading-none text-slate-900 dark:text-neutral-100">
          Overview
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
          How hiring is going, and what needs you today.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          items={periodItems}
          value={period}
          onValueChange={(v) => v && onPeriodChange(v as Period)}
        >
          <SelectTrigger aria-label="Time period" className={triggerCls}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={contentCls}>
            {periodItems.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={departmentItems}
          value={departmentId}
          onValueChange={(v) => v && onDepartmentChange(v)}
        >
          <SelectTrigger aria-label="Department" className={triggerCls}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={contentCls}>
            {departmentItems.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canExport && (
          <Button
            type="button"
            onClick={onExport}
            className="h-9 cursor-pointer gap-2 border-none bg-theme px-4 text-sm font-semibold text-white shadow-none hover:bg-theme-hover"
          >
            <HugeiconsIcon icon={Download05Icon} className="size-4" strokeWidth={2} />
            Export report
          </Button>
        )}
      </div>
    </header>
  );
}
