"use client";

import type { Answer, Question } from "../../_lib/assessment-types";
import { isAnswered } from "../../_lib/assessment-utils";

interface QuestionNavigatorProps {
  questions: Question[];
  currentQ: number;
  answers: Record<number, Answer>;
  onQuestionClick: (index: number) => void;
}

/** Question number buttons */
export function QuestionNavigator({ questions, currentQ, answers, onQuestionClick }: QuestionNavigatorProps) {
  return (
    <nav aria-label="Questions">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">Questions</h2>
      <ol className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-2">
        {questions.map((question, index) => {
          const answered = isAnswered(question, answers);
          const current = index === currentQ;
          return (
            <li key={question.id}>
              <button
                type="button"
                aria-current={current ? "step" : undefined}
                aria-label={`Question ${index + 1}, ${answered ? "answered" : "not answered"}`}
                onClick={() => onQuestionClick(index)}
                className={`flex h-9 w-full cursor-pointer items-center justify-center rounded-md text-sm font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme ${
                  answered
                    ? "bg-theme text-white"
                    : "bg-white text-slate-700 dark:bg-neutral-900 dark:text-neutral-300"
                } ${
                  answered
                    ? "border border-theme"
                    : current
                      ? "border-2 border-theme"
                      : "border border-slate-300 hover:border-slate-400 dark:border-neutral-700"
                }`}
              >
                {index + 1}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-slate-600 dark:text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-sm bg-theme" />
          Answered
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-sm border border-slate-300 dark:border-neutral-600" />
          Not answered
        </span>
      </div>
    </nav>
  );
}
