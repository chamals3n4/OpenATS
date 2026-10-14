"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { useIsManager } from "@/hooks/use-role";
import { AssessmentSearchBar } from "./search-bar";
import { Button } from "@/components/ui/button";

export function AssessmentHeader({
  onCreate,
  searchTerm,
  onSearchChange,
}: {
  onCreate: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}) {
  const isManager = useIsManager();
  return (
    <div className="px-6 pt-4 pb-3 flex items-center justify-between gap-3 flex-wrap">
      <h1 className="text-2xl font-medium text-slate-900 dark:text-neutral-100 leading-none">
        Assessments
      </h1>

      <div className="flex items-center gap-2 flex-wrap">
        <AssessmentSearchBar value={searchTerm} onChange={onSearchChange} />

        {isManager && (
          <Button
            onClick={onCreate}
            className="h-9 cursor-pointer gap-2 rounded-md border-none bg-theme px-4 text-sm font-semibold text-white shadow-none hover:bg-theme-hover"
          >
            <HugeiconsIcon
              icon={PlusSignIcon}
              className="size-4"
              strokeWidth={2.5}
            />
            <span>New Assessment</span>
          </Button>
        )}
      </div>
    </div>
  );
}
