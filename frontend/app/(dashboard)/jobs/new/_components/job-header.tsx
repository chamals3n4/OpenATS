"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface JobHeaderProps {
  isActive: boolean;
  onActiveChange: (value: boolean) => void;
}

export function JobHeader({ isActive, onActiveChange }: JobHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-10">
      <div className="flex items-center gap-4">
        <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Create New Job
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="job-active"
          checked={isActive}
          onCheckedChange={onActiveChange}
          className="data-checked:bg-theme scale-110"
        />
        <Label
          htmlFor="job-active"
          className="text-sm font-medium text-slate-600 dark:text-neutral-400 cursor-pointer pl-1"
        >
          Make This Job Active
        </Label>
      </div>
    </div>
  );
}
