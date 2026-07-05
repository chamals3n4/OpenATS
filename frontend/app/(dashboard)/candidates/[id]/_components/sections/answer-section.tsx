"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { QuestionIcon } from "@hugeicons/core-free-icons";

export function AnswersSection({ candidate }: { candidate: any }) {
  return (
    <div className="p-5 sm:p-6">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
          Candidate Answers
        </h3>
        <p className="text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
          Responses to custom application questions
        </p>
      </div>
      {candidate.answers.length === 0 && candidate.selections.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/30 px-6 py-12 text-center">
          <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
            <HugeiconsIcon
              icon={QuestionIcon}
              className="size-5 text-slate-300 dark:text-neutral-600"
            />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-neutral-400">
            No answers submitted
          </p>
          <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1">
            This candidate did not provide custom answers or selections.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {candidate.answers.map((a: any) => (
            <div
              key={a.id}
              className="rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden"
            >
              <div className="px-4 py-3 bg-slate-50 dark:bg-neutral-800/50 border-b border-slate-100 dark:border-neutral-800">
                <p className="text-xs font-semibold text-slate-600 dark:text-neutral-300">
                  {a.questionTitle || `Question #${a.questionId}`}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm text-slate-700 dark:text-neutral-300 leading-relaxed">
                  {a.answerText ?? (
                    <em className="text-slate-400 dark:text-neutral-500">
                      No text answer
                    </em>
                  )}
                </p>
              </div>
            </div>
          ))}
          {candidate.selections.length > 0 && (
            <div className="rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
              {(
                Array.from(
                  new Set(
                    candidate.selections.map(
                      (s: any) =>
                        s.questionTitle || `Question #${s.questionId}`,
                    ),
                  ),
                ) as string[]
              ).map((title) => (
                <div
                  key={title}
                  className="px-4 py-3 border-b border-slate-100 dark:border-neutral-800 last:border-0"
                >
                  <p className="text-xs font-semibold text-slate-600 dark:text-neutral-300 mb-2">
                    {title}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {candidate.selections
                      .filter(
                        (s: any) =>
                          (s.questionTitle || `Question #${s.questionId}`) ===
                          title,
                      )
                      .map((s: any) => (
                        <span
                          key={s.id}
                          className="text-xs bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 px-3 py-1.5 rounded-md font-medium border border-slate-200 dark:border-neutral-700"
                        >
                          {s.optionLabel || `Option #${s.optionId}`}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
