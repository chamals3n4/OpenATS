"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { ThemeButton } from "@/components/theme-button";

export function AssessmentHeader() {
  return (
    <div className="px-8 py-4 flex items-center justify-between">
      <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
        Assessments
      </h1>
      <ThemeButton
        asChild
        href="/assessments/new"
        prefetch
        className="h-10 px-4 gap-2 text-sm shadow-none border-none"
      >
        <HugeiconsIcon
          icon={PlusSignIcon}
          className="size-4"
          strokeWidth={2.5}
        />
        <span>New Assessment</span>
      </ThemeButton>
    </div>
  );
}
