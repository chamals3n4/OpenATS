"use client";

import { useState, useMemo } from "react";
import { useInterviews } from "@/hooks/queries/use-interviews";
import { useDepartments } from "@/hooks/queries/use-company";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar02Icon,
  Search01Icon,
  ListViewIcon,
} from "@hugeicons/core-free-icons";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import { InlineCalendar } from "./inline-calendar";
import { InterviewList } from "./interview-list";
import FeedbackDialog from "./feedback-dialog";
import { EditDialog } from "./edit-dialog";

export default function InterviewsClient() {
  const [view, setView] = useState<"list" | "calendar">("calendar");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<any>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editEventName, setEditEventName] = useState("");
  const [editMeetingUrl, setEditMeetingUrl] = useState("");
  const [editOutcome, setEditOutcome] = useState("pending");
  const [editStatus, setEditStatus] = useState("");

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

  const hasActiveFilters =
    search || statusFilter !== "all" || departmentFilter !== "all";

  const inputCls =
    "h-8! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-md text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0";

  const handleFeedback = (iv: any) => {
    setFeedbackTarget(iv);
    setFeedbackDialogOpen(true);
  };

  const handleEdit = (iv: any) => {
    setEditTarget(iv);
    setEditEventName(iv.eventName || "");
    setEditMeetingUrl(iv.meetingUrl || "");
    setEditOutcome(iv.outcome || "pending");
    setEditStatus(iv.status || "");
    setEditDialogOpen(true);
  };

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      {/* Header */}
      <div className="px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Manage Interviews
        </h1>

        {/* View toggle */}
        <div className="flex items-center rounded-md border border-slate-300 dark:border-neutral-700 bg-gray-100 dark:bg-neutral-800 p-0.5 gap-0.5">
          <button
            onClick={() => setView("list")}
            className={`inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-semibold leading-none transition-all ${
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
            className={`inline-flex h-7 items-center cursor-pointer gap-1.5 rounded-md px-3 text-sm font-semibold leading-none transition-all ${
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
      <div className="border-y border-slate-300 dark:border-neutral-700 px-6 py-2.5 flex items-center gap-2 flex-wrap">
        <div className="relative w-64">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
          />
          <Input
            placeholder="Search candidate or job…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`pl-9 ${inputCls}`}
          />
        </div>

        <Select
          value={departmentFilter}
          onValueChange={(v) => setDepartmentFilter(v ?? "all")}
        >
          <SelectTrigger className="w-40 h-8! bg-gray-100 cursor-pointer dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-md text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 focus-visible:ring-0 px-3">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent className="rounded-md shadow-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
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
          <SelectTrigger className="w-40 h-8! bg-gray-100 cursor-pointer dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-md text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 focus-visible:ring-0 px-3">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="rounded-md shadow-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
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
            className="text-slate-600 cursor-pointer dark:text-neutral-400 font-medium text-sm h-8 px-4 hover:bg-transparent hover:text-slate-900 dark:hover:text-neutral-100 border-none ml-2"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {view === "calendar" ? (
          <InlineCalendar interviews={interviews} />
        ) : interviews.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-6 py-16 text-center">
            <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
              <HugeiconsIcon
                icon={Calendar02Icon}
                className="size-5 text-slate-300 dark:text-neutral-600"
              />
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-neutral-400">
              No interviews found
            </p>
            <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1">
              Schedule interviews from a candidate&apos;s detail page.
            </p>
          </div>
        ) : (
          <InterviewList
            interviews={interviews}
            onFeedback={handleFeedback}
            onEdit={handleEdit}
          />
        )}
      </div>

      {/* ── Feedback Dialog ── */}
      <FeedbackDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
        target={feedbackTarget}
      />

      <EditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        target={editTarget}
        eventName={editEventName}
        onEventNameChange={setEditEventName}
        meetingUrl={editMeetingUrl}
        onMeetingUrlChange={setEditMeetingUrl}
        status={editStatus}
        onStatusChange={setEditStatus}
        outcome={editOutcome}
        onOutcomeChange={setEditOutcome}
      />
    </div>
  );
}
