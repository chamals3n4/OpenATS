"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon } from "@hugeicons/core-free-icons";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { LOW_TIME_SECONDS, formatTime } from "../../_lib/assessment-constants";
import type { Answer, AttemptData } from "../../_lib/assessment-types";
import { countAnswered } from "../../_lib/assessment-utils";
import { QuestionCard } from "./question-card";
import { QuestionNavigator } from "./question-navigator";
import { ReviewDialog } from "./review-dialog";

interface QuizScreenProps {
  attempt: AttemptData;
  currentQ: number;
  answers: Record<number, Answer>;
  timeLeft: number;
  submitting: boolean;
  submitError: string | null;
  /** True when the last attempt to save an answer failed. */
  saveFailed: boolean;
  onAnswerChange: (questionId: number, answer: Answer) => void;
  onAnswerCommit: (questionId: number, answer: Answer) => void;
  onNavigate: (direction: "prev" | "next") => void;
  onQuestionClick: (index: number) => void;
  onSubmit: () => void;
}

export function QuizScreen({
  attempt,
  currentQ,
  answers,
  timeLeft,
  submitting,
  submitError,
  saveFailed,
  onAnswerChange,
  onAnswerCommit,
  onNavigate,
  onQuestionClick,
  onSubmit,
}: QuizScreenProps) {
  // Submitting takes two steps: look over the list, then confirm.
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const questions = attempt.assessment.questions;
  const total = questions.length;
  const question = questions[currentQ];
  const answered = countAnswered(questions, answers);
  const unanswered = total - answered;
  const lowTime = timeLeft <= LOW_TIME_SECONDS;
  const isLast = currentQ === total - 1;

  if (!question) return null;

  const submitButton = (extra = "") => (
    <Button
      type="button"
      onClick={() => setReviewOpen(true)}
      disabled={submitting}
      className={`h-10 cursor-pointer rounded-md border-none bg-theme px-5 text-sm font-semibold text-white shadow-none hover:bg-theme-hover ${extra}`}
    >
      {submitting ? "Submitting" : "Submit assessment"}
    </Button>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-white dark:bg-neutral-950">
      <header className="sticky top-0 z-10 bg-white dark:bg-neutral-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-neutral-100">
              {attempt.assessment.title}
            </h1>
            <p className="truncate text-[15px] text-slate-500 dark:text-neutral-400">
              {[
                // "Software Engineer at Acme", or whichever of the two is known.
                [attempt.jobTitle, attempt.company?.name].filter(Boolean).join(" at "),
                `${answered} of ${total} answered`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div
            role="timer"
            aria-label="Time left"
            className={`flex shrink-0 items-center gap-2.5 rounded-md border px-4 py-2 ${
              lowTime
                ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400"
                : "border-slate-300 text-slate-900 dark:border-neutral-700 dark:text-neutral-100"
            }`}
          >
            <HugeiconsIcon icon={Clock01Icon} className="size-5" strokeWidth={2} />
            <span className="text-2xl font-semibold tabular-nums leading-none">{formatTime(timeLeft)}</span>
          </div>
        </div>
        {/* A pale line that fills with the theme colour as questions are answered. */}
        <div
          role="progressbar"
          aria-label="Questions answered"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={answered}
          className="h-1 bg-slate-200 dark:bg-neutral-800"
        >
          <div
            className="h-full bg-theme transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${total > 0 ? (answered / total) * 100 : 0}%` }}
          />
        </div>
      </header>

      {/* Read out once when the clock turns red, not every second. */}
      <p aria-live="assertive" className="sr-only">
        {lowTime && timeLeft > 0 ? "Less than two minutes left." : ""}
      </p>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:gap-12">
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-2xl">
            <QuestionCard
              key={question.id}
              question={question}
              number={currentQ + 1}
              total={total}
              answer={answers[question.id]}
              onAnswerChange={(answer) => onAnswerChange(question.id, answer)}
              onCommit={(answer) => onAnswerCommit(question.id, answer)}
            />

            {saveFailed && (
              <p role="alert" className="mt-5 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                We could not save your last answer. Check your connection. It will be sent again when you move to
                another question or submit.
              </p>
            )}
            {submitError && (
              <p role="alert" className="mt-5 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
                {submitError}
              </p>
            )}

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-neutral-800">
              <Button
                type="button"
                variant="cancel"
                onClick={() => onNavigate("prev")}
                disabled={currentQ === 0 || submitting}
                className="h-10 cursor-pointer gap-1.5 rounded-md pl-3 pr-4 text-sm"
              >
                <ChevronLeft className="size-4" strokeWidth={2} />
                Previous
              </Button>
              {isLast ? (
                submitButton()
              ) : (
                <Button
                  type="button"
                  onClick={() => onNavigate("next")}
                  disabled={submitting}
                  className="h-10 cursor-pointer gap-1.5 rounded-md border-none bg-theme pl-5 pr-4 text-sm font-semibold text-white shadow-none hover:bg-theme-hover"
                >
                  Next
                  <ChevronRight className="size-4" strokeWidth={2} />
                </Button>
              )}
            </div>
          </div>
        </main>

        <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-64 lg:self-start">
          <div className="rounded-lg border border-slate-300 p-4 dark:border-neutral-700">
            <QuestionNavigator
              questions={questions}
              currentQ={currentQ}
              answers={answers}
              onQuestionClick={onQuestionClick}
            />
            {!isLast && <div className="mt-5 border-t border-slate-200 pt-4 dark:border-neutral-800">{submitButton("w-full")}</div>}
          </div>
        </aside>
      </div>

      <ReviewDialog
        open={reviewOpen}
        questions={questions}
        answers={answers}
        onClose={() => setReviewOpen(false)}
        onGoTo={(index) => {
          setReviewOpen(false);
          onQuestionClick(index);
        }}
        onContinue={() => {
          setReviewOpen(false);
          setConfirmOpen(true);
        }}
      />

      <ConfirmDeleteDialog
        open={confirmOpen}
        title="Submit your assessment?"
        description={
          unanswered > 0
            ? `You have not answered ${unanswered} of ${total} question${total === 1 ? "" : "s"}. After you submit, you cannot change anything.`
            : "You have answered every question. After you submit, you cannot change anything."
        }
        confirmLabel="Submit"
        pendingLabel="Submitting"
        confirmClassName="bg-theme hover:bg-theme-hover"
        isPending={submitting}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onSubmit();
        }}
      />
    </div>
  );
}
