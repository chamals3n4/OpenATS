"use client";

import dynamic from "next/dynamic";
import { Label } from "@/components/ui/label";

// Load the editor only in the browser
const JobDescriptionEditor = dynamic(
  () => import("../job-description-editor").then((mod) => ({ default: mod.JobDescriptionEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[260px] border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 flex items-center justify-center">
        <p className="text-[13px] text-slate-500 dark:text-neutral-500">
          Loading editor…
        </p>
      </div>
    ),
  },
);

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
