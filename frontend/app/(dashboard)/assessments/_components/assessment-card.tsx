"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete02Icon,
  QuestionIcon,
  Time01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import type { Assessment } from "@/types";
import { useIsManager } from "@/hooks/use-role";

interface AssessmentCardProps {
  assessment: Assessment;
  onDelete: (assessment: Assessment) => void;
  onInvite: (assessment: Assessment) => void;
}

export function AssessmentCard({
  assessment,
  onDelete,
  onInvite,
}: AssessmentCardProps) {
  const isManager = useIsManager();
  return (
    <div className="flex flex-col border border-slate-200 dark:border-neutral-800 rounded-md bg-white dark:bg-neutral-900 shadow-sm">
      {/* Card body */}
      <div className="flex flex-col gap-2 px-4 pt-4 pb-3">
        <Link
          href={`/assessments/${assessment.id}`}
          className="text-[15px] font-semibold text-slate-800 dark:text-neutral-200 leading-snug hover:underline underline-offset-4 decoration-1 truncate"
        >
          {assessment.title}
        </Link>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center text-[12px] font-medium px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
            Active
          </span>
          <span className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1 text-[12px] text-slate-400">
              <HugeiconsIcon icon={QuestionIcon} className="size-3.5" />
              {assessment.questions?.length || 0}
            </span>
            <span className="flex items-center gap-1 text-[12px] text-slate-400">
              <HugeiconsIcon icon={Time01Icon} className="size-3.5" />
              {assessment.timeLimit}m
            </span>
          </span>
        </div>
      </div>

      {/* Card footer */}
      {isManager && (
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-t border-slate-100 dark:border-neutral-800">
          <Button
            render={<Link href={`/assessments/${assessment.id}`} />}
            className="h-8 rounded-md border-none px-4 text-sm font-semibold leading-none text-white shadow-none hover:bg-red-500 cursor-pointer"
          >
            Edit
          </Button>
          <Button
            onClick={() => onDelete(assessment)}
            className="inline-flex h-8 rounded-md border-none bg-red-500 px-4 text-sm font-semibold leading-none text-white shadow-none hover:bg-red-500 cursor-pointer"
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}
