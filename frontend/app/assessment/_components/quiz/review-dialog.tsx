"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Answer, Question } from "../../_lib/assessment-types";
import { isAnswered } from "../../_lib/assessment-utils";

interface ReviewDialogProps {
  open: boolean;
  questions: Question[];
  answers: Record<number, Answer>;
  onClose: () => void;
  /** Go to one question, to answer or change it. */
  onGoTo: (index: number) => void;
  /** Carry on to the final confirmation. */
  onContinue: () => void;
}

/** The step before submitting: every question, and whether it has an answer yet. */
export function ReviewDialog({ open, questions, answers, onClose, onGoTo, onContinue }: ReviewDialogProps) {
  const answered = questions.filter((question) => isAnswered(question, answers)).length;
  const unanswered = questions.length - answered;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[85dvh] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-xl border-slate-200 bg-white p-0 sm:max-w-[560px] dark:border-neutral-800 dark:bg-neutral-900">
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
            Review your answers
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-neutral-400">
            {unanswered === 0
              ? `You have answered all ${questions.length} questions.`
              : `You have answered ${answered} of ${questions.length}. Select a question to go back to it.`}
          </DialogDescription>
        </DialogHeader>

        <ol className="mx-6 my-5 min-h-0 flex-1 divide-y divide-slate-200 overflow-y-auto rounded-md border border-slate-300 dark:divide-neutral-800 dark:border-neutral-700">
          {questions.map((question, index) => {
            const done = isAnswered(question, answers);
            return (
              <li key={question.id}>
                <button
                  type="button"
                  onClick={() => onGoTo(index)}
                  className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-theme dark:hover:bg-neutral-800/60"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold tabular-nums text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-900 dark:text-neutral-100">
                    {question.title}
                  </span>
                  <span
                    className={`flex shrink-0 items-center gap-1.5 text-sm font-medium ${
                      done ? "text-theme dark:text-primary" : "text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    <span aria-hidden className={`size-2 rounded-full ${done ? "bg-theme" : "bg-amber-500"}`} />
                    {done ? "Answered" : "Not answered"}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <DialogFooter className="shrink-0 border-t border-slate-300 bg-slate-50 px-6 py-4 dark:border-neutral-700 dark:bg-neutral-950/50">
          <Button type="button" variant="cancel" onClick={onClose} className="h-9 cursor-pointer px-4 text-sm">
            Keep working
          </Button>
          <Button
            type="button"
            onClick={onContinue}
            className="h-9 cursor-pointer border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
          >
            Continue to submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
