"use client";

import type { Ref } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CircleIcon,
  DragDropVerticalIcon,
  Link01Icon,
  ParagraphIcon,
  TextIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { RowDeleteButton, RowEditButton } from "@/components/table/row-actions";
import { useDragSort } from "@/hooks/use-drag-sort";
import type { CustomQuestion } from "@/types";
import {
  QUESTION_TYPE_LABELS,
  isChoiceType,
  type QuestionType,
} from "../../lib/question-utils";

const TYPE_ICONS: Record<QuestionType, typeof TextIcon> = {
  short_answer: TextIcon,
  long_answer: ParagraphIcon,
  url: Link01Icon,
  radio: CircleIcon,
  checkbox: Tick02Icon,
};

const MAX_VISIBLE_OPTIONS = 4;

interface QuestionRowProps {
  question: CustomQuestion;
  index: number;
  canManage: boolean;
  onMove: (from: number, to: number) => void;
  onEdit: (question: CustomQuestion) => void;
  onDelete: (question: CustomQuestion) => void;
}

/**
 * A top-level component, not one defined inside the list's render: a component created during
 * render is a new type every time, so React would remount every row on each keystroke elsewhere.
 */
export function QuestionRow({ question, index, canManage, onMove, onEdit, onDelete }: QuestionRowProps) {
  const { ref, isDragging, isOver } = useDragSort({
    id: question.id,
    index,
    type: "CUSTOM_QUESTION",
    onMove,
  });

  const options = [...question.options].sort((a, b) => a.position - b.position);
  const shown = options.slice(0, MAX_VISIBLE_OPTIONS);
  const hidden = options.length - shown.length;

  return (
    <div
      ref={ref as Ref<HTMLDivElement>}
      className={`flex items-start gap-3 rounded-lg border bg-white px-4 py-4 dark:bg-neutral-900 ${
        isDragging
          ? "border-slate-300 opacity-40 dark:border-neutral-700"
          : isOver
            ? "border-theme bg-theme/5"
            : "border-slate-300 dark:border-neutral-700"
      }`}
    >
      {canManage && (
        <button
          type="button"
          aria-label={`Drag to reorder question ${index + 1}`}
          title="Drag to reorder"
          className="mt-0.5 cursor-grab rounded p-1 text-slate-400 hover:text-slate-700 active:cursor-grabbing dark:text-neutral-500 dark:hover:text-neutral-200"
        >
          <HugeiconsIcon icon={DragDropVerticalIcon} className="size-4" />
        </button>
      )}

      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-200">
        <HugeiconsIcon icon={TYPE_ICONS[question.questionType]} className="size-4" strokeWidth={1.75} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium leading-snug text-slate-900 dark:text-neutral-100">
          <span className="mr-2 text-slate-500 dark:text-neutral-400">{index + 1}.</span>
          {question.title}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-slate-500 dark:text-neutral-400">
          {QUESTION_TYPE_LABELS[question.questionType]}
          {question.isRequired && (
            <>
              <span aria-hidden>·</span>
              <span className="font-medium text-slate-700 dark:text-neutral-300">Required</span>
            </>
          )}
        </p>

        {isChoiceType(question.questionType) && (
          <ul aria-label="Options" className="mt-2.5 flex flex-wrap gap-1.5">
            {shown.map((o) => (
              <li
                key={o.id}
                className="rounded-md border border-slate-300 bg-slate-50 px-2.5 py-0.5 text-sm text-slate-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              >
                {o.label}
              </li>
            ))}
            {hidden > 0 && (
              <li className="px-1 py-0.5 text-sm text-slate-500 dark:text-neutral-400">
                +{hidden} more
              </li>
            )}
            {options.length === 0 && (
              <li className="text-sm font-medium text-amber-700 dark:text-amber-400">
                No options yet. Candidates have nothing to choose.
              </li>
            )}
          </ul>
        )}
      </div>

      {canManage && (
        <div className="flex shrink-0 items-center gap-2">
          <RowEditButton onClick={() => onEdit(question)} />
          <RowDeleteButton onClick={() => onDelete(question)} />
        </div>
      )}
    </div>
  );
}
