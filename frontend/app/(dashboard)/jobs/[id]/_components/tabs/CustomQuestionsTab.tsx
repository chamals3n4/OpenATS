"use client";

import type { Ref } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  DragDropVerticalIcon,
  Delete02Icon,
  TextIcon,
  ParagraphIcon,
  Tick02Icon,
  CircleIcon,
  Settings02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDragSort } from "@/hooks/use-drag-sort";
import { useIsManager } from "@/hooks/use-role";
import type { CustomQuestion } from "@/types";
import type {
  useCreateQuestion,
  useDeleteQuestion,
} from "@/hooks/queries/use-jobs";

// The DB enum also allows `multiple_choice`, but this tab only offers these four.
type CustomQuestionType = CustomQuestion["questionType"];

interface CustomQuestionsTabProps {
  questions: CustomQuestion[];
  setIsAddingMode: (mode: boolean) => void;
  isAddingMode: boolean;
  editingQuestionId: number | null;
  setEditingQuestionId: (id: number | null) => void;
  editQuestionType: CustomQuestionType;
  setEditQuestionType: (type: CustomQuestionType) => void;
  editQuestionText: string;
  setEditQuestionText: (text: string) => void;
  editQuestionRequired: boolean;
  setEditQuestionRequired: (req: boolean) => void;
  handleSaveQuestion: (id: number) => void;
  updateQuestionMutationPending: boolean;
  openEditQuestion: (q: CustomQuestion) => void;
  deleteQuestionMutation: ReturnType<typeof useDeleteQuestion>;
  handleQuestionReorder: (from: number, to: number) => void;
  newQuestionType: CustomQuestionType;
  setNewQuestionType: (type: CustomQuestionType) => void;
  newQuestionText: string;
  setNewQuestionText: (text: string) => void;
  newQuestionRequired: boolean;
  setNewQuestionRequired: (req: boolean) => void;
  createQuestionMutation: ReturnType<typeof useCreateQuestion>;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  short_answer: "Short Answer",
  long_answer: "Long Answer",
  checkbox: "Checkbox",
  radio: "Radio Button",
};

const QUESTION_TYPE_META: Record<
  CustomQuestionType,
  { icon: typeof TextIcon; accent: string }
> = {
  short_answer: {
    icon: TextIcon,
    accent: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
  },
  long_answer: {
    icon: ParagraphIcon,
    accent:
      "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400",
  },
  checkbox: {
    icon: Tick02Icon,
    accent:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
  },
  radio: {
    icon: CircleIcon,
    accent:
      "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
  },
};

