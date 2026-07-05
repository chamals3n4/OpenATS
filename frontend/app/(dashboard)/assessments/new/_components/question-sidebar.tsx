"use client";

import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import type { Question } from "../lib/assessment-builder-types";
import { QuestionSidebarItem } from "./question-sidebar-item";

interface QuestionSidebarProps {
  questions: Question[];
  selectedQ: number;
  onSelect: (uid: number) => void;
  onAdd: () => void;
  onRemove: (uid: number) => void;
  onMove: (from: number, to: number) => void;
}

export function QuestionSidebar({
  questions,
  selectedQ,
  onSelect,
  onAdd,
  onRemove,
  onMove,
}: QuestionSidebarProps) {
  return (
    <div className="w-[280px] border-r border-slate-100 dark:border-neutral-800 flex flex-col shrink-0 bg-white dark:bg-neutral-950">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-neutral-800">
        <span className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
          Questions ({questions.length})
        </span>
      </div>

      <div className="p-4">
        <Button
          onClick={onAdd}
          className="w-full bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white h-10 rounded-lg shadow-none border-none font-medium text-sm gap-2 transition-all active:scale-[0.98]"
        >
          <HugeiconsIcon
            icon={PlusSignIcon}
            className="size-4"
            strokeWidth={2.5}
          />
          Add Question
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {questions.map((q, idx) => (
          <QuestionSidebarItem
            key={q.uid}
            question={q}
            index={idx}
            isSelected={selectedQ === q.uid}
            onSelect={() => onSelect(q.uid)}
            onRemove={() => onRemove(q.uid)}
            canRemove={questions.length > 1}
            onMove={onMove}
          />
        ))}
      </div>
    </div>
  );
}
