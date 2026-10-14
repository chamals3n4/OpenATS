"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Answer, Question } from "../../_lib/assessment-types";
import { isMultiSelect, isTextQuestion, wordCount } from "../../_lib/assessment-utils";

interface QuestionCardProps {
  question: Question;
  number: number;
  total: number;
  answer: Answer | undefined;
  onAnswerChange: (answer: Answer) => void;
  /** Called when an answer is done so it can be saved */
  onCommit: (answer: Answer) => void;
}

const optionCls =
  "flex cursor-pointer items-start gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3.5 text-base leading-snug text-slate-900 transition-[border-color,background-color] duration-150 hover:border-slate-400 has-data-checked:border-theme has-data-checked:bg-theme/5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-theme motion-reduce:transition-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:border-neutral-500 dark:has-data-checked:bg-theme/10";

export function QuestionCard({ question, number, total, answer, onAnswerChange, onCommit }: QuestionCardProps) {
  const text = isTextQuestion(question);
  const multi = isMultiSelect(question);
  const selected = answer?.optionIds ?? [];
  const titleId = `question-${question.id}-title`;
  // Show "5.00" as "5"
  const points = Number(question.points) || 0;

  const instruction = text
    ? question.questionType === "long_answer"
      ? "Write your answer"
      : "Write a short answer"
    : multi
      ? "Choose all that apply"
      : "Choose one";

  const pick = (optionIds: number[]) => {
    onAnswerChange({ optionIds });
    onCommit({ optionIds });
  };

  return (
    <article aria-labelledby={titleId}>
      <p className="text-[15px] font-medium text-slate-500 dark:text-neutral-400">
        Question {number} of {total}
        {points > 0 && (
          <span>
            {" "}
            · {points} point{points === 1 ? "" : "s"}
          </span>
        )}
      </p>
      <h2 id={titleId} className="mt-2 text-[22px] font-semibold leading-snug text-slate-900 sm:text-2xl dark:text-neutral-100">
        {question.title}
      </h2>
      {question.description && (
        <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-slate-600 dark:text-neutral-400">
          {question.description}
        </p>
      )}

      <p className="mb-3 mt-7 text-[15px] font-medium text-slate-700 dark:text-neutral-300">{instruction}</p>

      {text ? (
        <div>
          <textarea
            aria-labelledby={titleId}
            placeholder="Type your answer here"
            value={answer?.answerText ?? ""}
            onChange={(e) => onAnswerChange({ answerText: e.target.value })}
            onBlur={(e) => onCommit({ answerText: e.target.value })}
            rows={question.questionType === "long_answer" ? 9 : 3}
            className="w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-base leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-theme focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
          />
          <p className="mt-1.5 text-sm text-slate-500 dark:text-neutral-400">
            {wordCount(answer?.answerText ?? "")} words
          </p>
        </div>
      ) : multi ? (
        <div role="group" aria-labelledby={titleId} className="space-y-2.5">
          {question.options.map((option) => {
            const checked = selected.includes(option.id);
            return (
              <label key={option.id} className={optionCls}>
                <Checkbox
                  variant="theme"
                  checked={checked}
                  onCheckedChange={(next) =>
                    pick(next ? [...selected, option.id] : selected.filter((id) => id !== option.id))
                  }
                  className="mt-0.5 shrink-0"
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <RadioGroup
          aria-labelledby={titleId}
          value={selected[0] !== undefined ? String(selected[0]) : ""}
          onValueChange={(value) => value && pick([Number(value)])}
          className="gap-2.5"
        >
          {question.options.map((option) => (
            <label key={option.id} className={optionCls}>
              <RadioGroupItem variant="theme" value={String(option.id)} className="mt-0.5 shrink-0" />
              <span>{option.label}</span>
            </label>
          ))}
        </RadioGroup>
      )}
    </article>
  );
}
