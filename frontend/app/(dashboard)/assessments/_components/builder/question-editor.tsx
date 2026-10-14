"use client";

import { Textarea } from "@/components/ui/textarea";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Question, QuestionType } from "../../_lib/assessment-builder-types";
import { inputCls, textareaCls } from "../../_lib/assessment-builder-constants";
import { QuestionTypeSelector } from "./question-type-selector";
import { AnswerOptionsEditor } from "./answer-option-editor";
import { PointsField } from "./points-field";
import { isWrittenType } from "../../_lib/assessment-builder-utils";

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
  /** For someone who may look at the assessment but not change it. */
  readOnly?: boolean;
}

const labelCls = "mb-2 block text-sm font-medium text-slate-700 dark:text-neutral-300";

/** One question, in the order it is written: what is asked, how it is answered, then the answers. */
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
  readOnly,
}: QuestionEditorProps) {
  const isWritten = isWrittenType(question.type);
  const isTrueFalse = question.type === "true_false";
  const number = index + 1;

  return (
    // Plain sections on the page, divided by lines. No cards: the page is already the frame.
    <div className="min-h-0 flex-1 overflow-y-auto bg-white dark:bg-neutral-950">
      <div className="divide-y divide-slate-300 dark:divide-neutral-700">
        <section>
          {/* Stays at the top of this pane while the question scrolls under it. */}
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-slate-300 bg-white px-4 sm:px-8 dark:border-neutral-700 dark:bg-neutral-950">
            <h2 className="text-base font-semibold text-slate-900 dark:text-neutral-100">Question {number}</h2>
            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onRemoveQuestion(question.uid)}
                disabled={!canRemove}
                title={canRemove ? "Delete this question" : "An assessment needs at least one question"}
                className="h-8 cursor-pointer gap-1.5 px-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed dark:text-neutral-400 dark:hover:bg-red-950/30"
              >
                <HugeiconsIcon icon={Delete02Icon} className="size-4" strokeWidth={1.75} />
                Delete
              </Button>
            )}
          </header>

          <div className="max-w-4xl space-y-6 px-4 py-6 sm:px-8">
            <div>
              <Label htmlFor={`question-${question.uid}`} className={labelCls}>
                Question
              </Label>
              <Input
                id={`question-${question.uid}`}
                placeholder="What do you want to ask?"
                value={question.title}
                readOnly={readOnly}
                onChange={(e) => onUpdate(question.uid, { title: e.target.value })}
                className={`${inputCls} h-11 text-[15px]`}
              />
            </div>

            <div>
              <Label htmlFor={`description-${question.uid}`} className={labelCls}>
                Extra detail{" "}
                <span className="font-normal text-slate-500 dark:text-neutral-400">(optional)</span>
              </Label>
              <Textarea
                id={`description-${question.uid}`}
                placeholder="Anything the candidate needs to answer it: a scenario, a code sample, a limit."
                rows={2}
                value={question.description}
                readOnly={readOnly}
                onChange={(e) => onUpdate(question.uid, { description: e.target.value })}
                className={textareaCls}
              />
            </div>

            <QuestionTypeSelector question={question} onChangeType={onChangeType} readOnly={readOnly} />

            <PointsField
              id={`points-${question.uid}`}
              value={question.points}
              written={isWritten}
              multiSelect={question.type === "multiple"}
              disabled={readOnly}
              onChange={(points) => onUpdate(question.uid, { points })}
            />
          </div>
        </section>

        {isWritten ? (
          <section className="px-4 py-6 sm:px-8">
            <h3 className="text-base font-semibold text-slate-900 dark:text-neutral-100">Answers</h3>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-neutral-400">
              The candidate types {question.type === "long" ? "a longer answer" : "a short answer"}. There is
              nothing to mark as correct: after they finish, a reviewer reads it and awards up to{" "}
              {question.points} {question.points === 1 ? "point" : "points"}. The candidate&apos;s score is
              held back until every written answer is graded.
            </p>
          </section>
        ) : (
          <AnswerOptionsEditor
            question={question}
            isTrueFalse={isTrueFalse}
            readOnly={readOnly}
            onAddOption={() => onAddOption(question.uid)}
            onRemoveOption={(optId) => onRemoveOption(question.uid, optId)}
            onUpdateOptionText={(optId, text) => onUpdateOptionText(question.uid, optId, text)}
            onToggleCorrect={(optId) => onToggleCorrect(question.uid, optId)}
          />
        )}
      </div>
    </div>
  );
}
