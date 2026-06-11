"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar02Icon,
  Clock01Icon,
  ChevronLeft,
  ChevronRight,
} from "@hugeicons/core-free-icons";
import { STATUS_CONFIG, fmtTime, fmtDateLong } from "./constants";

export function InlineCalendar({ interviews }: { interviews: any[] }) {
  const today = new Date();
  const [cursor, setCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const byDay = useMemo(() => {
    const m: Record<string, any[]> = {};
    interviews.forEach((iv) => {
      if (!iv.scheduledAt) return;
      const d = new Date(iv.scheduledAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = d.getDate().toString();
        if (!m[key]) m[key] = [];
        m[key].push(iv);
      }
    });
    return m;
  }, [interviews, year, month]);

  const [selected, setSelected] = useState<number | null>(null);
  const selectedInterviews = selected ? (byDay[selected.toString()] ?? []) : [];

  const prevMonth = () => setCursor(new Date(year, month - 1, 1));
  const nextMonth = () => setCursor(new Date(year, month + 1, 1));

  const monthLabel = cursor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const dowLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const todayDay =
    today.getFullYear() === year && today.getMonth() === month
      ? today.getDate()
      : null;

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* Calendar grid */}
      <div className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-neutral-800">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400 transition-colors"
          >
            <HugeiconsIcon icon={ChevronLeft} className="size-4" />
          </button>
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
            {monthLabel}
          </h2>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400 transition-colors"
          >
            <HugeiconsIcon icon={ChevronRight} className="size-4" />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-neutral-800">
          {dowLabels.map((d) => (
            <div
              key={d}
              className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-neutral-500"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const hasEvents = day
              ? (byDay[day.toString()]?.length ?? 0) > 0
              : false;
            const eventCount = day ? (byDay[day.toString()]?.length ?? 0) : 0;
            const isToday = day === todayDay;
            const isSelected = day === selected;
            const isWeekend = i % 7 === 0 || i % 7 === 6;

            return (
              <div
                key={i}
                onClick={() =>
                  day && setSelected(day === selected ? null : day)
                }
                className={`
                  relative min-h-[72px] p-2 border-b border-r border-slate-100 dark:border-neutral-800
                  ${day ? "cursor-pointer" : ""}
                  ${isWeekend && day ? "bg-slate-50/60 dark:bg-neutral-900/60" : ""}
                  ${isSelected ? "bg-[var(--theme-color)]/5 dark:bg-[var(--theme-color)]/10" : day ? "hover:bg-slate-50 dark:hover:bg-neutral-800/50" : ""}
                  transition-colors
                `}
              >
                {day && (
                  <>
                    <span
                      className={`
                        inline-flex size-7 items-center justify-center rounded-full text-[13px] font-medium
                        ${isToday ? "bg-[var(--theme-color)] text-white font-bold" : ""}
                        ${isSelected && !isToday ? "bg-slate-900 dark:bg-neutral-100 text-white dark:text-neutral-900" : ""}
                        ${!isToday && !isSelected ? "text-slate-700 dark:text-neutral-300" : ""}
                      `}
                    >
                      {day}
                    </span>
                    {hasEvents && (
                      <div className="mt-1.5 space-y-1">
                        {byDay[day.toString()].slice(0, 2).map((iv, idx) => {
                          const cfg =
                            STATUS_CONFIG[iv.status] ??
                            STATUS_CONFIG.pending_schedule;
                          return (
                            <div
                              key={idx}
                              className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium truncate ${cfg.badge}`}
                            >
                              <span
                                className={`size-1.5 rounded-full shrink-0 ${cfg.dot}`}
                              />
                              <span className="truncate">
                                {iv.candidateName?.split(" ")[0]}
                              </span>
                              <span className="shrink-0 opacity-70">
                                {fmtTime(iv.scheduledAt)}
                              </span>
                            </div>
                          );
                        })}
                        {eventCount > 2 && (
                          <div className="text-[10px] font-semibold text-slate-400 dark:text-neutral-500 px-1.5">
                            +{eventCount - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Side panel */}
      <div className="w-full lg:w-80 shrink-0">
        {selected ? (
          <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-100 dark:border-neutral-800">
              <p className="text-[13px] font-semibold text-slate-900 dark:text-neutral-100">
                {fmtDateLong(new Date(year, month, selected).toISOString())}
              </p>
              <p className="text-[12px] text-slate-400 dark:text-neutral-500 mt-0.5">
                {selectedInterviews.length} interview
                {selectedInterviews.length !== 1 ? "s" : ""}
              </p>
            </div>
            {selectedInterviews.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] text-slate-400">
                  No interviews this day.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-neutral-800">
                {selectedInterviews.map((iv, idx) => {
                  const cfg =
                    STATUS_CONFIG[iv.status] ?? STATUS_CONFIG.pending_schedule;
                  return (
                    <div key={idx} className="px-4 py-3.5">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-1.5 size-2 rounded-full shrink-0 ${cfg.dot}`}
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/candidates/${iv.candidateId}?from=interviews`}
                            className="text-[13px] font-semibold text-slate-900 dark:text-neutral-100 hover:text-[var(--theme-color)] block truncate"
                          >
                            {iv.candidateName}
                          </Link>
                          <p className="text-[12px] text-slate-500 dark:text-neutral-400 mt-0.5 truncate">
                            {iv.jobTitle}
                            {iv.stageName ? ` · ${iv.stageName}` : ""}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-neutral-400">
                              <HugeiconsIcon
                                icon={Clock01Icon}
                                className="size-3"
                              />
                              {fmtTime(iv.scheduledAt)}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border-none ${cfg.badge}`}
                            >
                              {cfg.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-10 text-center">
            <div className="size-10 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
              <HugeiconsIcon
                icon={Calendar02Icon}
                className="size-5 text-slate-300 dark:text-neutral-600"
              />
            </div>
            <p className="text-[13px] font-medium text-slate-500 dark:text-neutral-400">
              Select a day to see interviews
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 mb-2.5">
            Status Legend
          </p>
          <div className="space-y-2">
            {Object.entries(STATUS_CONFIG).map(([, cfg]) => (
              <div key={cfg.label} className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${cfg.dot}`} />
                <span className="text-[12px] font-medium text-slate-600 dark:text-neutral-400">
                  {cfg.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
