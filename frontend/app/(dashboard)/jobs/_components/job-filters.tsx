"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Department } from "@/types";
import { EMPLOYMENT_TYPE_LABELS, STATUS_LABELS } from "@/lib/job-labels";
import { useIsManager } from "@/hooks/use-role";

interface JobFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterDept: string;
  onDeptChange: (value: string) => void;
  filterType: string;
  onTypeChange: (value: string) => void;
  filterStatus: string;
  onStatusChange: (value: string) => void;
  departments: Department[];
  departmentNameById: Map<number, string>;
  onClear: () => void;
}

export function JobFilters({
  searchTerm,
  onSearchChange,
  filterDept,
  onDeptChange,
  filterType,
  onTypeChange,
  filterStatus,
  onStatusChange,
  departments,
  departmentNameById,
  onClear,
}: JobFiltersProps) {
  const isManager = useIsManager();
  return (
    <div className="border-b border-slate-300 dark:border-neutral-700 px-6 py-2.5 flex items-center gap-2">
      <div className="relative w-64">
        <HugeiconsIcon
          icon={Search01Icon}
          className="pointer-events-none absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
        />
        <Input
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-8! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-md text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0"
        />
      </div>

      <Select
        value={filterDept}
        onValueChange={(value) => {
          if (value !== null) onDeptChange(value);
        }}
      >
        <SelectTrigger className="w-40 h-8! bg-gray-100 cursor-pointer dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-md text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 focus-visible:ring-0 px-3">
          <SelectValue>
            {filterDept === "all"
              ? "All Departments"
              : (departmentNameById.get(Number(filterDept)) ?? "Department")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          align="start"
          className="w-60 rounded-lg shadow-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
        >
          <SelectItem value="all">All Departments</SelectItem>
          {departments.map((dept) => (
            <SelectItem key={dept.id} value={String(dept.id)}>
              {dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filterType}
        onValueChange={(value) => {
          if (value !== null) onTypeChange(value);
        }}
      >
        <SelectTrigger className="w-40 h-8! cursor-pointer bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-md text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 focus-visible:ring-0 px-3">
          <SelectValue>
            {filterType === "all"
              ? "All Types"
              : (EMPLOYMENT_TYPE_LABELS[
                  filterType as keyof typeof EMPLOYMENT_TYPE_LABELS
                ] ?? filterType)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          align="start"
          className="rounded-lg shadow-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
        >
          <SelectItem value="all">All Types</SelectItem>
          {(
            Object.keys(EMPLOYMENT_TYPE_LABELS) as Array<
              keyof typeof EMPLOYMENT_TYPE_LABELS
            >
          ).map((type) => (
            <SelectItem key={type} value={type}>
              {EMPLOYMENT_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filterStatus}
        onValueChange={(value) => {
          if (value !== null) onStatusChange(value);
        }}
      >
        <SelectTrigger className="w-40 h-8! bg-gray-100 cursor-pointer dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-md text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 focus-visible:ring-0 px-3">
          <SelectValue>
            {filterStatus === "all"
              ? "All Status"
              : (STATUS_LABELS[filterStatus as keyof typeof STATUS_LABELS] ??
                filterStatus)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          align="start"
          className="rounded-lg shadow-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
        >
          <SelectItem value="all">All Status</SelectItem>
          {(
            Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>
          ).map((status) => (
            <SelectItem key={status} value={status}>
              {STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        onClick={onClear}
        className="ml-2 h-8 rounded-md border border-slate-300 dark:border-neutral-600 bg-transparent hover:bg-slate-50 dark:hover:bg-neutral-900/50 px-4 text-sm font-semibold leading-none text-slate-700 dark:text-neutral-300 shadow-none cursor-pointer"
      >
        Clear All
      </Button>

      {isManager && (
        <div className="ml-auto">
          <Button
            render={<Link href="/jobs/new" prefetch />}
            className="h-8 rounded-md border-none bg-[var(--theme-color)] px-4 text-sm font-semibold leading-none text-white shadow-none hover:bg-[var(--theme-color-hover)] cursor-pointer"
          >
            <HugeiconsIcon
              icon={PlusSignIcon}
              className="size-4"
              strokeWidth={2.5}
            />
            <span>Create New Job</span>
          </Button>
        </div>
      )}
    </div>
  );
}
