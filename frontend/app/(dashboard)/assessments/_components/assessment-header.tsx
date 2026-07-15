"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { ThemeButton } from "@/components/theme/theme-button";
import { useIsManager } from "@/hooks/use-role";
import { AssessmentSearchBar } from "./search-bar";

export function AssessmentHeader() {
  const isManager = useIsManager();
  return (
    <div className="px-6 pt-4 pb-3 flex items-center justify-between gap-3 flex-wrap">
      <h1 className="text-2xl font-medium text-slate-900 dark:text-neutral-100 leading-none">
        Assessments
      </h1>

      <div className="flex items-center gap-2 flex-wrap">
        <AssessmentSearchBar />

        {isManager && (
          <ThemeButton
            asChild
            href="/assessments/new"
            prefetch
            className="h-8 px-4 gap-2 text-sm shadow-none border-none"
          >
            <HugeiconsIcon
              icon={PlusSignIcon}
              className="size-4"
              strokeWidth={2.5}
            />
            <span>New Assessment</span>
          </ThemeButton>
        )}
      </div>
    </div>
  );
}
