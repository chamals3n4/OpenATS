"use client";

import { useState } from "react";
import { useInterviews } from "@/hooks/queries/use-interviews";
import {
  InterviewCalendar,
  type InterviewForCalendar,
} from "@/components/interview-calendar";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar02Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

const OUTCOME_STYLES: Record<string, string> = {
  pending:
    "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
  pass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
  fail: "bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400",
};

function fmtTime(s: string) {
  return new Date(s).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function InterviewsPage() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const { data } = useInterviews();
  const interviews = data?.data ?? [];

  const calendarData: InterviewForCalendar[] = interviews.map((iv) => ({
    id: iv.id,
    candidateId: iv.candidateId,
    scheduledAt: iv.scheduledAt,
    outcome: iv.outcome,
    candidateName: iv.candidateName,
    jobTitle: iv.jobTitle,
    stageName: iv.stageName,
  }));

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-bold leading-tight text-slate-950 dark:text-neutral-50">
                Interviews
              </h1>
              <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-neutral-400">
                {interviews.length} scheduled interview
                {interviews.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* View toggle: List / Calendar */}
              <div className="flex rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-0.5">
                <button
                  onClick={() => setView("list")}
                  className={`inline-flex h-[34px] items-center gap-2 rounded-md px-4 text-[14px] font-semibold leading-none transition-colors ${
                    view === "list"
                      ? "bg-[var(--theme-color)] text-white shadow-none"
                      : "bg-transparent text-slate-600 dark:text-neutral-400 hover:text-slate-800"
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setView("calendar")}
                  className={`inline-flex h-[34px] items-center gap-2 rounded-md px-4 text-[14px] font-semibold leading-none transition-colors ${
                    view === "calendar"
                      ? "bg-[var(--theme-color)] text-white shadow-none"
                      : "bg-transparent text-slate-600 dark:text-neutral-400 hover:text-slate-800"
                  }`}
                >
                  <HugeiconsIcon icon={Calendar02Icon} className="size-4" />
                  Calendar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 py-5 sm:px-6">
          {view === "calendar" ? (
            <InterviewCalendar interviews={calendarData} />
          ) : interviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-6 py-16 text-center">
              <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                <HugeiconsIcon
                  icon={Calendar02Icon}
                  className="size-5 text-slate-300 dark:text-neutral-600"
                />
              </div>
              <p className="text-[14px] font-semibold text-slate-500 dark:text-neutral-400">
                No interviews yet
              </p>
              <p className="text-[12px] text-slate-400 dark:text-neutral-500 mt-1">
                Schedule interviews from a candidate&apos;s detail page.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {interviews.map((iv) => (
                <Link
                  key={iv.id}
                  href={`/candidates/${iv.candidateId}`}
                  className="block rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 hover:border-slate-300 dark:hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[15px] font-bold text-slate-900 dark:text-neutral-100 truncate">
                          {iv.candidateName}
                        </span>
                        <Badge
                          className={`${OUTCOME_STYLES[iv.outcome] ?? OUTCOME_STYLES.pending} rounded-md border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-none`}
                        >
                          {iv.outcome}
                        </Badge>
                      </div>
                      <p className="text-[13px] text-slate-500 dark:text-neutral-400">
                        {iv.jobTitle}
                        {iv.stageName ? ` · ${iv.stageName}` : ""}
                      </p>
                    </div>
                    {iv.scheduledAt && (
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700 dark:text-neutral-300">
                          <HugeiconsIcon
                            icon={Clock01Icon}
                            className="size-3.5 text-slate-400"
                          />
                          {fmtTime(iv.scheduledAt)}
                        </span>
                        <span className="text-[12px] text-slate-400 dark:text-neutral-500">
                          {fmtDate(iv.scheduledAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
