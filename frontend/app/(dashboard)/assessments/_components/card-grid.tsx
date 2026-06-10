"use client";

import { ListSectionSpinner } from "@/components/dashboard-main-loading";
import type { Assessment } from "@/types";
import { AssessmentCard } from "./assessment-card";

interface AssessmentCardGridProps {
  assessments: Assessment[];
  isLoading: boolean;
  onDelete: (assessment: Assessment) => void;
  onInvite: (assessment: Assessment) => void;
}

export function AssessmentCardGrid({
  assessments,
  isLoading,
  onDelete,
  onInvite,
}: AssessmentCardGridProps) {
  return (
    <div className="px-8 py-6">
      {isLoading ? (
        <ListSectionSpinner />
      ) : assessments.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          No assessments found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {assessments.map((assessment) => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              onDelete={onDelete}
              onInvite={onInvite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
