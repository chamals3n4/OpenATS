"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Location01Icon,
  Search01Icon,
  Video01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InterviewListItem } from "@/types";
import { STATUS_CONFIG, fmtTime, fmtTimeRange, matchesInterview } from "./constants";
import { InterviewActions } from "./interview-actions";
import { MonthYearPicker } from "./month-year-picker";
import { dayKey, groupByDay, monthGrid } from "../lib/calendar-utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS = 2;

const statusOf = (status: string) => STATUS_CONFIG[status] ?? STATUS_CONFIG.pending_schedule;

function PanelItem({
  interview: iv,
  showDate,
  onFeedback,
  onEdit,
}: {
  interview: InterviewListItem;
  /** In search results the interviews come from different days, so each says which. */
  showDate: boolean;
  onFeedback: (iv: InterviewListItem) => void;
  onEdit: (iv: InterviewListItem) => void;
}) {
  const cfg = statusOf(iv.status);
  const onsite = iv.eventType === "onsite";
  const when = iv.scheduledAt
    ? [
        showDate
          ? new Date(iv.scheduledAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
          : null,
        fmtTimeRange(iv.scheduledAt, iv.durationMinutes),
      ]
        .filter(Boolean)
        .join(", ")
    : "No time yet";

  return (
    <li className="px-4 py-3">
      <p className="text-sm font-medium tabular-nums text-slate-600 dark:text-neutral-400">{when}</p>
      <Link
        href={`/candidates/${iv.candidateId}?from=interviews`}
        className="mt-1 block truncate text-[15px] font-semibold text-slate-900 hover:text-theme dark:text-neutral-100 dark:hover:text-primary"
      >
        {iv.candidateName}
      </Link>
      <p className="mt-0.5 text-sm text-slate-600 dark:text-neutral-400">
        {[iv.eventName ?? iv.stageName, iv.jobTitle].filter(Boolean).join(" · ")}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-700 dark:text-neutral-300">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className={`size-2 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
        <span className="flex items-center gap-1.5">
          <HugeiconsIcon
            icon={onsite ? Location01Icon : Video01Icon}
            className="size-4 text-slate-500 dark:text-neutral-400"
            strokeWidth={1.75}
          />
          {onsite ? "On-site" : "Virtual"}
        </span>
        {iv.meetingUrl && iv.status === "scheduled" && (
          <a
            href={iv.meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto font-medium text-theme underline underline-offset-4 dark:text-primary"
          >
            Join meeting
          </a>
        )}
      </div>
      <div className="mt-3">
        <InterviewActions interview={iv} onFeedback={onFeedback} onEdit={onEdit} />
      </div>
    </li>
  );
}

const navButtonCls =
  "flex size-8 cursor-pointer items-center justify-center rounded-md border border-slate-300 text-slate-600 transition-colors hover:border-theme/50 hover:bg-theme/10 hover:text-theme dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-primary";

export function InlineCalendar({
  interviews,
  onFeedback,
  onEdit,
}: {
  interviews: InterviewListItem[];
  onFeedback: (iv: InterviewListItem) => void;
  onEdit: (iv: InterviewListItem) => void;
}) {
  const [query, setQuery] = useState("");
  // Read once, so "today" does not move under the user if the page is left open over midnight.
  const [today] = useState(() => new Date());
  const todayKey = dayKey(today);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState(todayKey);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const days = monthGrid(year, month);
  const byDay = groupByDay(interviews);

  const selectedDate = new Date(`${selectedKey}T00:00:00`);
  const selectedInterviews = byDay.get(selectedKey) ?? [];
  // No time yet, so they cannot be on the grid. Listed beside it so they are not forgotten.
  const waiting = interviews.filter((iv) => iv.status === "pending_schedule" && !iv.scheduledAt);

  // Searching looks through every interview, on any day. Otherwise the panel shows the chosen day.
  const searching = query.trim() !== "";
  const results = searching
    ? interviews
        .filter((iv) => matchesInterview(iv, query))
        .sort((a, b) => (a.scheduledAt ?? "9999").localeCompare(b.scheduledAt ?? "9999"))
    : selectedInterviews;

  const goToMonth = (offset: number) => setCursor(new Date(year, month + offset, 1));
  const goToToday = () => {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedKey(todayKey);
  };
  const selectDay = (date: Date, key: string) => {
    setSelectedKey(key);
    // A day from the next or previous month brings that month into view.
    if (date.getMonth() !== month) setCursor(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      <section
        aria-label="Interview calendar"
        className="min-w-0 flex-1 overflow-hidden rounded-md border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <MonthYearPicker
            year={year}
            month={month}
            today={today}
            onChange={(nextYear, nextMonth) => setCursor(new Date(nextYear, nextMonth, 1))}
          />
          <div className="flex items-center gap-2">
            <Button variant="cancel" onClick={goToToday} className="h-8 cursor-pointer px-3 text-sm">
              Today
            </Button>
            <button type="button" aria-label="Previous month" onClick={() => goToMonth(-1)} className={navButtonCls}>
              <ChevronLeft className="size-4" strokeWidth={2} />
            </button>
            <button type="button" aria-label="Next month" onClick={() => goToMonth(1)} className={navButtonCls}>
              <ChevronRight className="size-4" strokeWidth={2} />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-7 border-y border-theme/20 bg-theme/10">
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              className="py-1.5 text-center text-xs font-semibold uppercase tracking-wider text-theme dark:text-primary"
            >
              {weekday}
            </div>
          ))}
        </div>

        {/* Rows share the height left in the window, so a whole month shows without scrolling. */}
        <div
          className="grid grid-cols-7"
          style={{ gridAutoRows: `minmax(3.75rem, min(8rem, calc((100dvh - 20.5rem) / ${days.length / 7})))` }}
        >
          {days.map(({ date, key, inMonth }, i) => {
            const dayInterviews = byDay.get(key) ?? [];
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const label = `${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}, ${
              dayInterviews.length === 0
                ? "no interviews"
                : `${dayInterviews.length} interview${dayInterviews.length === 1 ? "" : "s"}`
            }`;

            return (
              <button
                key={key}
                type="button"
                aria-label={label}
                aria-pressed={isSelected}
                onClick={() => selectDay(date, key)}
                className={`relative flex cursor-pointer flex-col gap-1 overflow-hidden border-b border-slate-200 p-1.5 text-left transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-theme dark:border-neutral-800 ${
                  i % 7 === 6 ? "" : "border-r"
                } ${
                  isSelected
                    ? "bg-theme/10"
                    : "hover:bg-theme/5"
                }`}
              >
                <span className="flex w-full items-center justify-between">
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[13px] ${
                      isToday
                        ? "bg-theme font-bold text-white"
                        : isSelected
                          ? "font-semibold text-theme ring-1 ring-theme dark:text-primary"
                          : inMonth
                          ? "font-medium text-slate-800 dark:text-neutral-200"
                          : "text-slate-400 dark:text-neutral-600"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {/* Beside the date, because a short row has no room for it under the names. */}
                  {dayInterviews.length > MAX_CHIPS && (
                    <span className="hidden text-[11px] font-medium leading-5 text-slate-500 sm:block dark:text-neutral-400">
                      +{dayInterviews.length - MAX_CHIPS} more
                    </span>
                  )}
                </span>

                {/* Wide screens: who and when. Narrow screens: only how many. */}
                <span className="hidden w-full flex-col gap-1 sm:flex">
                  {dayInterviews.slice(0, MAX_CHIPS).map((iv) => (
                    // A plain line: a dot in the status colour (the same dots as the key under the
                    // grid), the time in bold, and the name. No block or pill behind it.
                    <span key={iv.id} className="flex w-full items-center gap-1.5 text-[13px] leading-4">
                      <span aria-hidden className={`size-2 shrink-0 rounded-full ${statusOf(iv.status).dot}`} />
                      <span className="shrink-0 font-semibold tabular-nums text-slate-900 dark:text-neutral-100">
                        {fmtTime(iv.scheduledAt)}
                      </span>
                      <span className="truncate font-medium text-slate-700 dark:text-neutral-300">
                        {iv.candidateName?.split(" ")[0]}
                      </span>
                    </span>
                  ))}
                </span>
                {dayInterviews.length > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-theme text-[11px] font-semibold text-white sm:hidden">
                    {dayInterviews.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <footer className="flex flex-wrap gap-x-5 gap-y-1.5 px-4 py-2">
          {Object.values(STATUS_CONFIG).map((cfg) => (
            <span key={cfg.label} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-neutral-400">
              <span className={`size-2 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          ))}
        </footer>
      </section>

      {/* As tall as the window allows, with its own scroll, so a busy day never pushes the page down. */}
      <section
        aria-label="Interviews"
        className="flex w-full shrink-0 flex-col overflow-hidden rounded-md border border-slate-300 bg-white xl:max-h-[calc(100dvh-12.5rem)] xl:w-96 dark:border-neutral-700 dark:bg-neutral-900"
      >
        <header className="shrink-0 space-y-3 border-b border-slate-300 px-4 py-3 dark:border-neutral-700">
          <div>
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
              {searching
                ? "Search results"
                : selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              {!searching && selectedKey === todayKey && (
                <span className="text-sm font-medium text-theme dark:text-primary">Today</span>
              )}
            </h3>
            <p aria-live="polite" className="mt-0.5 text-sm text-slate-600 dark:text-neutral-400">
              {results.length === 0
                ? "No interviews"
                : `${results.length} interview${results.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="relative">
            <HugeiconsIcon
              icon={Search01Icon}
              className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-500 dark:text-neutral-400"
            />
            <Input
              type="search"
              aria-label="Search all interviews"
              placeholder="Search all interviews"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-gray-100 pl-9 text-sm shadow-none focus-visible:border-theme focus-visible:ring-0 dark:border-neutral-600 dark:bg-neutral-800"
            />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-600 dark:text-neutral-400">
              {searching ? `No interviews match "${query.trim()}".` : "Nothing is scheduled for this day."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-neutral-800">
              {results.map((iv) => (
                <PanelItem key={iv.id} interview={iv} showDate={searching} onFeedback={onFeedback} onEdit={onEdit} />
              ))}
            </ul>
          )}

          {!searching && waiting.length > 0 && (
            <>
              <div className="border-y border-slate-300 bg-slate-50 px-4 py-2.5 dark:border-neutral-700 dark:bg-neutral-950/40">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-neutral-100">
                  <span aria-hidden className="size-2 rounded-full bg-amber-400" />
                  Waiting for a time
                  <span className="font-normal text-slate-600 dark:text-neutral-400">{waiting.length}</span>
                </h4>
                <p className="mt-0.5 text-[13px] text-slate-600 dark:text-neutral-400">
                  These candidates have not picked a time yet.
                </p>
              </div>
              <ul className="divide-y divide-slate-200 dark:divide-neutral-800">
                {waiting.map((iv) => (
                  <PanelItem key={iv.id} interview={iv} showDate={false} onFeedback={onFeedback} onEdit={onEdit} />
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
