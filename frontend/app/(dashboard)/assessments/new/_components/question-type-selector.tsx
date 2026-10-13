"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkSquare02Icon,
  ParagraphIcon,
  RadioButtonIcon,
  TextIcon,
  ToggleOnIcon,
} from "@hugeicons/core-free-icons";
import { QUESTION_TYPES, type Question, type QuestionType } from "../lib/assessment-builder-types";

const ICONS: Record<QuestionType, typeof RadioButtonIcon> = {
  single: RadioButtonIcon,
  multiple: CheckmarkSquare02Icon,
  true_false: ToggleOnIcon,
  short: TextIcon,
  long: ParagraphIcon,
};

interface QuestionTypeSelectorProps {
  question: Question;
  onChangeType: (qId: number, type: QuestionType) => void;
  readOnly?: boolean;
}

/**
 * The kind of question, as a row of choices instead of a dropdown: there are only five, and
 * seeing them side by side with what each one asks of the candidate is what tells them apart.
 */
export function QuestionTypeSelector({ question, onChangeType, readOnly }: QuestionTypeSelectorProps) {
  return (
    <fieldset disabled={readOnly}>
      <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-neutral-300">Answer type</legend>
      <div role="radiogroup" aria-label="Answer type" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {QUESTION_TYPES.map(({ type, label, hint }) => {
          const chosen = question.type === type;
          return (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={chosen}
              onClick={() => onChangeType(question.uid, type)}
              className={`flex cursor-pointer flex-col items-start gap-1.5 rounded-md border px-3 py-2.5 text-left outline-none transition-colors focus-visible:border-theme disabled:cursor-default ${
                chosen
                  ? "border-theme bg-theme/10"
                  : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 dark:border-neutral-600 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              }`}
            >
              <HugeiconsIcon
                icon={ICONS[type]}
                strokeWidth={1.75}
                aria-hidden
                className={`size-4.5 ${chosen ? "text-theme dark:text-primary" : "text-slate-500 dark:text-neutral-400"}`}
              />
              <span>
                <span
                  className={`block text-sm font-semibold ${
                    chosen ? "text-theme dark:text-primary" : "text-slate-900 dark:text-neutral-100"
                  }`}
                >
                  {label}
                </span>
                <span className="block text-xs text-slate-600 dark:text-neutral-400">{hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
