"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ChartEvaluationIcon } from "@hugeicons/core-free-icons";
import { formatDate } from "../constants";

interface ScoresSectionProps {
  assessmentsData: any;
  onViewAttempt: (id: number) => void;
}

export function ScoresSection({
  assessmentsData,
  onViewAttempt,
}: ScoresSectionProps) {
  const attempts = assessmentsData?.data ?? [];

  if (!assessmentsData) {
    return (
      <div className="p-5 sm:p-6">
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
            Assessments
          </h3>
          <p className="text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
            Test results and evaluation scores
          </p>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-2.5 text-slate-400 dark:text-neutral-500">
            <div className="size-4 border-2 border-slate-300 dark:border-neutral-600 border-t-slate-400 rounded-full animate-spin" />
            <p className="text-sm font-medium">Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="p-5 sm:p-6">
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
            Assessments
          </h3>
          <p className="text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
            Test results and evaluation scores
          </p>
        </div>
        <div className="rounded-md border border-dashed border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/30 px-6 py-12 text-center">
          <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
            <HugeiconsIcon
              icon={ChartEvaluationIcon}
              className="size-5 text-slate-300 dark:text-neutral-600"
            />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-neutral-400">
            No assessments yet
          </p>
          <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1 max-w-[280px] mx-auto">
            Assessment results will appear here once the candidate completes an
            assessment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
          Assessments
        </h3>
        <p className="text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
          Test results and evaluation scores
        </p>
      </div>
      <div className="space-y-3">
        {attempts.map((a: any) => {
          const statusStyles: Record<
            string,
            { bg: string; text: string; label: string }
          > = {
            pending: {
              bg: "bg-amber-50 dark:bg-amber-950/25",
              text: "text-amber-600 dark:text-amber-400",
              label: "Pending",
            },
            started: {
              bg: "bg-blue-50 dark:bg-blue-950/25",
              text: "text-blue-600 dark:text-blue-400",
              label: "In Progress",
            },
            completed: {
              bg: "bg-green-50 dark:bg-green-950/25",
              text: "text-green-700 dark:text-green-400",
              label: "Completed",
            },
            expired: {
              bg: "bg-slate-100 dark:bg-neutral-800",
              text: "text-slate-500 dark:text-neutral-400",
              label: "Expired",
            },
          };
          const s = statusStyles[a.status] ?? statusStyles.pending;

          return (
            <div
              key={a.id}
              className="rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-neutral-800/50 border-b border-slate-100 dark:border-neutral-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <HugeiconsIcon
                    icon={ChartEvaluationIcon}
                    className="size-4 text-slate-400 shrink-0"
                  />
                  <p className="text-sm font-semibold text-slate-800 dark:text-neutral-200 truncate">
                    {a.assessmentTitle}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${s.bg} ${s.text}`}
                >
                  {s.label}
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-neutral-800">
                {a.completedAt && (
                  <div className="px-4 py-3 flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-500 font-medium">
                      Completed
                    </span>
                    <span className="text-sm text-slate-700 dark:text-neutral-300 font-medium">
                      {formatDate(a.completedAt)}
                    </span>
                  </div>
                )}
                {a.status === "completed" && (
                  <div className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onViewAttempt(a.id)}
                      className="text-sm cursor-pointer text-[var(--theme-color)] font-semibold hover:underline"
                    >
                      View candidate answers
                    </button>
                  </div>
                )}
                {a.status === "pending" && (
                  <div className="px-4 py-3 flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-500 font-medium">
                      Link expires
                    </span>
                    <span className="text-sm text-slate-700 dark:text-neutral-300 font-medium">
                      {formatDate(a.expiresAt)}
                    </span>
                  </div>
                )}
                {(a.status === "pending" || a.status === "started") && (
                  <div className="px-4 py-3">
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/assessment/${a.token}`;
                        navigator.clipboard.writeText(url);
                      }}
                      className="text-xs text-[var(--theme-color)] font-semibold hover:underline"
                    >
                      Copy assessment link
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
