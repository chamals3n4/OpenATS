"use client";

import { useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DragDropVerticalIcon,
  Delete02Icon,
  CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons";
import { useDragSort } from "@/hooks/use-drag-sort";
import type { Question } from "../lib/assessment-builder-types";

interface QuestionSidebarItemProps {
  question: Question;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  canRemove: boolean;
  onMove: (from: number, to: number) => void;
}

export function QuestionSidebarItem({
  question,
  index,
  isSelected,
  onSelect,
  onRemove,
  canRemove,
  onMove,
}: QuestionSidebarItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { isDragging, isOver } = useDragSort({
    id: question.uid,
    index,
    type: "ASSESSMENT_QUESTION",
    onMove,
  });

  const hasCorrect = question.options.some((o) => o.isCorrect);

  return (
    <div
      ref={ref}
      className={`w-full text-left rounded-lg px-3.5 py-3 flex items-center gap-3 transition-all border cursor-pointer group ${
        isDragging
          ? "opacity-40 border-transparent bg-slate-100 dark:bg-neutral-800"
          : isOver
            ? "border-[var(--theme-color)]/30 bg-[var(--theme-color)]/5"
            : isSelected
              ? "bg-[var(--theme-color)]/5 border-[var(--theme-color)]/20"
              : "bg-slate-50 dark:bg-neutral-900 border-transparent text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800"
      }`}
      onClick={onSelect}
    >
      <HugeiconsIcon
        icon={DragDropVerticalIcon}
        className="size-4 text-slate-300 shrink-0 cursor-grab active:cursor-grabbing"
      />
      <div className="min-w-0 flex-1">
        <p
          className={`text-[13px] font-semibold truncate ${isSelected ? "text-[var(--theme-color)]" : ""}`}
        >
          Q{index + 1}: {question.title || "Question Title"}
        </p>
        <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-0.5">
          {question.type}
        </p>
      </div>
      {hasCorrect && (
        <HugeiconsIcon
          icon={CheckmarkCircle01Icon}
          className="size-4 text-emerald-500 shrink-0 mr-1"
        />
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={`text-slate-400 hover:text-red-500 transition-opacity p-1 -mr-1 shrink-0 ${
          canRemove
            ? "opacity-0 group-hover:opacity-100"
            : "opacity-0 cursor-not-allowed"
        }`}
        disabled={!canRemove}
        title="Delete question"
      >
        <HugeiconsIcon icon={Delete02Icon} className="size-4" />
      </button>
    </div>
  );
}
