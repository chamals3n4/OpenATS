"use client";

import { useState, use, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  useAssessment,
  useCreateAssessmentQuestion,
  useUpdateAssessmentQuestion,
  useDeleteAssessmentQuestion,
} from "@/hooks/queries/use-assessments";
import type { Ref } from "react";
import Link from "next/link";
import {
  PlusSignIcon,
  Delete02Icon,
  DragDropVerticalIcon,
  RadioButtonIcon,
  CheckmarkCircle01Icon,
  TickDouble01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useDragSort } from "@/hooks/use-drag-sort";
import { useCurrentUser } from "@/hooks/queries/use-user";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type QuestionType = "Multiple Choice" | "Short Answer" | "True/False";

interface AnswerOption {
  id: number;
  text: string;
  isCorrect: boolean;
}

interface Question {
  uid: number;
  dbId?: number;
  title: string;
  description: string;
  type: QuestionType;
  options: AnswerOption[];
}

let idCounter = 100;

const makeOption = (text: string): AnswerOption => ({
  id: ++idCounter,
  text,
  isCorrect: false,
});

const makeQuestion = (): Question => ({
  uid: ++idCounter,
  dbId: undefined,
  title: "",
  description: "",
  type: "Multiple Choice",
  options: [
    makeOption("Option 1"),
    makeOption("Option 2"),
    makeOption("Option 3"),
  ],
});

const TRUE_FALSE_OPTIONS: AnswerOption[] = [
  { id: -1, text: "True", isCorrect: false },
  { id: -2, text: "False", isCorrect: false },
];

const inputCls =
  "h-8 bg-gray-100 dark:bg-neutral-800 border-slate-300 dark:border-neutral-600 rounded-md shadow-none text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 text-slate-900 dark:text-neutral-100 focus-visible:ring-0 focus-visible:border-slate-400 transition-colors";

const textareaCls =
  "w-full px-3 py-2 text-sm bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 rounded-md shadow-none placeholder:text-slate-400 dark:placeholder:text-neutral-500 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-slate-400 resize-none transition-colors";

