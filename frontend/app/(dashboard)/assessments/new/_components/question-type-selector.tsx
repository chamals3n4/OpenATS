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

interface QuestionTypeSelectorProps {
  question: Question;
  onChangeType: (qId: number, type: QuestionType) => void;
}

export function QuestionTypeSelector({
  question,
  onChangeType,
}: QuestionTypeSelectorProps) {
  return (
    <div>
      <Label className="text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1.5 block">
        Question Type
      </Label>
      <Select
        value={question.type}
        onValueChange={(val) =>
          onChangeType(question.uid, val as QuestionType)
        }
      >
        <SelectTrigger className="h-8 bg-gray-100 dark:bg-neutral-800 border-slate-300 dark:border-neutral-600 rounded-md shadow-none text-[13px] focus:ring-0 focus:border-slate-400 dark:focus:border-neutral-500 gap-2 transition-colors">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={RadioButtonIcon}
              className="size-3.5 text-slate-400 dark:text-neutral-500 shrink-0"
            />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-md shadow-lg border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900">
          {QUESTION_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
