"use client";

import { useState, useMemo } from "react";
import {
  useInterviews,
  useUpdateInterview,
} from "@/hooks/queries/use-interviews";
import { useAddInterviewFeedback } from "@/hooks/queries/use-interview-feedback";
import { useDepartments } from "@/hooks/queries/use-company";
import {
  InterviewCalendar,
  type InterviewForCalendar,
} from "@/components/interview-calendar";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar02Icon,
  Clock01Icon,
  Search01Icon,
  PencilEdit01Icon,
  Message02Icon,
  ViewIcon,
  ListViewIcon,
  ChevronLeft,
  ChevronRight,
} from "@hugeicons/core-free-icons";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
function fmtDateLong(s: string) {
  return new Date(s).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  scheduled: {
    label: "Confirmed",
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  pending_schedule: {
    label: "Awaiting Slot",
    dot: "bg-amber-400",
    badge:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  },
  completed: {
    label: "Completed",
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-red-400",
    badge: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  },
};

const OUTCOME_CONFIG: Record<string, { label: string; badge: string }> = {
  pass: {
    label: "Passed",
    badge:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  fail: {
    label: "Failed",
    badge: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  },
};

// ─── Inline Google-Calendar-style calendar ───────────────────────────────────
function InlineCalendar({ interviews }: { interviews: any[] }) {
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
  // pad to complete last week
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InterviewsPage() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const addFeedbackMutation = useAddInterviewFeedback();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editEventName, setEditEventName] = useState("");
  const [editMeetingUrl, setEditMeetingUrl] = useState("");
  const [editOutcome, setEditOutcome] = useState("pending");
  const [editStatus, setEditStatus] = useState("");
  const updateInterviewMutation = useUpdateInterview();

  const { data: departmentsData } = useDepartments();
  const departments = departmentsData?.data ?? [];

  const activeFilters = useMemo(() => {
    const f: Record<string, string | number> = {};
    const sd = search.trim();
    if (sd) f.search = sd;
    if (departmentFilter !== "all") f.departmentId = Number(departmentFilter);
    return f;
  }, [search, departmentFilter]);

  const { data } = useInterviews(activeFilters);
  const interviews = (data?.data ?? []).filter((iv) => {
    return statusFilter === "all" || iv.status === statusFilter;
  });

  const calendarData: InterviewForCalendar[] = interviews.map((iv) => ({
    id: iv.id,
    candidateId: iv.candidateId,
    scheduledAt: iv.scheduledAt,
    status: iv.status ?? null,
    outcome: iv.outcome as "pending" | "pass" | "fail",
    candidateName: iv.candidateName,
    jobTitle: iv.jobTitle,
    stageName: iv.stageName,
    stageType: iv.stageType ?? null,
  }));

  const hasActiveFilters =
    search || statusFilter !== "all" || departmentFilter !== "all";

  // Group list view by date
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

  const inputCls =
    "h-10 bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0";

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      {/* Header */}
      <div className="px-8 py-4 flex items-center justify-between">
        <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Manage Interviews
        </h1>

        {/* View toggle */}
        <div className="flex items-center rounded-lg border border-slate-300 dark:border-neutral-700 bg-gray-100 dark:bg-neutral-800 p-1 gap-0.5">
          <button
            onClick={() => setView("list")}
            className={`inline-flex h-8 items-center gap-2 rounded-md px-3.5 text-[13px] font-semibold leading-none transition-all ${
              view === "list"
                ? "bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 shadow-sm"
                : "text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-300"
            }`}
          >
            <HugeiconsIcon icon={ListViewIcon} className="size-3.5" />
            List
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`inline-flex h-8 items-center gap-2 rounded-md px-3.5 text-[13px] font-semibold leading-none transition-all ${
              view === "calendar"
                ? "bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 shadow-sm"
                : "text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-300"
            }`}
          >
            <HugeiconsIcon icon={Calendar02Icon} className="size-3.5" />
            Calendar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="border-y border-slate-300 dark:border-neutral-700 px-8 py-3.5 flex items-center gap-4 flex-wrap">
        <div className="relative w-72">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
          />
          <Input
            placeholder="Search candidate or job…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`pl-11 ${inputCls}`}
          />
        </div>

        <Select
          value={departmentFilter}
          onValueChange={(v) => setDepartmentFilter(v ?? "all")}
        >
          <SelectTrigger className="w-48 h-10! bg-gray-100 cursor-pointer dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 focus-visible:ring-0 px-3">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d: any) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v ?? "all")}
        >
          <SelectTrigger className="w-44 h-10! bg-gray-100 cursor-pointer dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 focus-visible:ring-0 px-3">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_schedule">Awaiting Slot</SelectItem>
            <SelectItem value="scheduled">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setDepartmentFilter("all");
            }}
            className="text-slate-600 cursor-pointer dark:text-neutral-400 font-medium text-sm h-10 px-4 hover:bg-transparent hover:text-slate-900 dark:hover:text-neutral-100 border-none ml-2"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {view === "calendar" ? (
          <InlineCalendar interviews={interviews} />
        ) : interviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-6 py-16 text-center">
            <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
              <HugeiconsIcon
                icon={Calendar02Icon}
                className="size-5 text-slate-300 dark:text-neutral-600"
              />
            </div>
            <p className="text-[14px] font-semibold text-slate-500 dark:text-neutral-400">
              No interviews found
            </p>
            <p className="text-[12px] text-slate-400 dark:text-neutral-500 mt-1">
              Schedule interviews from a candidate&apos;s detail page.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
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
                  <div className="flex items-center gap-3 mb-3">
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
                  <div className="space-y-2.5">
                    {dayInterviews.map((iv) => {
                      const cfg =
                        STATUS_CONFIG[iv.status] ??
                        STATUS_CONFIG.pending_schedule;
                      const outcomeCfg =
                        iv.outcome && iv.outcome !== "pending"
                          ? OUTCOME_CONFIG[iv.outcome]
                          : null;
                      return (
                        <div
                          key={iv.id}
                          className="group rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-5 py-4 hover:border-slate-300 dark:hover:border-neutral-700 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center justify-between gap-4">
                            {/* Left: candidate info */}
                            <div className="min-w-0 flex-1 flex items-center gap-4">
                              {/* Time column */}
                              {iv.scheduledAt ? (
                                <div className="shrink-0 w-16 text-right">
                                  <p className="text-[14px] font-bold text-slate-800 dark:text-neutral-200 tabular-nums">
                                    {fmtTime(iv.scheduledAt)}
                                  </p>
                                </div>
                              ) : (
                                <div className="shrink-0 w-16" />
                              )}

                              {/* Divider line */}
                              <div
                                className={`shrink-0 w-0.5 h-10 rounded-full ${cfg.dot}`}
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
                                  setFeedbackTarget(iv);
                                  setFeedbackText("");
                                  setFeedbackDialogOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 h-[34px] rounded-md px-3.5 text-[13px] font-semibold text-white shadow-none transition-colors cursor-pointer"
                                style={{
                                  backgroundColor: "var(--theme-color)",
                                }}
                              >
                                <HugeiconsIcon
                                  icon={Message02Icon}
                                  className="size-3.5"
                                />
                                Feedback
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditTarget(iv);
                                  setEditEventName(iv.eventName || "");
                                  setEditMeetingUrl(iv.meetingUrl || "");
                                  setEditOutcome(iv.outcome || "pending");
                                  setEditStatus(iv.status || "");
                                  setEditDialogOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 h-[34px] rounded-md bg-neutral-700/90 px-3.5 text-[13px] font-semibold text-white shadow-none hover:bg-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600 transition-colors cursor-pointer"
                              >
                                <HugeiconsIcon
                                  icon={PencilEdit01Icon}
                                  className="size-3.5"
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
        )}
      </div>

      {/* ── Feedback Dialog ── */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="max-w-lg rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-semibold text-slate-900 dark:text-neutral-100">
              Add Feedback
            </DialogTitle>
            {feedbackTarget && (
              <p className="text-[13px] text-slate-500 dark:text-neutral-400 mt-0.5">
                {feedbackTarget.candidateName} · {feedbackTarget.jobTitle}
              </p>
            )}
          </DialogHeader>

          <div className="space-y-1.5 mt-1">
            <Label className="text-[13px] font-medium text-slate-600 dark:text-neutral-400">
              Internal notes
            </Label>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Add internal notes about this interview — only visible to your team…"
              rows={5}
              className="w-full rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3.5 py-2.5 text-[13px] text-slate-800 dark:text-neutral-200 shadow-none resize-none focus:outline-none focus:border-[var(--theme-color)] placeholder:text-slate-300 dark:placeholder:text-neutral-600 transition-colors"
            />
          </div>

          <DialogFooter className="gap-2 mt-2">
            <button
              onClick={() => setFeedbackDialogOpen(false)}
              className="h-[34px] rounded-md border-none bg-neutral-700 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-neutral-600 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!feedbackText.trim()) return;
                try {
                  await addFeedbackMutation.mutateAsync({
                    interviewId: feedbackTarget.id,
                    content: feedbackText.trim(),
                  });
                  toast.success("Feedback added");
                  setFeedbackDialogOpen(false);
                  setFeedbackText("");
                } catch {
                  toast.error("Failed to add feedback");
                }
              }}
              disabled={!feedbackText.trim() || addFeedbackMutation.isPending}
              className="h-[34px] rounded-md border-none px-4 text-[14px] font-semibold leading-none text-white shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: "var(--theme-color)" }}
            >
              {addFeedbackMutation.isPending ? "Saving…" : "Save Feedback"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Interview Dialog ── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-semibold text-slate-900 dark:text-neutral-100">
              Edit Interview
            </DialogTitle>
            {editTarget && (
              <p className="text-[13px] text-slate-500 dark:text-neutral-400 mt-0.5">
                {editTarget.candidateName} · {editTarget.jobTitle}
              </p>
            )}
          </DialogHeader>

          <div className="space-y-4 mt-1">
            <div>
              <Label className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5 block">
                Event name
              </Label>
              <Input
                value={editEventName}
                onChange={(e) => setEditEventName(e.target.value)}
                placeholder="e.g. Technical Interview"
                className="h-10 rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-sm focus-visible:ring-1 focus-visible:ring-[var(--theme-color)] focus-visible:border-[var(--theme-color)]"
              />
            </div>
            <div>
              <Label className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5 block">
                Meeting URL
              </Label>
              <Input
                value={editMeetingUrl}
                onChange={(e) => setEditMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/…"
                className="h-10 rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-sm focus-visible:ring-1 focus-visible:ring-[var(--theme-color)] focus-visible:border-[var(--theme-color)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5 block">
                  Status
                </Label>
                <Select
                  value={editStatus}
                  onValueChange={(v) => setEditStatus(v || "")}
                >
                  <SelectTrigger className="h-10 w-full rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-sm focus:ring-0 focus-visible:ring-0">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <SelectItem value="pending_schedule">
                      Awaiting Slot
                    </SelectItem>
                    <SelectItem value="scheduled">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5 block">
                  Outcome
                </Label>
                <Select
                  value={editOutcome}
                  onValueChange={(v) => setEditOutcome(v || "pending")}
                >
                  <SelectTrigger className="h-10 w-full rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-sm focus:ring-0 focus-visible:ring-0">
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="pass">Passed</SelectItem>
                    <SelectItem value="fail">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <button
              onClick={() => setEditDialogOpen(false)}
              className="h-[34px] rounded-md border-none bg-neutral-700 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-neutral-600 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  await updateInterviewMutation.mutateAsync({
                    id: editTarget.id,
                    eventName: editEventName || undefined,
                    meetingUrl: editMeetingUrl || null,
                    status: (editStatus || undefined) as
                      | "pending_schedule"
                      | "scheduled"
                      | "completed"
                      | "cancelled"
                      | undefined,
                    outcome: (editOutcome || undefined) as
                      | "pending"
                      | "pass"
                      | "fail"
                      | undefined,
                  });
                  toast.success("Interview updated");
                  setEditDialogOpen(false);
                } catch {
                  toast.error("Failed to update interview");
                }
              }}
              disabled={updateInterviewMutation.isPending}
              className="h-[34px] rounded-md border-none px-4 text-[14px] font-semibold leading-none text-white shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: "var(--theme-color)" }}
            >
              {updateInterviewMutation.isPending ? "Saving…" : "Save Changes"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
