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
  return (
    <div className="flex flex-col border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 shadow-sm">
      {/* Card body */}
      <div className="flex flex-col gap-2.5 px-5 pt-5 pb-4">
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
      <div className="flex items-center gap-1.5 px-4 py-3 border-t border-slate-100 dark:border-neutral-800">
        <Button
          asChild
          className="h-[34px] rounded-md border-none px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-red-500 cursor-pointer"
        >
          <Link href={`/assessments/${assessment.id}`}>Edit</Link>
        </Button>
        <Button
          onClick={() => onDelete(assessment)}
          className="inline-flex h-[34px] rounded-md border-none bg-red-500 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-red-500 cursor-pointer"
        >
          <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}
