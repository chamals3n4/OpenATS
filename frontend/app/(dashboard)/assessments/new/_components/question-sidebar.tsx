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
  readOnly?: boolean;
}

/** The questions of the assessment, in order, with the total they add up to. */
export function QuestionSidebar({
  questions,
  selectedQ,
  onSelect,
  onAdd,
  onRemove,
  onMove,
  readOnly,
}: QuestionSidebarProps) {
  const totalPoints = questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0);

  return (
    <aside className="flex min-h-0 w-[300px] shrink-0 flex-col border-r border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-950">
      {/* The same height as the "Question N" bar beside it, so the two lines under them meet. */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-300 px-4 dark:border-neutral-700">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
          {questions.length} {questions.length === 1 ? "question" : "questions"}
        </h2>
        <p className="text-sm tabular-nums text-slate-600 dark:text-neutral-400">
          {totalPoints} {totalPoints === 1 ? "point" : "points"}
        </p>
      </div>

      {/* Scrolls by itself, apart from the question being edited beside it. */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
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
            readOnly={readOnly}
          />
        ))}

        {/* Straight after the last question, which is where the new one will appear. */}
        {!readOnly && (
          <Button
            type="button"
            onClick={onAdd}
            className="h-10 w-full cursor-pointer gap-2 rounded-md border-none bg-theme text-sm font-semibold text-white shadow-none hover:bg-theme-hover"
          >
            <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2.5} />
            Add question
          </Button>
        )}
      </div>
    </aside>
  );
}
