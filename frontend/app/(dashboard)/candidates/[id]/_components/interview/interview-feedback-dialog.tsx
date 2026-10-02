"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon, StarIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAddInterviewFeedback,
  useDeleteInterviewFeedback,
  useInterviewFeedback,
} from "@/hooks/queries/use-interview-feedback";

interface InterviewFeedbackDialogProps {
  interviewId: number;
  interviewName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatFeedbackDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Read the team's feedback on an interview and add to it, without leaving the candidate page. */
export function InterviewFeedbackDialog({
  interviewId,
  interviewName,
  open,
  onOpenChange,
}: InterviewFeedbackDialogProps) {
  const { data, isLoading } = useInterviewFeedback(interviewId);
  const addFeedback = useAddInterviewFeedback();
  const deleteFeedback = useDeleteInterviewFeedback();
  const [text, setText] = useState("");

  const feedback = data?.data ?? [];

  const handleAdd = () => {
    const content = text.trim();
    if (!content) return;
    addFeedback.mutate(
      { interviewId, content },
      {
        onSuccess: () => {
          setText("");
          toast.success("Feedback added");
        },
        onError: () => toast.error("Failed to add feedback"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-4 border-slate-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900 dark:text-neutral-100">
            Interview feedback
          </DialogTitle>
          <DialogDescription>
            {interviewName}. Notes here are only visible to your team.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 space-y-3 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-5" />
            </div>
          ) : feedback.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
              No feedback yet. Add the first note below.
            </p>
          ) : (
            feedback.map((fb) => (
              <article
                key={fb.id}
                className="rounded-md border border-slate-300 bg-slate-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-950/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                    <span className="font-semibold text-slate-900 dark:text-neutral-100">
                      {fb.authorName}
                    </span>
                    {fb.rating && (
                      <span className="inline-flex items-center gap-0.5 font-medium text-amber-600 dark:text-amber-400">
                        <HugeiconsIcon icon={StarIcon} className="size-3.5" />
                        {fb.rating}
                      </span>
                    )}
                    <span className="text-slate-500 dark:text-neutral-400">
                      {formatFeedbackDate(fb.createdAt)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    aria-label={`Delete feedback from ${fb.authorName}`}
                    title="Delete"
                    onClick={() =>
                      deleteFeedback.mutate(
                        { interviewId, feedbackId: fb.id },
                        { onError: () => toast.error("Failed to delete feedback") },
                      )
                    }
                    className="-mr-1.5 -mt-1 size-7 shrink-0 rounded-md p-0 text-slate-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <HugeiconsIcon icon={Delete01Icon} className="size-4" strokeWidth={1.75} />
                  </Button>
                </div>
                <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-slate-800 dark:text-neutral-200">
                  {fb.content}
                </p>
              </article>
            ))
          )}
        </div>

        <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-neutral-800">
          <label
            htmlFor={`feedback-${interviewId}`}
            className="text-sm font-medium text-slate-800 dark:text-neutral-200"
          >
            Add feedback
          </label>
          <Textarea
            id={`feedback-${interviewId}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="How did the interview go?"
            rows={3}
            className="resize-none border-slate-300 bg-gray-100 text-sm shadow-none dark:border-neutral-600 dark:bg-neutral-800"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="cancel"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 text-sm"
            >
              Close
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!text.trim() || addFeedback.isPending}
              className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
            >
              {addFeedback.isPending && <Spinner className="size-3.5" />}
              {addFeedback.isPending ? "Saving" : "Save feedback"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
