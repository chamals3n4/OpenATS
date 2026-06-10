"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { RadioButtonIcon } from "@hugeicons/core-free-icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Question, QuestionType } from "../lib/assessment-builder-types";
import { Label } from "@/components/ui/label";

const QUESTION_TYPES: QuestionType[] = [
  "Multiple Choice",
  "Short Answer",
  "True/False",
];
const POINTS_OPTIONS = ["5", "10", "15", "20"];

interface QuestionTypeSelectorProps {
  question: Question;
  onChangeType: (qId: number, type: QuestionType) => void;
  onUpdatePoints: (points: string) => void;
}

export function QuestionTypeSelector({
  question,
  onChangeType,
  onUpdatePoints,
}: QuestionTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-5">
      <div>
        <Label className="text-[13px] font-medium text-slate-600 mb-1.5 block">
          Question Type
        </Label>
        <Select
          value={question.type}
          onValueChange={(val) =>
            onChangeType(question.uid, val as QuestionType)
          }
        >
          <SelectTrigger className="h-11 bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 rounded-lg shadow-none text-sm focus:ring-0 focus:border-slate-400 dark:focus:border-neutral-600 gap-2 transition-colors">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={RadioButtonIcon}
                className="size-4 text-slate-400 dark:text-neutral-500 shrink-0"
              />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            {QUESTION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5 block">
          Points
        </Label>
        <Select
          value={question.points}
          onValueChange={(val) => onUpdatePoints(val || "")}
        >
          <SelectTrigger className="h-11 bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 rounded-lg shadow-none text-sm focus:ring-0 focus:border-slate-400 dark:focus:border-neutral-600 transition-colors">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            {POINTS_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p} pts
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
