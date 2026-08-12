"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete02Icon,
  Message02Icon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  useInterviewFeedback,
  useDeleteInterviewFeedback,
} from "@/hooks/queries/use-interview-feedback";
import type { useDeleteInterview } from "@/hooks/queries/use-interviews";
import type { CandidateInterview, StageType } from "@/types";

export function InterviewCard({
  interview,
  stageMap,
  deleteInterviewMutation,
}: {
  interview: CandidateInterview;
  stageMap: Record<number, string>;
  deleteInterviewMutation: ReturnType<typeof useDeleteInterview>;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: feedbackData } = useInterviewFeedback(
    showFeedback ? interview.id : 0,
  );
  const feedback = feedbackData?.data ?? [];
  const deleteFeedbackMutation = useDeleteInterviewFeedback();

  const stageTypeColor = (stageType: StageType | null) => {
    if (stageType === "screening") return "bg-amber-500";
    if (stageType === "interview") return "bg-blue-500";
    if (stageType === "offer") return "bg-emerald-500";
    return "bg-slate-400";
  };

  return (
    <div className="rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Stage type color dot */}
          {interview.stageType && (
            <span
              className={`size-2.5 rounded-full shrink-0 ${stageTypeColor(interview.stageType)}`}
              title={`Stage type: ${interview.stageType}`}
            />
          )}
          <div className="min-w-0">
            <span className="text-sm font-semibold text-slate-800 dark:text-neutral-200">
              {interview.eventName ??
                stageMap[interview.stageId] ??
                `Interview #${interview.id}`}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                className={`rounded-md border-none px-2 py-0.5 text-xs font-bold uppercase tracking-wider shadow-none ${
                  interview.status === "scheduled"
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : interview.status === "pending_schedule"
                      ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
                      : "bg-slate-50 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                {interview.status === "scheduled"
                  ? "Confirmed"
                  : interview.status === "pending_schedule"
                    ? "Awaiting Slot"
                    : (interview.status ?? "pending")}
              </Badge>
              {interview.scheduledAt && (
                <>
                  <span className="text-xs text-slate-400 dark:text-neutral-500">
                    {new Date(interview.scheduledAt).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" },
                    )}{" "}
                    {new Date(interview.scheduledAt).toLocaleTimeString(
                      "en-US",
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowFeedback(true)}
            className="inline-flex items-center gap-1.5 h-8 rounded-md bg-[var(--theme-color)]/10 px-3 text-xs font-semibold text-[var(--theme-color)] shadow-none border-none hover:bg-[var(--theme-color)]/15 transition-colors cursor-pointer"
          >
            <HugeiconsIcon icon={Message02Icon} className="size-3.5" />
            Feedback
            {feedback.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[var(--theme-color)]/15 px-1 text-[10px] font-semibold text-[var(--theme-color)]">
                {feedback.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteInterviewMutation.isPending}
            title="Delete interview"
            className="size-8 flex items-center justify-center rounded-md bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 border-none hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Feedback read-only dialog */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="max-w-lg rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg px-6 py-4">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-sm font-bold text-slate-900 dark:text-neutral-100">
              Interview Feedback
            </DialogTitle>
          </DialogHeader>
          {feedback.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 dark:border-neutral-700 px-4 py-8 text-center">
              <p className="text-sm text-slate-400 dark:text-neutral-500">
                No feedback yet.
              </p>
              <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1">
                Go to the Interviews page to add feedback.
              </p>
            </div>
          ) : (
            <div className="max-h-[400px] space-y-3 overflow-y-auto pr-1">
              {feedback.map((fb) => (
                <div
                  key={fb.id}
                  className="rounded-md border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                          {fb.authorName}
                        </span>
                        {fb.rating && (
                          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-500">
                            <HugeiconsIcon icon={StarIcon} className="size-3" />
                            {fb.rating}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 dark:text-neutral-500">
                          {new Date(fb.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-neutral-400 whitespace-pre-line">
                        {fb.content}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        deleteFeedbackMutation.mutate({
                          interviewId: interview.id,
                          feedbackId: fb.id,
                        })
                      }
                      className="size-6 flex items-center justify-center rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-300 hover:text-red-500 shrink-0 transition-colors"
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button
              onClick={() => setShowFeedback(false)}
              className="h-9 rounded-md border-none bg-neutral-700 px-2.5 text-sm font-semibold text-white shadow-none hover:bg-neutral-600"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={showDeleteConfirm}
        onOpenChange={(o) => !o && setShowDeleteConfirm(false)}
      >
        <AlertDialogContent className="max-w-sm rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-slate-900 dark:text-neutral-100">
              Delete Interview?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 dark:text-neutral-400 leading-relaxed">
              <strong className="text-slate-700 dark:text-neutral-200">
                {interview.eventName ??
                  stageMap[interview.stageId] ??
                  `Interview #${interview.id}`}
              </strong>{" "}
              will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-8 rounded-md border-none bg-neutral-700 px-4 text-sm font-semibold leading-none text-white shadow-none hover:bg-neutral-600 cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteInterviewMutation.mutate(interview.id, {
                  onSettled: () => setShowDeleteConfirm(false),
                });
              }}
              disabled={deleteInterviewMutation.isPending}
              className="h-8 rounded-md border-none bg-red-600 px-4 text-sm font-semibold leading-none text-white shadow-none hover:bg-red-500 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {deleteInterviewMutation.isPending && (
                <Spinner className="size-3.5" />
              )}
              {deleteInterviewMutation.isPending ? "Deleting" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
