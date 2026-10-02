"use client";

import { Label } from "@/components/ui/label";
import { JobDescriptionEditor } from "@/components/dynamic-imports";

interface JobDescriptionSectionProps {
  value: string;
  onChange: (value: string) => void;
}

export function JobDescriptionSection({
  value,
  onChange,
}: JobDescriptionSectionProps) {
  return (
    <div className="space-y-2.5">
      <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
        Job Description
      </Label>
      <JobDescriptionEditor
        value={value}
        onChange={onChange}
        placeholder="Type here..."
        minHeightClassName="min-h-[260px]"
      />
    </div>
  );
}
