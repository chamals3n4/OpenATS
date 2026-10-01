"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Quiz01Icon, Time01Icon } from "@hugeicons/core-free-icons";
import { RowDeleteButton, RowEditButton } from "@/components/table/row-actions";
import { useIsManager } from "@/hooks/use-role";
import { formatDate } from "@/lib/utils";
import type { Assessment } from "@/types";

interface AssessmentCardProps {
  assessment: Assessment;
  onDelete: (assessment: Assessment) => void;
}

export function AssessmentCard({ assessment, onDelete }: AssessmentCardProps) {
  const isManager = useIsManager();
  const href = `/assessments/${assessment.id}`;
  // The list endpoint sends a count; the detail endpoint sends the questions.
  const questionCount =
    assessment.questionCount ?? assessment.questions?.length ?? 0;

  return (
    <article className="relative flex h-full cursor-pointer flex-col rounded-lg border border-slate-300 bg-white shadow-none dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold leading-snug text-slate-900 dark:text-neutral-100">
            <Link
              href={href}
              className="line-clamp-1 outline-none after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-theme"
            >
              {assessment.title}
            </Link>
          </h2>
          <p className="line-clamp-2 min-h-10 text-sm leading-5 text-slate-600 dark:text-neutral-400">
            {assessment.description || (
              <span className="text-slate-400 dark:text-neutral-500">
                No description
              </span>
            )}
          </p>
        </div>

        <ul className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
          <li
            className={`flex items-center gap-1.5 font-medium ${
              questionCount === 0
                ? "text-amber-700 dark:text-amber-400"
                : "text-slate-700 dark:text-neutral-300"
            }`}
          >
            <HugeiconsIcon icon={Quiz01Icon} className="size-4" />
            {questionCount === 0
              ? "No questions yet"
              : `${questionCount} ${questionCount === 1 ? "question" : "questions"}`}
          </li>
          <li className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-neutral-300">
            <HugeiconsIcon icon={Time01Icon} className="size-4" />
            {assessment.timeLimit} min
          </li>
        </ul>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-slate-300 px-5 py-3 dark:border-neutral-700">
        <span className="text-sm text-slate-500 dark:text-neutral-400">
          Created {formatDate(assessment.createdAt)}
        </span>
        {isManager && (
          <div className="relative z-10 flex shrink-0 items-center gap-2">
            <RowEditButton render={<Link href={href} />} />
            <RowDeleteButton onClick={() => onDelete(assessment)} />
          </div>
        )}
      </footer>
    </article>
  );
}
