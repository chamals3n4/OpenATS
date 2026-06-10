"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAttemptResults } from "@/hooks/queries/use-assessments";

export function AssessmentResultsSheetContent({
  attemptId,
}: {
  attemptId: number | null;
}) {
  const { data, isLoading, isError } = useAttemptResults(attemptId ?? 0, {
    enabled: attemptId !== null,
  });

  if (attemptId === null) return null;

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-neutral-950/30">
        <div className="size-6 border-2 border-slate-200 dark:border-neutral-700 border-t-[var(--theme-color)] rounded-full animate-spin mb-2" />
        <p className="text-sm font-medium text-slate-400 dark:text-neutral-500">
          Loading results…
        </p>
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50/50 dark:bg-neutral-950/30">
        <p className="text-sm font-medium text-red-500">
          Failed to load assessment answers.
        </p>
      </div>
    );
  }

  const { attempt, questions } = data.data;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-neutral-950/30 divide-y divide-slate-200 dark:divide-neutral-800">
      <div className="p-5 bg-white dark:bg-neutral-900 space-y-3">
        <div>
          <h4 className="text-[15px] font-bold text-slate-800 dark:text-neutral-200">
            {attempt.assessmentTitle}
          </h4>
          {attempt.assessmentDescription && (
            <p className="text-[12px] text-slate-400 dark:text-neutral-500 mt-0.5">
              {attempt.assessmentDescription}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
              Candidate
            </span>
            <p className="text-[13px] font-bold text-slate-800 dark:text-neutral-200 mt-0.5">
              {attempt.candidateName}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
              {attempt.candidateEmail}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
              Score / Result
            </span>
            {attempt.scorePercentage != null ? (
              <p className="text-[13px] font-bold mt-0.5">
                <span
                  className={
                    attempt.passed
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-500 dark:text-rose-400"
                  }
                >
                  {Math.round(attempt.scorePercentage)}%
                </span>
                <span className="text-slate-400 dark:text-neutral-500 font-medium">
                  {" "}
                  ({attempt.scoreRaw} / {attempt.scoreTotal} pts)
                </span>
              </p>
            ) : (
              <p className="text-[13px] text-slate-500 dark:text-neutral-400 font-medium mt-0.5">
                —
              </p>
            )}
            <p
              className={`text-[11px] font-bold mt-0.5 uppercase tracking-wide ${attempt.passed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}
            >
              {attempt.passed ? "Passed" : "Not Passed"}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <h5 className="text-[12px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
          Questions &amp; Answers
        </h5>
        {questions.map((q: any, idx: number) => {
          const hasAnswer = q.answer !== null;

          return (
            <div
              key={q.id}
              className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
                    Question {idx + 1}
                  </span>
                  <h6 className="text-[13px] font-bold text-slate-800 dark:text-neutral-200 leading-snug">
                    {q.title}
                  </h6>
                  {q.description && (
                    <p className="text-[12px] text-slate-400 dark:text-neutral-500">
                      {q.description}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
                    Points
                  </span>
                  <p className="text-[12px] font-bold text-slate-800 dark:text-neutral-200 mt-0.5">
                    {hasAnswer && q.answer!.pointsEarned !== null ? (
                      <span
                        className={
                          q.answer!.pointsEarned > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-500 dark:text-neutral-400"
                        }
                      >
                        {q.answer!.pointsEarned}
                      </span>
                    ) : (
                      <span>0</span>
                    )}
                    <span className="text-slate-400 dark:text-neutral-500 font-medium">
                      {" "}
                      / {q.points}
                    </span>
                  </p>
                </div>
              </div>

              {q.questionType === "text" ? (
                <div className="space-y-1 bg-slate-50 dark:bg-neutral-950 p-3 rounded-lg border border-slate-100 dark:border-neutral-800/60">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                    Candidate Response
                  </span>
                  <p className="text-[12px] text-slate-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                    {q.answer?.answerText || (
                      <span className="text-slate-400 dark:text-neutral-500 italic">
                        No answer submitted
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wide block mb-1">
                    Options
                  </span>
                  <div className="grid gap-2">
                    {q.options.map((opt: any) => {
                      const isSelected =
                        q.answer?.selectedOptionIds?.includes(opt.id) ?? false;
                      const isCorrect = opt.isCorrect;

                      let borderClass =
                        "border-slate-100 dark:border-neutral-800/60";
                      let bgClass = "bg-slate-50/50 dark:bg-neutral-950/20";
                      let badge = null;

                      if (isCorrect) {
                        borderClass =
                          "border-emerald-200 dark:border-emerald-800";
                        bgClass = "bg-emerald-50/30 dark:bg-emerald-950/10";
                      }

                      if (isSelected) {
                        if (isCorrect) {
                          badge = (
                            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 px-2 py-0.5 rounded uppercase tracking-wide">
                              Correct Choice
                            </span>
                          );
                        } else {
                          borderClass = "border-rose-200 dark:border-rose-800";
                          bgClass = "bg-rose-50/20 dark:bg-rose-950/10";
                          badge = (
                            <span className="text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400 px-2 py-0.5 rounded uppercase tracking-wide">
                              Incorrect Choice
                            </span>
                          );
                        }
                      } else if (isCorrect) {
                        badge = (
                          <span className="text-[9px] font-bold bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400 px-2 py-0.5 rounded uppercase tracking-wide">
                            Correct Answer
                          </span>
                        );
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center justify-between gap-3 border px-3 py-2 rounded-lg ${borderClass} ${bgClass}`}
                        >
                          <span className="text-[12px] font-medium text-slate-700 dark:text-neutral-300">
                            {opt.label}
                          </span>
                          {badge}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
