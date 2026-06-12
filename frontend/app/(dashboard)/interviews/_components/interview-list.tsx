"use client";

import { useMemo } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Clock01Icon,
  PencilEdit01Icon,
  Message02Icon,
} from "@hugeicons/core-free-icons";
import {
  STATUS_CONFIG,
  OUTCOME_CONFIG,
  fmtTime,
  fmtDateLong,
} from "./constants";

interface InterviewListProps {
  interviews: any[];
  onFeedback: (iv: any) => void;
  onEdit: (iv: any) => void;
}

export function InterviewList({
  interviews,
  onFeedback,
  onEdit,
}: InterviewListProps) {
  const grouped = useMemo(() => {
    const m: Record<string, any[]> = {};
    interviews.forEach((iv) => {
      const key = iv.scheduledAt
        ? new Date(iv.scheduledAt).toDateString()
        : "__no_date__";
      if (!m[key]) m[key] = [];
      m[key].push(iv);
    });
    return m;
  }, [interviews]);

  const sortedGroupKeys = Object.keys(grouped).sort((a, b) => {
    if (a === "__no_date__") return 1;
    if (b === "__no_date__") return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  return (
    <div className="space-y-4">
      {sortedGroupKeys.map((dateKey) => {
        const dayInterviews = grouped[dateKey];
        const isToday =
          dateKey !== "__no_date__" &&
          new Date(dateKey).toDateString() === new Date().toDateString();
        const isTomorrow =
          dateKey !== "__no_date__" &&
          (() => {
            const t = new Date();
            t.setDate(t.getDate() + 1);
            return new Date(dateKey).toDateString() === t.toDateString();
          })();

        const dayLabel =
          dateKey === "__no_date__"
            ? "Not Scheduled"
            : isToday
              ? "Today"
              : isTomorrow
                ? "Tomorrow"
                : fmtDateLong(new Date(dateKey).toISOString());

        const dateSubLabel =
          dateKey !== "__no_date__" && !isToday && !isTomorrow
            ? new Date(dateKey).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : dateKey !== "__no_date__"
              ? fmtDateLong(new Date(dateKey).toISOString())
              : null;

        return (
          <div key={dateKey}>
            {/* Date group header */}
            <div className="flex items-center gap-3 mb-2.5">
              <div className="flex items-center gap-2">
                {isToday && (
                  <span className="size-2 rounded-full bg-[var(--theme-color)] animate-pulse" />
                )}
                <span
                  className={`text-[13px] font-bold ${isToday ? "text-[var(--theme-color)]" : "text-slate-500 dark:text-neutral-400"}`}
                >
                  {dayLabel}
                </span>
                {dateSubLabel && !isToday && !isTomorrow && (
                  <span className="text-[13px] text-slate-400 dark:text-neutral-500">
                    ·
                  </span>
                )}
                {dateSubLabel && !isToday && !isTomorrow && (
                  <span className="text-[12px] text-slate-400 dark:text-neutral-500">
                    {dateSubLabel}
                  </span>
                )}
                {(isToday || isTomorrow) && dateSubLabel && (
                  <span className="text-[12px] text-slate-400 dark:text-neutral-500">
                    {dateSubLabel}
                  </span>
                )}
              </div>
              <div className="flex-1 h-px bg-slate-100 dark:bg-neutral-800" />
              <span className="text-[12px] font-medium text-slate-400 dark:text-neutral-500">
                {dayInterviews.length} interview
                {dayInterviews.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Interview cards */}
            <div className="space-y-2">
              {dayInterviews.map((iv) => {
                const cfg =
                  STATUS_CONFIG[iv.status] ?? STATUS_CONFIG.pending_schedule;
                const outcomeCfg =
                  iv.outcome && iv.outcome !== "pending"
                    ? OUTCOME_CONFIG[iv.outcome]
                    : null;
                return (
                  <div
                    key={iv.id}
                    className="group rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 hover:border-slate-300 dark:hover:border-neutral-700 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Left: candidate info */}
                      <div className="min-w-0 flex-1 flex items-center gap-3">
                        {/* Time column */}
                        {iv.scheduledAt ? (
                          <div className="shrink-0 w-14 text-right">
                            <p className="text-[14px] font-bold text-slate-800 dark:text-neutral-200 tabular-nums">
                              {fmtTime(iv.scheduledAt)}
                            </p>
                          </div>
                        ) : (
                          <div className="shrink-0 w-14" />
                        )}

                        {/* Divider line */}
                        <div
                          className={`shrink-0 w-0.5 h-8 rounded-full ${cfg.dot}`}
                        />

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/candidates/${iv.candidateId}?from=interviews`}
                              className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100 hover:text-[var(--theme-color)] transition-colors"
                            >
                              {iv.candidateName}
                            </Link>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border-none shadow-none ${cfg.badge}`}
                            >
                              {cfg.label}
                            </span>
                            {outcomeCfg && (
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border-none shadow-none ${outcomeCfg.badge}`}
                              >
                                {outcomeCfg.label}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[12px] text-slate-500 dark:text-neutral-400 truncate">
                            {iv.jobTitle}
                            {iv.stageName ? (
                              <>
                                {" "}
                                ·{" "}
                                <span className="font-medium text-slate-600 dark:text-neutral-300">
                                  {iv.stageName}
                                </span>
                              </>
                            ) : null}
                          </p>
                        </div>
                      </div>

                      {/* Right: actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFeedback(iv);
                          }}
                          className="inline-flex items-center gap-1.5 h-7 rounded-md px-2.5 text-[13px] font-semibold text-white shadow-none transition-colors cursor-pointer"
                          style={{
                            backgroundColor: "var(--theme-color)",
                          }}
                        >
                          <HugeiconsIcon
                            icon={Message02Icon}
                            className="size-3"
                          />
                          Feedback
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(iv);
                          }}
                          className="inline-flex items-center gap-1.5 h-7 rounded-md bg-neutral-700/90 px-2.5 text-[13px] font-semibold text-white shadow-none hover:bg-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600 transition-colors cursor-pointer"
                        >
                          <HugeiconsIcon
                            icon={PencilEdit01Icon}
                            className="size-3"
                          />
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
