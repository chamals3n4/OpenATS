"use client";

import { useState, useMemo } from "react";
import { ArrowLeft02Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export interface InterviewForCalendar {
  id: number;
  candidateId: number;
  scheduledAt: string | null;
  status: string | null;
  outcome: "pending" | "pass" | "fail";
  candidateName: string;
  jobTitle: string | null;
  stageName: string | null;
  stageType?: string | null;
}

export function InterviewCalendar({
  interviews,
}: {
  interviews: InterviewForCalendar[];
}) {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const month = viewDate.getMonth(); // 0-indexed
  const year = viewDate.getFullYear();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const byDate = useMemo(() => {
    const map: Record<string, InterviewForCalendar[]> = {};
    for (const iv of interviews) {
      if (!iv.scheduledAt) continue;
      const key = iv.scheduledAt.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(iv);
    }
    return map;
  }, [interviews]);

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const monthLabel = viewDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const dayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const cells: Array<{ day: number | null; dateKey: string }> = [];

  for (let i = 0; i < startOffset; i++) {
    cells.push({ day: null, dateKey: "" });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateKey });
  }

  const selectedInterviews = selectedDate ? (byDate[selectedDate] ?? []) : [];

  const dotColor = (iv: InterviewForCalendar) => {
    if (iv.stageType === "screening") return "bg-amber-500";
    if (iv.stageType === "interview") return "bg-blue-500";
    if (iv.stageType === "offer") return "bg-emerald-500";
    if (iv.status === "scheduled") return "bg-emerald-500";
    if (iv.status === "pending_schedule") return "bg-amber-400";
    return "bg-slate-300";
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
            {monthLabel}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="size-8 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500"
            >
              <HugeiconsIcon icon={ArrowLeft02Icon} className="size-4" />
            </button>
            <button
              onClick={nextMonth}
              className="size-8 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500"
            >
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {dayHeaders.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-neutral-500 py-2"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 rounded-xl border border-slate-200 dark:border-neutral-800 overflow-hidden">
          {cells.map((cell, i) => {
            const interviewsOnDay = cell.dateKey
              ? (byDate[cell.dateKey] ?? [])
              : [];
            const isSelected = selectedDate === cell.dateKey;
            const isToday =
              cell.dateKey === new Date().toISOString().slice(0, 10);

            return (
              <div
                key={i}
                onClick={() => cell.dateKey && setSelectedDate(cell.dateKey)}
                className={`
                  relative min-h-[80px] border-b border-r border-slate-100 dark:border-neutral-800
                  ${cell.day ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-900" : "bg-slate-50/50 dark:bg-neutral-950/50"}
                  ${isSelected ? "bg-slate-100 dark:bg-neutral-800" : ""}
                  ${(i + 1) % 7 === 0 ? "border-r-0" : ""}
                `}
              >
                {cell.day && (
                  <>
                    <span
                      className={`absolute top-1.5 left-2 text-sm font-semibold ${
                        isToday
                          ? "flex size-6 items-center justify-center rounded-full bg-[var(--theme-color)] text-white"
                          : "text-slate-600 dark:text-neutral-400"
                      }`}
                    >
                      {cell.day}
                    </span>
                    {/* Interview dots */}
                    <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
                      {interviewsOnDay.slice(0, 3).map((iv) => (
                        <span
                          key={iv.id}
                          className={`size-2 rounded-full ${dotColor(iv)}`}
                          title={`${iv.candidateName} — ${iv.jobTitle ?? ""}`}
                        />
                      ))}
                      {interviewsOnDay.length > 3 && (
                        <span className="text-xs font-medium text-slate-400">
                          +{interviewsOnDay.length - 3}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate && selectedInterviews.length > 0 && (
        <div className="w-72 shrink-0 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
          <h4 className="text-sm font-bold text-slate-800 dark:text-neutral-200 mb-3">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </h4>
          <div className="space-y-3">
            {selectedInterviews.map((iv) => {
              const time = iv.scheduledAt
                ? new Date(iv.scheduledAt).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;

              return (
                <a
                  key={iv.id}
                  href={`/candidates/${iv.candidateId}?from=interviews`}
                  className="block rounded-lg border border-slate-100 dark:border-neutral-800 p-3 hover:bg-slate-50 dark:hover:bg-neutral-900 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`size-2 rounded-full shrink-0 ${dotColor(iv)}`}
                    />
                    <span className="text-sm font-semibold text-slate-800 dark:text-neutral-200 truncate">
                      {iv.candidateName}
                    </span>
                  </div>
                  {iv.jobTitle && (
                    <p className="text-xs text-slate-500 dark:text-neutral-400 truncate">
                      {iv.jobTitle}
                    </p>
                  )}
                  {time && (
                    <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">
                      {time}
                    </p>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
