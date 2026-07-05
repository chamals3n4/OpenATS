"use client";

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

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: any;
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
            Add Feedback
          </DialogTitle>
          {target && (
            <p className="text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
              {target.candidateName} · {target.jobTitle}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-1.5 mt-1">
          <Label className="text-sm font-medium text-slate-600 dark:text-neutral-400">
            Internal notes
          </Label>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Add internal notes about this interview — only visible to your team…"
            rows={5}
            className="w-full rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3.5 py-2.5 text-sm text-slate-800 dark:text-neutral-200 shadow-none resize-none focus:outline-none focus:border-[var(--theme-color)] placeholder:text-slate-300 dark:placeholder:text-neutral-600 transition-colors"
          />
        </div>

        <DialogFooter className="gap-2 mt-2">
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 rounded-md border-none bg-neutral-700 px-4 text-sm font-semibold leading-none text-white shadow-none hover:bg-neutral-600 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              if (!feedbackText.trim()) return;
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
            {addFeedbackMutation.isPending ? "Saving…" : "Save Feedback"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
