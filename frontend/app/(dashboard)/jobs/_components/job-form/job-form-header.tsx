"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface JobFormHeaderProps {
  mode: "create" | "edit";
  isActive: boolean;
  onActiveChange: (value: boolean) => void;
}

export function JobFormHeader({
  mode,
  isActive,
  onActiveChange,
}: JobFormHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-10">
      <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
        {mode === "create" ? "Create New Job" : "Edit Job"}
      </h1>

      {mode === "create" ? (
        <p className="text-sm font-medium text-slate-500 dark:text-neutral-400">
          Saved as a draft — publish it from the job page when you&apos;re
          ready.
        </p>
      ) : (
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
      )}
    </div>
  );
}