export default function EditAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { data: currentUserRes } = useCurrentUser();
  const role = currentUserRes?.data?.role;
  const isManager = role === "super_admin" || role === "hiring_manager";
  const unwrappedParams = use(params);
  const assessmentId = parseInt(unwrappedParams.id, 10);

  const { data: assessmentData, isLoading } = useAssessment(assessmentId);
  const createQuestionMutation = useCreateAssessmentQuestion(assessmentId);
  const updateQuestionMutation = useUpdateAssessmentQuestion(assessmentId);
  const deleteQuestionMutation = useDeleteAssessmentQuestion(assessmentId);

  const [isSaving, setIsSaving] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQ, setSelectedQ] = useState<number>(0);
  const originalDbIds = useRef<number[]>([]);
  // Prevent cache-invalidation refetches from resetting the user's in-progress edits.
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    const data = assessmentData?.data;
    if (!data) return;
    hasInitialized.current = true;

    // Can't move to render: it bumps the module-level `idCounter`.
    // eslint-disable-next-line react-hooks/set-state-in-effect

    if (data.questions && data.questions.length > 0) {
      const loaded: Question[] = data.questions.map((dbQ) => {
        let type: QuestionType = "Multiple Choice";
        if (dbQ.questionType === "short_answer") {
          type = "Short Answer";
        } else if (
          dbQ.options?.length === 2 &&
          dbQ.options[0]?.label === "True" &&
          dbQ.options[1]?.label === "False"
        ) {
          type = "True/False";
        }

        return {
          uid: ++idCounter,
          dbId: dbQ.id,
          title: dbQ.title ?? "",
          description: dbQ.description ?? "",
          type,
          options:
            dbQ.options?.map((opt) => ({
              id: opt.id ?? ++idCounter,
              text: opt.label,
              isCorrect: opt.isCorrect,
            })) ?? [],
        };
      });

      originalDbIds.current = loaded.map((q) => q.dbId!);
      setQuestions(loaded);
      setSelectedQ(loaded[0]?.uid ?? 0);
    } else {
      const empty = makeQuestion();
      originalDbIds.current = [];
      setQuestions([empty]);
      setSelectedQ(empty.uid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentData]);

  const handleSave = async () => {
    // Snapshot current state immediately — cache invalidations triggered by
    // mutateAsync calls below will cause refetches that would otherwise reset
    // `questions` via the useEffect before all saves complete.
    const savedQuestions = questions;

    setIsSaving(true);
    try {
      const currentDbIds = new Set(
        savedQuestions.filter((q) => q.dbId).map((q) => q.dbId!),
      );
      const toDelete = originalDbIds.current.filter(
        (id) => !currentDbIds.has(id),
      );

      for (const dbId of toDelete) {
        await deleteQuestionMutation.mutateAsync(dbId);
      }

      for (const [idx, q] of savedQuestions.entries()) {
        const isMultipleChoice = q.type !== "Short Answer";
        const questionData = {
          title: q.title || `Question ${idx + 1}`,
          description: q.description || null,
          questionType: (isMultipleChoice
            ? "multiple_choice"
            : "short_answer") as "multiple_choice" | "short_answer",
          points: 1,
          position: idx + 1,
          options: isMultipleChoice
            ? q.options.map((opt, oIdx) => ({
                label: opt.text || `Option ${oIdx + 1}`,
                isCorrect: opt.isCorrect,
                position: oIdx + 1,
              }))
            : undefined,
        };

        if (q.dbId) {
          await updateQuestionMutation.mutateAsync({
            questionId: q.dbId,
            data: questionData,
          });
        } else {
          await createQuestionMutation.mutateAsync(questionData);
        }
      }

      router.push("/assessments");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update assessment",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white dark:bg-neutral-950 h-full">
        <Loader2 className="size-6 animate-spin text-slate-400 dark:text-neutral-600" />
      </div>
    );
  }

  function moveItem<T>(list: T[], from: number, to: number): T[] {
    const copy = [...list];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  }

  const addQuestion = () => {
    const q = makeQuestion();
    setQuestions((prev) => [...prev, q]);
    setSelectedQ(q.uid);
  };

  const removeQuestion = (qId: number) => {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((q) => q.uid !== qId));
    if (selectedQ === qId) {
      const idx = questions.findIndex((q) => q.uid === qId);
      const nextQ = questions[idx - 1] || questions[idx + 1];
      if (nextQ) setSelectedQ(nextQ.uid);
    }
  };

  const updateQuestion = (qId: number, patch: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.uid === qId ? { ...q, ...patch } : q)),
    );
  };

  const changeType = (qId: number, type: QuestionType) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.uid !== qId) return q;
        let options = q.options;
        if (type === "True/False") {
          options = TRUE_FALSE_OPTIONS.map((o) => ({ ...o }));
        } else if (q.type === "True/False") {
          options = [
            makeOption("Option 1"),
            makeOption("Option 2"),
            makeOption("Option 3"),
          ];
        }
        return { ...q, type, options };
      }),
    );
  };

  const addOption = (qId: number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.uid === qId
          ? {
              ...q,
              options: [
                ...q.options,
                makeOption(`Option ${q.options.length + 1}`),
              ],
            }
          : q,
      ),
    );
  };

  const removeOption = (qId: number, optId: number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.uid === qId
          ? { ...q, options: q.options.filter((o) => o.id !== optId) }
          : q,
      ),
    );
  };

  const updateOptionText = (qId: number, optId: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.uid === qId
          ? {
              ...q,
              options: q.options.map((o) =>
                o.id === optId ? { ...o, text } : o,
              ),
            }
          : q,
      ),
    );
  };

  const toggleCorrect = (qId: number, optId: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.uid !== qId) return q;
        const options = q.options.map((o) => ({
          ...o,
          isCorrect: o.id === optId ? !o.isCorrect : false,
        }));
        return { ...q, options };
      }),
    );
  };

  const currentQ = questions.find((q) => q.uid === selectedQ) || questions[0];
  const isTrueFalse = currentQ?.type === "True/False";
  const isShortAnswer = currentQ?.type === "Short Answer";
  const correctLabel = currentQ?.options.find((o) => o.isCorrect)?.text ?? null;

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950 overflow-hidden">
      <div className="px-8 py-5 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between shrink-0 gap-4">
        <div className="flex items-center gap-5 min-w-0">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-neutral-100 leading-none whitespace-nowrap">
            {isManager ? "Edit Assessment" : "View Assessment"}
          </h1>
          {isManager && (
            <div className="flex items-center gap-2.5">
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                className="data-[state=checked]:bg-[var(--theme-color)] scale-110"
              />
              <span className="text-sm text-slate-600 dark:text-neutral-400 font-medium whitespace-nowrap">
                Make this Active
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isManager ? (
            <>
              <Button
                className="h-9 gap-2 rounded-md border-none px-4 text-sm font-medium text-white shadow-none transition-all active:scale-[0.98] disabled:opacity-70 cursor-pointer"
                style={{ backgroundColor: "var(--theme-color)" }}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving && <Loader2 className="size-4 animate-spin mr-1" />}
                {isSaving ? "Updating..." : "Update Assessment"}
              </Button>
              <Link href="/assessments">
                <Button
                  variant="outline"
                  className="h-9 rounded-md border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 shadow-none hover:bg-slate-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
                >
                  Cancel
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/assessments">
              <Button
                variant="outline"
                className="h-10 px-6 rounded-lg border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 shadow-none font-medium text-sm"
              >
                Back to Assessments
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[280px] border-r border-slate-100 dark:border-neutral-800 flex flex-col shrink-0 bg-white dark:bg-neutral-950">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-neutral-800">
            <span className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
              Questions ({questions.length})
            </span>
          </div>

          {isManager && (
            <div className="p-4">
              <Button
                onClick={addQuestion}
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
          )}

          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
            {questions.map((q, idx) => {
              const hasCorrect = q.options.some((o) => o.isCorrect);
              function DraggableQItem() {
                const { ref, isDragging, isOver } = useDragSort({
                  id: q.uid,
                  index: idx,
                  type: "ASSESSMENT_QUESTION",
                  onMove: (from, to) => {
                    setQuestions((prev) => moveItem(prev, from, to));
                  },
                });
                return (
                  <div
                    ref={ref as Ref<HTMLDivElement>}
                    className={`w-full text-left rounded-lg px-3.5 py-3 flex items-center gap-3 transition-all border cursor-pointer group ${
                      isDragging
                        ? "opacity-40 border-transparent bg-slate-100 dark:bg-neutral-800"
                        : isOver
                          ? "border-[var(--theme-color)]/30 bg-[var(--theme-color)]/5"
                          : selectedQ === q.uid
                            ? "bg-[var(--theme-color)]/5 border-[var(--theme-color)]/20"
                            : "bg-slate-50 dark:bg-neutral-900 border-transparent text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800"
                    }`}
                    onClick={() => setSelectedQ(q.uid)}
                  >
                    <HugeiconsIcon
                      icon={DragDropVerticalIcon}
                      className="size-4 text-slate-300 shrink-0 cursor-grab active:cursor-grabbing"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold truncate ${selectedQ === q.uid ? "text-[var(--theme-color)]" : ""}`}
                      >
                        Q{idx + 1}: {q.title || "Question Title"}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">
                        {q.type}
                      </p>
                    </div>
                    {hasCorrect && (
                      <HugeiconsIcon
                        icon={CheckmarkCircle01Icon}
                        className="size-4 text-emerald-500 shrink-0 mr-1"
                      />
                    )}
                    {isManager && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeQuestion(q.uid);
                        }}
                        className={`text-slate-400 hover:text-red-500 transition-opacity p-1 -mr-1 shrink-0 ${questions.length === 1 ? "opacity-0 cursor-not-allowed" : "opacity-0 group-hover:opacity-100"}`}
                        disabled={questions.length === 1}
                        title="Delete question"
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                      </button>
                    )}
                  </div>
                );
              }
              return <DraggableQItem key={q.uid} />;
            })}
          </div>
        </div>

        {currentQ && (
          <div className="flex-1 overflow-y-auto p-8 space-y-5 bg-white dark:bg-neutral-950">
            <div className="border border-slate-200 dark:border-neutral-800 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                  Question Details
                </span>
                {isManager && (
                  <button
                    onClick={() => removeQuestion(selectedQ)}
                    disabled={questions.length === 1}
                    className="text-slate-300 dark:text-neutral-600 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Remove question"
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                  </button>
                )}
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1.5 block">
                  Question Title
                </Label>
                <Input
                  placeholder="What is your question?"
                  value={currentQ.title}
                  onChange={(e) =>
                    updateQuestion(selectedQ, { title: e.target.value })
                  }
                  readOnly={!isManager}
                  className={inputCls}
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1.5 block">
                  Description{" "}
                  <span className="text-slate-400 dark:text-neutral-500 font-normal">
                    (optional)
                  </span>
                </Label>
                <textarea
                  placeholder="Add more context for this question ..."
                  rows={2}
                  value={currentQ.description}
                  onChange={(e) =>
                    updateQuestion(selectedQ, { description: e.target.value })
                  }
                  readOnly={!isManager}
                  className={textareaCls}
                />
              </div>

              <div className="w-56">
                <Label className="text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1.5 block">
                  Question Type
                </Label>
                <Select
                  value={currentQ.type}
                  onValueChange={(val) =>
                    changeType(selectedQ, val as QuestionType)
                  }
                  disabled={!isManager}
                >
                  <SelectTrigger className="h-8 bg-gray-100 dark:bg-neutral-800 border-slate-300 dark:border-neutral-600 rounded-md shadow-none text-sm focus:ring-0 focus:border-slate-400 dark:focus:border-neutral-500 gap-2 transition-colors">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon
                        icon={RadioButtonIcon}
                        className="size-3.5 text-slate-400 dark:text-neutral-500 shrink-0"
                      />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-md shadow-lg border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900">
                    <SelectItem value="Multiple Choice">Multiple Choice</SelectItem>
                    <SelectItem value="Short Answer">Short Answer</SelectItem>
                    <SelectItem value="True/False">True / False</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isShortAnswer ? (
              <div className="border border-slate-200 dark:border-neutral-800 rounded-xl p-5">
                <p className="text-sm text-slate-500 dark:text-neutral-400">
                  Short answer questions are reviewed manually by the hiring team.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-neutral-800 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                    Answer Options
                  </h3>
                  <span className="text-xs text-slate-400">
                    Click {isTrueFalse ? "True or False" : "the circle"} to mark
                    correct answer
                  </span>
                </div>

                <div className="space-y-3">
                  {currentQ.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`flex items-center gap-3 border rounded-lg px-4 py-3 transition-all ${
                        opt.isCorrect
                          ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20"
                          : "border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                      }`}
                    >
                      <button
                        onClick={() => isManager && toggleCorrect(selectedQ, opt.id)}
                        title="Mark as correct answer"
                        disabled={!isManager}
                        className="shrink-0 transition-colors disabled:cursor-default"
                      >
                        <HugeiconsIcon
                          icon={
                            opt.isCorrect
                              ? CheckmarkCircle01Icon
                              : RadioButtonIcon
                          }
                          className={`size-5 transition-colors ${opt.isCorrect ? "text-emerald-500" : "text-slate-300 dark:text-neutral-600 hover:text-slate-500 dark:hover:text-neutral-400"}`}
                        />
                      </button>

                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) =>
                          updateOptionText(selectedQ, opt.id, e.target.value)
                        }
                        disabled={isTrueFalse || !isManager}
                        className={`flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-neutral-600 ${
                          opt.isCorrect
                            ? "text-emerald-700 dark:text-emerald-400 font-medium"
                            : "text-slate-700 dark:text-neutral-300"
                        } disabled:cursor-default`}
                      />

                      {opt.isCorrect && (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full shrink-0">
                          Correct
                        </span>
                      )}

                      {!isTrueFalse && isManager && (
                        <button
                          onClick={() => removeOption(selectedQ, opt.id)}
                          disabled={currentQ.options.length <= 2}
                          className="text-slate-300 hover:text-red-400 transition-colors p-0.5 rounded shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            className="size-4"
                          />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {!isTrueFalse && isManager && (
                  <Button
                    onClick={() => addOption(selectedQ)}
                    variant="outline"
                    className="h-9 rounded-lg border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 shadow-none hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <HugeiconsIcon
                      icon={PlusSignIcon}
                      className="size-3.5 mr-1.5"
                      strokeWidth={2.5}
                    />
                    Add Answer Option
                  </Button>
                )}

                {correctLabel && (
                  <div className="flex items-center gap-2 pt-1">
                    <HugeiconsIcon
                      icon={TickDouble01Icon}
                      className="size-4 text-emerald-500"
                    />
                    <span className="text-xs text-emerald-600 font-medium">
                      Correct answer set to: <strong>{correctLabel}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
