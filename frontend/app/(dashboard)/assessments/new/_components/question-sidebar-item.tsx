"use client";

import type { Ref } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { DragDropVerticalIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { useDragSort } from "@/hooks/use-drag-sort";
import { questionTypeLabel, type Question } from "../lib/assessment-builder-types";
import { questionProblem } from "../lib/assessment-builder-utils";

interface QuestionSidebarItemProps {
  question: Question;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  canRemove: boolean;
  onMove: (from: number, to: number) => void;
  readOnly?: boolean;
}

/** One question in the list: its number, what it asks, its kind, and whether it is finished. */
export function QuestionSidebarItem({
  question,
  index,
  isSelected,
  onSelect,
  onRemove,
  canRemove,
  onMove,
  readOnly,
}: QuestionSidebarItemProps) {
  const { ref, isDragging, isOver } = useDragSort({
    id: question.uid,
    index,
    type: "ASSESSMENT_QUESTION",
    onMove,
  });

  const problem = readOnly ? null : questionProblem(question);

  return (
    <div
      ref={readOnly ? undefined : (ref as Ref<HTMLDivElement>)}
      className={`group flex items-stretch rounded-md border transition-colors ${
        isDragging
          ? "border-transparent bg-slate-100 opacity-40 dark:bg-neutral-800"
          : isOver
            ? "border-theme/40 bg-theme/5"
            : isSelected
              ? "border-theme bg-theme/10"
              : "border-slate-300 bg-white hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
      }`}
    >
      {!readOnly && (
        <span
          aria-hidden
          title="Drag to reorder"
          className="flex cursor-grab items-center pl-2 text-slate-400 active:cursor-grabbing dark:text-neutral-500"
        >
          <HugeiconsIcon icon={DragDropVerticalIcon} className="size-4" />
        </span>
      )}

      <button
        type="button"
        onClick={onSelect}
        aria-current={isSelected ? "true" : undefined}
        className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 px-2.5 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme/40"
      >
        <span
          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ${
            isSelected ? "bg-theme text-white" : "bg-slate-200 text-slate-700 dark:bg-neutral-700 dark:text-neutral-200"
          }`}
        >
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-sm font-semibold ${
              question.title.trim()
                ? "text-slate-900 dark:text-neutral-100"
                : "text-slate-500 dark:text-neutral-400"
            }`}
          >
            {question.title.trim() || "Untitled question"}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-600 dark:text-neutral-400">
            {questionTypeLabel(question.type)}
            {problem && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate font-medium text-amber-700 dark:text-amber-400">{problem}</span>
              </>
            )}
          </span>
        </span>
      </button>

      {!readOnly && canRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Delete question ${index + 1}`}
          title="Delete question"
          className="flex cursor-pointer items-center rounded-r-md px-2 text-slate-500 opacity-0 transition-opacity hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 dark:text-neutral-400"
        >
          <HugeiconsIcon icon={Delete02Icon} className="size-4" strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}
