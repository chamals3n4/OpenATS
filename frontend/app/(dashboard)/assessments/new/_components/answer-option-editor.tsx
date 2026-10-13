"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, Delete02Icon, PlusSignIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import type { Question } from "../lib/assessment-builder-types";

interface AnswerOptionsEditorProps {
  question: Question;
  isTrueFalse: boolean;
  onAddOption: () => void;
  onRemoveOption: (optId: number) => void;
  onUpdateOptionText: (optId: number, text: string) => void;
  onToggleCorrect: (optId: number) => void;
  readOnly?: boolean;
}

/**
 * The options of a choice question, and which of them is right. The mark beside each option has
 * the shape the candidate will see: a circle where one can be picked, a square where several can.
 */
export function AnswerOptionsEditor({
  question,
  isTrueFalse,
  onAddOption,
  onRemoveOption,
  onUpdateOptionText,
  onToggleCorrect,
  readOnly,
}: AnswerOptionsEditorProps) {
  const isMulti = question.type === "multiple";
  const hasCorrect = question.options.some((o) => o.isCorrect);

  return (
    <section>
      <header className="border-b border-slate-300 px-4 py-4 sm:px-8 dark:border-neutral-700">
        <h3 className="text-base font-semibold text-slate-900 dark:text-neutral-100">Answers</h3>
        <p className="mt-0.5 text-sm text-slate-600 dark:text-neutral-400">
          {isMulti
            ? "Tick every correct answer. Candidates can pick several."
            : "Select the one correct answer. Candidates can pick one."}
        </p>
      </header>

      <ul className="divide-y divide-slate-200 dark:divide-neutral-800">
        {question.options.map((opt, index) => (
          <li
            key={opt.id}
            className={`group flex items-center gap-3 px-4 py-2.5 sm:px-8 ${opt.isCorrect ? "bg-emerald-50/70 dark:bg-emerald-950/20" : ""}`}
          >
            <button
              type="button"
              role={isMulti ? "checkbox" : "radio"}
              aria-checked={opt.isCorrect}
              aria-label={`Mark "${opt.text || `Option ${index + 1}`}" as ${isMulti ? "a" : "the"} correct answer`}
              onClick={() => onToggleCorrect(opt.id)}
              disabled={readOnly}
              className={`flex size-5 shrink-0 cursor-pointer items-center justify-center border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-theme/40 disabled:cursor-default ${
                isMulti ? "rounded-[4px]" : "rounded-full"
              } ${
                opt.isCorrect
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-400 bg-white hover:border-slate-600 dark:border-neutral-500 dark:bg-neutral-900"
              }`}
            >
              {opt.isCorrect && <HugeiconsIcon icon={Tick02Icon} strokeWidth={3} className="size-3.5" aria-hidden />}
            </button>

            <input
              type="text"
              value={opt.text}
              onChange={(e) => onUpdateOptionText(opt.id, e.target.value)}
              disabled={isTrueFalse || readOnly}
              placeholder={`Option ${index + 1}`}
              aria-label={`Option ${index + 1}`}
              className="h-9 min-w-0 flex-1 bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-default dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />

            {opt.isCorrect && (
              <span className="shrink-0 text-xs font-semibold text-emerald-700 dark:text-emerald-400">Correct</span>
            )}

            {!isTrueFalse && !readOnly && (
              <button
                type="button"
                onClick={() => onRemoveOption(opt.id)}
                disabled={question.options.length <= 2}
                aria-label={`Remove option ${index + 1}`}
                title={question.options.length <= 2 ? "A question needs at least two options" : "Remove option"}
                className="shrink-0 cursor-pointer rounded-md p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 dark:text-neutral-400 dark:hover:bg-red-950/30"
              >
                <HugeiconsIcon icon={Delete02Icon} className="size-4" strokeWidth={1.75} />
              </button>
            )}
          </li>
        ))}
      </ul>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 px-4 py-3.5 sm:px-8 dark:border-neutral-700">
        {!isTrueFalse && !readOnly ? (
          <Button type="button" onClick={onAddOption} variant="cancel" className="h-9 cursor-pointer gap-1.5 px-3.5 text-sm">
            <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2} />
            Add option
          </Button>
        ) : (
          <span />
        )}

        {/* Said here, where it can be fixed, and not only when the whole assessment is saved. */}
        {!hasCorrect && !readOnly && (
          <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
            <HugeiconsIcon icon={Alert02Icon} className="size-4" strokeWidth={2} aria-hidden />
            {isMulti ? "No correct answers marked yet" : "No correct answer marked yet"}
          </p>
        )}
      </footer>

      {isMulti && (
        <p className="border-t border-slate-200 px-4 py-3 text-xs leading-relaxed text-slate-600 sm:px-8 dark:border-neutral-800 dark:text-neutral-400">
          Each correct pick earns an equal share of the points, and each wrong pick takes one share away,
          down to zero.
        </p>
      )}
    </section>
  );
}
