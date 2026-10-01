"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RowDeleteButton, RowEditButton } from "@/components/table/row-actions";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  QuestionIcon,
  Time01Icon,
} from "@hugeicons/core-free-icons";
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
  const router = useRouter();
  return (
    <div
      onClick={() => router.push(`/assessments/${assessment.id}`)}
      className="flex cursor-pointer flex-col rounded-md border border-slate-300 bg-white shadow-none transition-[border-color] duration-500 ease-in-out hover:border-theme dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-primary motion-reduce:transition-none"
    >
      {/* Card body */}
      <div className="flex flex-col gap-2 px-4 pt-4 pb-3">
        <Link
          href={`/assessments/${assessment.id}`}
          className="text-sm font-semibold text-slate-800 dark:text-neutral-200 leading-snug hover:underline underline-offset-4 decoration-1 truncate"
        >
          {assessment.title}
        </Link>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
            Active
          </span>
          <span className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <HugeiconsIcon icon={QuestionIcon} className="size-3.5" />
              {assessment.questions?.length || 0}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <HugeiconsIcon icon={Time01Icon} className="size-3.5" />
              {assessment.timeLimit}m
            </span>
          </span>
        </div>
      </div>

      {/* Card footer */}
      {isManager && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 px-4 py-2.5 border-t border-slate-200 dark:border-neutral-800"
        >
          <RowEditButton render={<Link href={`/assessments/${assessment.id}`} />} />
          <RowDeleteButton onClick={() => onDelete(assessment)} />
        </div>
      )}
    </div>
  );
}