export function CustomQuestionsTab({
  questions,
  setIsAddingMode,
  isAddingMode,
  editingQuestionId,
  setEditingQuestionId,
  editQuestionType,
  setEditQuestionType,
  editQuestionText,
  setEditQuestionText,
  editQuestionRequired,
  setEditQuestionRequired,
  handleSaveQuestion,
  updateQuestionMutationPending,
  openEditQuestion,
  deleteQuestionMutation,
  handleQuestionReorder,
  newQuestionType,
  setNewQuestionType,
  newQuestionText,
  setNewQuestionText,
  newQuestionRequired,
  setNewQuestionRequired,
  createQuestionMutation,
}: CustomQuestionsTabProps) {
  const isManager = useIsManager();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-semibold text-slate-900 dark:text-neutral-100">
            Application questions
          </h2>
          <p className="mt-1 text-[13px] text-slate-400 dark:text-neutral-500">
            Questions candidates complete when they apply for this role.
          </p>
        </div>
        {isManager && (
          <Button
            type="button"
            onClick={() => setIsAddingMode(true)}
            disabled={isAddingMode}
            className="h-9 shrink-0 cursor-pointer gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 shadow-none transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2.5} />
            Add question
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {questions.map((q, index) => {
          const questionMeta = QUESTION_TYPE_META[q.questionType];
          function QuestionDraggable() {
            const { ref, isDragging, isOver } = useDragSort({
              id: q.id,
              index,
              type: "CUSTOM_QUESTION",
              onMove: handleQuestionReorder,
            });
            return (
              <div
                ref={ref as Ref<HTMLDivElement>}
                className={`group relative border rounded-lg bg-white dark:bg-neutral-900 transition-all ${
                  isDragging
                    ? "opacity-40 border-slate-300 dark:border-neutral-700"
                    : isOver
                      ? "border-[var(--theme-color)]/40 bg-[var(--theme-color)]/5"
                      : "border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700"
                }`}
              >
                {editingQuestionId === q.id ? (
                  <div className="p-3 space-y-4 animate-in fade-in duration-150">
                    <div className="flex flex-wrap items-center gap-4">
                      <Select
                        value={editQuestionType}
                        onValueChange={(val) =>
                          setEditQuestionType(val as CustomQuestionType)
                        }
                      >
                        <SelectTrigger className="w-[180px] h-10! min-h-10 rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-0 text-[15px] text-slate-600 dark:text-neutral-300 shadow-none focus-visible:ring-1 focus-visible:ring-slate-300 dark:focus-visible:ring-neutral-600">
                          <SelectValue>
                            {QUESTION_TYPE_LABELS[editQuestionType] ??
                              editQuestionType}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-md">
                          <SelectItem value="short_answer">
                            <div className="flex items-center gap-2">
                              <HugeiconsIcon
                                icon={TextIcon}
                                className="size-4"
                              />
                              <span>Short Answer</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="long_answer">
                            <div className="flex items-center gap-2">
                              <HugeiconsIcon
                                icon={ParagraphIcon}
                                className="size-4"
                              />
                              <span>Long Answer</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="checkbox">
                            <div className="flex items-center gap-2">
                              <HugeiconsIcon
                                icon={Tick02Icon}
                                className="size-4"
                              />
                              <span>Checkbox</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="radio">
                            <div className="flex items-center gap-2">
                              <HugeiconsIcon
                                icon={CircleIcon}
                                className="size-4"
                              />
                              <span>Radio Button</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        autoFocus
                        placeholder="Enter the question here"
                        value={editQuestionText}
                        onChange={(e) => setEditQuestionText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveQuestion(q.id);
                          if (e.key === "Escape") setEditingQuestionId(null);
                        }}
                        className="flex-1 h-10 min-h-10 rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 shadow-none text-[15px]"
                      />
                      <div className="flex items-center gap-2 px-2">
                        <Checkbox
                          id={`edit-required-${q.id}`}
                          checked={editQuestionRequired}
                          onCheckedChange={(v) => setEditQuestionRequired(!!v)}
                          className="size-4 shrink-0 border-slate-300 data-[state=checked]:bg-[var(--theme-color)] data-[state=checked]:border-[var(--theme-color)]"
                        />
                        <Label
                          htmlFor={`edit-required-${q.id}`}
                          className="text-slate-600 dark:text-neutral-300 font-medium text-[15px] cursor-pointer"
                        >
                          Required
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => setEditingQuestionId(null)}
                          className="h-9 cursor-pointer border-2 border-slate-300 px-4 text-sm font-medium text-slate-600 shadow-none hover:bg-slate-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        >
                          Cancel
                        </Button>
                        <Button
                          disabled={
                            !editQuestionText.trim() ||
                            updateQuestionMutationPending
                          }
                          onClick={() => handleSaveQuestion(q.id)}
                          className="h-9 cursor-pointer gap-2 rounded-md bg-[var(--theme-color)] px-4 text-sm font-medium text-white shadow-none hover:bg-[var(--theme-color-hover)] disabled:opacity-50"
                        >
                          {updateQuestionMutationPending && <Spinner className="size-3.5" />}
                          {updateQuestionMutationPending ? "Saving" : "Save changes"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${questionMeta.accent}`}>
                        <HugeiconsIcon icon={questionMeta.icon} className="size-4" />
                      </div>
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="truncate text-[15px] font-medium text-slate-800 dark:text-neutral-200">
                          {q.title}
                        </span>
                        <div className="flex items-center gap-2 text-[12px] text-slate-400 dark:text-neutral-500">
                          <span>{QUESTION_TYPE_LABELS[q.questionType]}</span>
                          {q.isRequired && (
                            <span className="font-medium text-red-500">Required</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isManager && (
                      <div className="ml-4 flex shrink-0 items-center gap-4">
                        <button
                          type="button"
                          onClick={() => openEditQuestion(q)}
                          className="cursor-pointer text-sm font-medium text-slate-500 transition-colors hover:text-[var(--theme-color)] dark:text-neutral-400"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteQuestionMutation.mutate(q.id)}
                          disabled={deleteQuestionMutation.isPending}
                          className="cursor-pointer text-sm font-medium text-red-500 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400"
                        >
                          Delete
                        </button>
                        <button type="button" className="cursor-grab p-1 text-slate-300 active:cursor-grabbing dark:text-neutral-600">
                          <HugeiconsIcon
                            icon={DragDropVerticalIcon}
                            className="size-4"
                          />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }
          return <QuestionDraggable key={q.id} />;
        })}

        {!isAddingMode && questions.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center dark:border-neutral-800">
            <p className="text-sm font-medium text-slate-700 dark:text-neutral-300">
              No application questions yet
            </p>
            <p className="mt-1 text-[13px] text-slate-400 dark:text-neutral-500">
              Add a question to collect the details that matter for this role.
            </p>
          </div>
        )}

        {isAddingMode && isManager && (
          <div className="space-y-4 rounded-xl border border-[var(--theme-color)]/25 bg-[var(--theme-color)]/[0.035] p-4 dark:bg-[var(--theme-color)]/[0.08] animate-in slide-in-from-top-2 duration-200">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-neutral-200">New question</p>
              <p className="mt-0.5 text-[13px] text-slate-400 dark:text-neutral-500">Choose the answer format, then write the question candidates will see.</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Select
                value={newQuestionType}
                onValueChange={(val) =>
                  setNewQuestionType(val as CustomQuestionType)
                }
              >
                <SelectTrigger className="w-[180px] h-10! min-h-10 cursor-pointer rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-0 text-[15px] text-slate-600 dark:text-neutral-300 shadow-none focus-visible:ring-1 focus-visible:ring-slate-300 dark:focus-visible:ring-neutral-600">
                  <SelectValue placeholder="Question Type">
                    {QUESTION_TYPE_LABELS[newQuestionType] ?? newQuestionType}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-md">
                  <SelectItem value="short_answer">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon icon={TextIcon} className="size-4" />
                      <span>Short Answer</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="long_answer">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon icon={ParagraphIcon} className="size-4" />
                      <span>Long Answer</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="checkbox">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon icon={Tick02Icon} className="size-4" />
                      <span>Checkbox</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="radio">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon icon={CircleIcon} className="size-4" />
                      <span>Radio Button</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Enter the question here"
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                className="flex-1 h-10 min-h-10 rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 shadow-none focus-visible:ring-1 focus-visible:ring-slate-300 dark:focus-visible:ring-neutral-600 text-[15px]"
              />

              {(newQuestionType === "radio" ||
                newQuestionType === "checkbox") && (
                <Dialog>
                  <DialogTrigger
                    render={
                      <Button
                        variant="outline"
                        className="h-10 border-[var(--theme-color)] text-[var(--theme-color)] hover:bg-slate-50 dark:hover:bg-neutral-800 font-medium px-4 shadow-none gap-2"
                      />
                    }
                  >
                    <HugeiconsIcon icon={Settings02Icon} className="size-4" />
                    <span>Setup Options & Logic</span>
                  </DialogTrigger>
                  <DialogContent className="max-w-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl">
                    <DialogHeader>
                      <DialogTitle className="text-slate-900 dark:text-neutral-100">
                        Setup Question Logic
                      </DialogTitle>
                      <DialogDescription className="text-slate-500 dark:text-neutral-400">
                        Add options and define the logic for this question.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-neutral-300">
                          Options
                        </Label>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Option 1"
                              className="h-9 bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus-visible:ring-0"
                            />
                            <Button
                              variant="ghost"
                              className="size-9 p-0 text-red-500"
                            >
                              <HugeiconsIcon
                                icon={Delete02Icon}
                                className="size-4"
                              />
                            </Button>
                          </div>
                          <button className="text-[var(--theme-color)] text-sm font-medium hover:underline flex items-center gap-1">
                            <HugeiconsIcon
                              icon={PlusSignIcon}
                              className="size-3"
                              strokeWidth={3}
                            />
                            <span>Add Another Option</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button className="bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-medium px-5">
                        Save Logic
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              <div className="flex items-center gap-2 px-2">
                <Checkbox
                  id="required"
                  checked={newQuestionRequired}
                  onCheckedChange={(v) => setNewQuestionRequired(!!v)}
                  className="size-4 shrink-0 cursor-pointer border-slate-300 data-[state=checked]:bg-[var(--theme-color)] data-[state=checked]:border-[var(--theme-color)]"
                />
                <Label
                  htmlFor="required"
                  className="text-slate-600 dark:text-neutral-300 font-medium text-[15px] cursor-pointer"
                >
                  Required
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingMode(false);
                    setNewQuestionText("");
                    setNewQuestionRequired(false);
                  }}
                  className="h-9 cursor-pointer border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 shadow-none hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Cancel
                </Button>
                <Button
                  disabled={
                    !newQuestionText.trim() || createQuestionMutation.isPending
                  }
                  className="h-9 cursor-pointer gap-2 rounded-md bg-[var(--theme-color)] px-4 text-sm font-medium text-white shadow-none hover:bg-[var(--theme-color-hover)] disabled:opacity-50"
                  onClick={() => {
                    if (!newQuestionText.trim()) return;
                    createQuestionMutation.mutate(
                      {
                        title: newQuestionText.trim(),
                        questionType: newQuestionType,
                        isRequired: newQuestionRequired,
                        position: questions.length + 1,
                      },
                      {
                        onSuccess: () => {
                          setIsAddingMode(false);
                          setNewQuestionText("");
                          setNewQuestionRequired(false);
                          setNewQuestionType("short_answer");
                        },
                      },
                    );
                  }}
                >
                  {createQuestionMutation.isPending && <Spinner className="size-3.5" />}
                  {createQuestionMutation.isPending ? "Adding" : "Add question"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
