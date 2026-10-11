"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAddInterviewFeedback } from "@/hooks/queries/use-interview-feedback";
import type { InterviewListItem } from "@/types";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: InterviewListItem | null;
}

export default function FeedbackDialog({
  open,
  onOpenChange,
  target,
}: FeedbackDialogProps) {
  const [feedbackText, setFeedbackText] = useState("");
  const addFeedbackMutation = useAddInterviewFeedback();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900 dark:text-neutral-100">
            Add feedback
          </DialogTitle>
          {target && (
            <p className="text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
              {target.candidateName} · {target.jobTitle}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-1.5 mt-1">
          <Label htmlFor="interview-feedback" className="text-sm font-medium text-slate-800 dark:text-neutral-200">
            Notes for your team
          </Label>
          <textarea
            id="interview-feedback"
            aria-describedby="interview-feedback-hint"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="How did the interview go?"
            rows={5}
            className="w-full resize-y rounded-md border border-slate-300 bg-gray-100 px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-none placeholder:text-slate-400 focus:border-theme focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
          />
          <p id="interview-feedback-hint" className="text-[13px] text-slate-500 dark:text-neutral-400">
            Only your team sees this. The candidate does not.
          </p>
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button
            variant="cancel"
            onClick={() => onOpenChange(false)}
            className="h-8 px-4 text-sm"
          >
            Cancel
          </Button>
          <button
            onClick={async () => {
              if (!target || !feedbackText.trim()) return;
              try {
                await addFeedbackMutation.mutateAsync({
                  interviewId: target.id,
                  content: feedbackText.trim(),
                });
                toast.success("Feedback added");
                onOpenChange(false);
                setFeedbackText("");
              } catch {
                toast.error("Failed to add feedback");
              }
            }}
            disabled={!feedbackText.trim() || addFeedbackMutation.isPending}
            className="h-8 rounded-md border-none px-4 text-sm font-semibold leading-none text-white shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: "var(--theme-color)" }}
          >
            {addFeedbackMutation.isPending ? "Saving" : "Save feedback"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
