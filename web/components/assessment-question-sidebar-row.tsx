"use client";

import type { Ref } from "react";
import {
  CheckmarkCircle01Icon,
  Delete02Icon,
  DragDropVerticalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { useDragSort } from "@/hooks/use-drag-sort";

export type AssessmentSidebarQuestion = {
  uid: number;
  title: string;
  type: string;
};

type Props = {
  q: AssessmentSidebarQuestion;
  idx: number;
  selected: boolean;
  questionsLength: number;
  hasCorrect: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onReorder: (from: number, to: number) => void;
};

/**
 * Stable list row for create/edit assessment sidebars. Drag starts from the grip only
 * so row clicks (select question) register on the first try.
 */
export function AssessmentQuestionSidebarRow({
  q,
  idx,
  selected,
  questionsLength,
  hasCorrect,
  onSelect,
  onRemove,
  onReorder,
}: Props) {
  const { ref, dragHandleRef, isDragging, isOver } = useDragSort({
    id: q.uid,
    index: idx,
    type: "ASSESSMENT_QUESTION",
    onMove: onReorder,
    dragHandleOnly: true,
  });

  return (
    <div
      ref={ref as Ref<HTMLDivElement>}
      className={`w-full text-left rounded-lg px-3.5 py-3 flex items-center gap-3 transition-all border cursor-pointer group ${
        isDragging
          ? "opacity-40 border-transparent bg-slate-100 dark:bg-neutral-800"
          : isOver
            ? "border-[var(--theme-color)]/30 bg-[var(--theme-color)]/5"
            : selected
              ? "bg-[var(--theme-color)]/5 border-[var(--theme-color)]/20"
              : "bg-slate-50 dark:bg-neutral-900 border-transparent text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800"
      }`}
      onClick={onSelect}
    >
      <span
        ref={dragHandleRef as Ref<HTMLSpanElement>}
        className="shrink-0 inline-flex cursor-grab active:cursor-grabbing touch-none text-slate-300"
        aria-label="Drag to reorder"
        onClick={(e) => e.stopPropagation()}
      >
        <HugeiconsIcon icon={DragDropVerticalIcon} className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-[13px] font-semibold truncate ${selected ? "text-[var(--theme-color)]" : ""}`}
        >
          Q{idx + 1}: {q.title || "Question Title"}
        </p>
        <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-0.5">
          {q.type}
        </p>
      </div>
      {hasCorrect && (
        <HugeiconsIcon
          icon={CheckmarkCircle01Icon}
          className="size-4 text-emerald-500 shrink-0 mr-1"
        />
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={`text-slate-400 hover:text-red-500 transition-opacity p-1 -mr-1 shrink-0 ${questionsLength === 1 ? "opacity-0 cursor-not-allowed" : "opacity-0 group-hover:opacity-100"}`}
        disabled={questionsLength === 1}
        title="Delete question"
      >
        <HugeiconsIcon icon={Delete02Icon} className="size-4" />
      </button>
    </div>
  );
}
