"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/job-labels";
import type { Department, Job } from "@/types";

interface JobBasicInfoProps {
  title: string;
  onTitleChange: (value: string) => void;
  departmentId: number | null;
  onDepartmentChange: (id: number | null) => void;
  employmentType: Job["employmentType"] | null;
  onEmploymentTypeChange: (type: Job["employmentType"] | null) => void;
  departments: Department[];
}

export function JobBasicInfo({
  title,
  onTitleChange,
  departmentId,
  onDepartmentChange,
  employmentType,
  onEmploymentTypeChange,
  departments,
}: JobBasicInfoProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
          Job Title
        </Label>
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Senior Software Engineer - Backend"
          className="h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
            Department
          </Label>
          <Select
            value={departmentId?.toString() ?? ""}
            onValueChange={(val) => onDepartmentChange(Number(val))}
          >
            <SelectTrigger className="w-full h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 focus:ring-0 focus:border-slate-300 dark:focus:border-neutral-600">
              <SelectValue placeholder="Select">
                {departmentId
                  ? (departments.find((d) => d.id === departmentId)?.name ??
                    null)
                  : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={String(dept.id)}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2.5">
          <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
            Employment Type
          </Label>
          <Select
            value={employmentType ?? ""}
            onValueChange={(val) =>
              onEmploymentTypeChange(val as Job["employmentType"])
            }
          >
            <SelectTrigger className="w-full h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 focus:ring-0 focus:border-slate-300 dark:focus:border-neutral-600">
              <SelectValue placeholder="Select">
                {employmentType ? EMPLOYMENT_TYPE_LABELS[employmentType] : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              {(
                Object.keys(EMPLOYMENT_TYPE_LABELS) as Job["employmentType"][]
              ).map((value) => (
                <SelectItem key={value} value={value}>
                  {EMPLOYMENT_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
