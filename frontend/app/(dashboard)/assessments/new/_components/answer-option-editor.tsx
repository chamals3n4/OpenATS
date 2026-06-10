"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  Delete02Icon,
  CheckmarkCircle01Icon,
  RadioButtonIcon,
  TickDouble01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import type { Question } from "../lib/assessment-builder-types";

interface AnswerOptionsEditorProps {
  question: Question;
  isTrueFalse: boolean;
  onAddOption: () => void;
  onRemoveOption: (optId: number) => void;
  onUpdateOptionText: (optId: number, text: string) => void;
  onToggleCorrect: (optId: number) => void;
}

export function AnswerOptionsEditor({
  question,
  isTrueFalse,
  onAddOption,
  onRemoveOption,
  onUpdateOptionText,
  onToggleCorrect,
}: AnswerOptionsEditorProps) {
  const correctLabel = question.options.find((o) => o.isCorrect)?.text ?? null;

  return (
    <div className="border border-slate-200 dark:border-neutral-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-slate-700 dark:text-neutral-300">
          Answer Options
        </h3>
        <span className="text-[11px] text-slate-400">
          Click {isTrueFalse ? "True or False" : "the circle"} to mark correct
          answer
        </span>
      </div>

      <div className="space-y-3">
        {question.options.map((opt) => (
          <div
            key={opt.id}
            className={`flex items-center gap-3 border rounded-lg px-4 py-3 transition-all ${
              opt.isCorrect
                ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20"
                : "border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
            }`}
          >
            <button
              onClick={() => onToggleCorrect(opt.id)}
              title="Mark as correct answer"
              className="shrink-0 transition-colors"
            >
              <HugeiconsIcon
                icon={opt.isCorrect ? CheckmarkCircle01Icon : RadioButtonIcon}
                className={`size-5 transition-colors ${
                  opt.isCorrect
                    ? "text-emerald-500"
                    : "text-slate-300 dark:text-neutral-600 hover:text-slate-500 dark:hover:text-neutral-400"
                }`}
              />
            </button>

            <input
              type="text"
              value={opt.text}
              onChange={(e) => onUpdateOptionText(opt.id, e.target.value)}
              disabled={isTrueFalse}
              className={`flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-neutral-600 ${
                opt.isCorrect
                  ? "text-emerald-700 dark:text-emerald-400 font-medium"
                  : "text-slate-700 dark:text-neutral-300"
              } disabled:cursor-default`}
            />

            {opt.isCorrect && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full shrink-0">
                Correct
              </span>
            )}

            {!isTrueFalse && (
              <button
                onClick={() => onRemoveOption(opt.id)}
                disabled={question.options.length <= 2}
                className="text-slate-300 hover:text-red-400 transition-colors p-0.5 rounded shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <HugeiconsIcon icon={Delete02Icon} className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {!isTrueFalse && (
        <Button
          onClick={onAddOption}
          variant="outline"
          className="h-9 px-4 border-[var(--theme-color)] text-[var(--theme-color)] hover:bg-[var(--theme-color)]/5 rounded-lg shadow-none text-[13px] font-medium transition-all"
        >
          <HugeiconsIcon
            icon={PlusSignIcon}
            className="size-3.5 mr-1.5"
            strokeWidth={2.5}
          />
          Add Answer Option
        </Button>
      )}

      {correctLabel && (
        <div className="flex items-center gap-2 pt-1">
          <HugeiconsIcon
            icon={TickDouble01Icon}
            className="size-4 text-emerald-500"
          />
          <span className="text-[12px] text-emerald-600 font-medium">
            Correct answer set to: <strong>{correctLabel}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
