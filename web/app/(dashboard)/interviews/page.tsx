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

export default function InterviewsPage() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  // Feedback dialog
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const addFeedbackMutation = useAddInterviewFeedback();

  // Edit dialog
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
    const matchesStatus = statusFilter === "all" || iv.status === statusFilter;
    return matchesStatus;
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

      {/* Filters */}
      <div className="border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative w-64">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
          />
          <Input
            placeholder="Search candidate or job…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-sm"
          />
        </div>
        <Select
          value={departmentFilter}
          onValueChange={(v) => setDepartmentFilter(v ?? "all")}
        >
          <SelectTrigger className="w-44 h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-sm">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent className="rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
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
          <SelectTrigger className="w-40 h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-sm">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending_schedule">Awaiting Slot</SelectItem>
            <SelectItem value="scheduled">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {(search || statusFilter !== "all" || departmentFilter !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setDepartmentFilter("all");
            }}
            className="text-[13px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-neutral-300"
          >
            Clear
          </button>
        )}
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
                <div
                  key={iv.id}
                  className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 hover:border-slate-300 dark:hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/candidates/${iv.candidateId}?from=interviews`}
                          className="text-[15px] font-bold text-slate-900 dark:text-neutral-100 truncate hover:text-[var(--theme-color)] transition-colors"
                        >
                          {iv.candidateName}
                        </Link>
                        <Badge
                          className={`rounded-md border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-none ${
                            iv.status === "scheduled"
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                              : iv.status === "pending_schedule"
                                ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
                                : iv.status === "completed"
                                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                                  : iv.status === "cancelled"
                                    ? "bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400"
                                    : "bg-slate-50 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400"
                          }`}
                        >
                          {iv.status === "scheduled"
                            ? "Confirmed"
                            : iv.status === "pending_schedule"
                              ? "Awaiting Slot"
                              : iv.status === "completed"
                                ? "Completed"
                                : iv.status === "cancelled"
                                  ? "Cancelled"
                                  : (iv.status ?? "pending")}
                        </Badge>
                        {iv.outcome && iv.outcome !== "pending" && (
                          <Badge
                            className={`rounded-md border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-none ${
                              iv.outcome === "pass"
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                                : "bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400"
                            }`}
                          >
                            {iv.outcome === "pass" ? "Passed" : "Failed"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[13px] text-slate-500 dark:text-neutral-400">
                        {iv.jobTitle}
                        {iv.stageName ? ` · ${iv.stageName}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {iv.scheduledAt && (
                        <div className="flex flex-col items-end gap-1">
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFeedbackTarget(iv);
                          setFeedbackText("");
                          setFeedbackDialogOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 h-8 rounded-md bg-[var(--theme-color)] px-3 text-[12px] font-semibold text-white shadow-none hover:bg-[var(--theme-color-hover)] transition-colors"
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
                        className="inline-flex items-center gap-1.5 h-8 rounded-md border border-slate-200 dark:border-neutral-700 px-3 text-[12px] font-semibold text-slate-600 dark:text-neutral-400 hover:border-slate-300 dark:hover:border-neutral-600 hover:text-slate-800 dark:hover:text-neutral-200 transition-colors"
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
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Feedback Dialog ─── */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="max-w-lg rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg px-6 py-4">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-[16px] font-bold text-slate-900 dark:text-neutral-100">
              Add Feedback — {feedbackTarget?.candidateName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
              Internal Feedback
            </Label>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Add internal notes about this interview (only visible to your team)…"
              className="min-h-[120px] w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2.5 text-[13px] shadow-none resize-none focus:outline-none focus:border-[var(--theme-color)]"
            />
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button
              onClick={() => setFeedbackDialogOpen(false)}
              className="h-9 rounded-md border-none bg-neutral-700 px-4 text-[13px] font-semibold text-white shadow-none hover:bg-neutral-600"
            >
              Cancel
            </Button>
            <Button
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
              className="h-9 rounded-md border-none bg-[var(--theme-color)] px-4 text-[13px] font-semibold text-white shadow-none hover:bg-[var(--theme-color-hover)] disabled:opacity-50"
            >
              {addFeedbackMutation.isPending ? "Saving…" : "Save Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Interview Dialog ─── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg px-6 py-4">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-[16px] font-bold text-slate-900 dark:text-neutral-100">
              Edit Interview — {editTarget?.candidateName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                Event Name
              </Label>
              <Input
                value={editEventName}
                onChange={(e) => setEditEventName(e.target.value)}
                placeholder="e.g. Technical Interview"
                className="h-10 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 shadow-none text-[13px] rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                Meeting URL
              </Label>
              <Input
                value={editMeetingUrl}
                onChange={(e) => setEditMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/…"
                className="h-10 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 shadow-none text-[13px] rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </Label>
                <Select
                  value={editStatus}
                  onValueChange={(v) => setEditStatus(v || "")}
                >
                  <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 shadow-none text-[13px] w-full rounded-lg">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    <SelectItem value="pending_schedule">
                      Awaiting Slot
                    </SelectItem>
                    <SelectItem value="scheduled">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                  Outcome
                </Label>
                <Select
                  value={editOutcome}
                  onValueChange={(v) => setEditOutcome(v || "pending")}
                >
                  <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 shadow-none text-[13px] w-full rounded-lg">
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="pass">Passed</SelectItem>
                    <SelectItem value="fail">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button
              onClick={() => setEditDialogOpen(false)}
              className="h-9 rounded-md border-none bg-neutral-700 px-4 text-[13px] font-semibold text-white shadow-none hover:bg-neutral-600"
            >
              Cancel
            </Button>
            <Button
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
              className="h-9 rounded-md border-none bg-[var(--theme-color)] px-4 text-[13px] font-semibold text-white shadow-none hover:bg-[var(--theme-color-hover)] disabled:opacity-50"
            >
              {updateInterviewMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
