"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { ListSectionSpinner } from "@/components/dashboard-main-loading";
import { Button } from "@/components/ui/button";
import { ThemeButton } from "@/components/theme/theme-button";
import { useIsManager } from "@/hooks/use-role";
import type { Assessment } from "@/types";
import { AssessmentCard } from "./assessment-card";

interface AssessmentCardGridProps {
  assessments: Assessment[];
  isLoading: boolean;
  searchTerm: string;
  onClearSearch: () => void;
  onCreate: () => void;
  onDelete: (assessment: Assessment) => void;
}

export function AssessmentCardGrid({
  assessments,
  isLoading,
  searchTerm,
  onClearSearch,
  onCreate,
  onDelete,
}: AssessmentCardGridProps) {
  const isManager = useIsManager();
  const term = searchTerm.trim();

  return (
    <div className="px-6 py-4">
      {isLoading ? (
        <ListSectionSpinner />
      ) : assessments.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 px-6 text-center dark:border-neutral-700">
          <div>
            <p className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
              {term ? "No assessments match your search" : "No assessments yet"}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
              {term
                ? `Nothing found for "${term}". Try a different word.`
                : "Create an assessment to test candidates with your own questions."}
            </p>
          </div>
          {term ? (
            <Button
              variant="cancel"
              onClick={onClearSearch}
              className="h-9 px-4 text-sm"
            >
              Clear search
            </Button>
          ) : (
            isManager && (
              <ThemeButton
                onClick={onCreate}
                className="h-9 gap-2 border-none px-4 text-sm shadow-none"
              >
                <HugeiconsIcon
                  icon={PlusSignIcon}
                  className="size-4"
                  strokeWidth={2.5}
                />
                New Assessment
              </ThemeButton>
            )
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {assessments.map((assessment) => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
