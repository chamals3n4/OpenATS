"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Question, QuestionType } from "../lib/assessment-builder-types";
import { inputCls, textareaCls } from "../lib/assessment-builder-constants";
import { QuestionTypeSelector } from "./question-type-selector";
import { AnswerOptionsEditor } from "./answer-option-editor";

interface QuestionEditorProps {
  question: Question;
  index: number;
  onUpdate: (qId: number, patch: Partial<Question>) => void;
  onChangeType: (qId: number, type: QuestionType) => void;
  onAddOption: (qId: number) => void;
  onRemoveOption: (qId: number, optId: number) => void;
  onUpdateOptionText: (qId: number, optId: number, text: string) => void;
  onToggleCorrect: (qId: number, optId: number) => void;
  onRemoveQuestion: (qId: number) => void;
  canRemove: boolean;
}

export function QuestionEditor({
  question,
  index,
  onUpdate,
  onChangeType,
  onAddOption,
  onRemoveOption,
  onUpdateOptionText,
  onToggleCorrect,
  onRemoveQuestion,
  canRemove,
}: QuestionEditorProps) {
  const isShortAnswer = question.type === "Short Answer";
  const isTrueFalse = question.type === "True/False";

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-5 bg-white dark:bg-neutral-950">
      <div className="border border-slate-200 dark:border-neutral-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
            Question Details
          </span>
          <button
            onClick={() => onRemoveQuestion(question.uid)}
            disabled={!canRemove}
            className="text-slate-300 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Remove question"
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-4" />
          </button>
        </div>

        <div>
          <Label className="text-sm font-medium text-slate-600 dark:text-neutral-400 mb-1.5 block">
            Question Title
          </Label>
          <Input
            placeholder="What is your question?"
            value={question.title}
            onChange={(e) => onUpdate(question.uid, { title: e.target.value })}
            className={inputCls}
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-slate-600 dark:text-neutral-400 mb-1.5 block">
            Description{" "}
            <span className="text-slate-400 dark:text-neutral-500 font-normal">
              (optional)
            </span>
          </Label>
          <textarea
            placeholder="Add more context for this question ..."
            rows={2}
            value={question.description}
            onChange={(e) =>
              onUpdate(question.uid, { description: e.target.value })
            }
            className={textareaCls}
          />
        </div>

        <QuestionTypeSelector
          question={question}
          onChangeType={onChangeType}
        />
      </div>

      {isShortAnswer ? (
        <div className="border border-slate-200 dark:border-neutral-800 rounded-xl p-6">
          <p className="text-sm text-slate-500 dark:text-neutral-400">
            Short answer questions are reviewed manually by the hiring team.
          </p>
        </div>
      ) : (
        <AnswerOptionsEditor
          question={question}
          isTrueFalse={isTrueFalse}
          onAddOption={() => onAddOption(question.uid)}
          onRemoveOption={(optId) => onRemoveOption(question.uid, optId)}
          onUpdateOptionText={(optId, text) =>
            onUpdateOptionText(question.uid, optId, text)
          }
          onToggleCorrect={(optId) => onToggleCorrect(question.uid, optId)}
        />
      )}
    </div>
  );
}
