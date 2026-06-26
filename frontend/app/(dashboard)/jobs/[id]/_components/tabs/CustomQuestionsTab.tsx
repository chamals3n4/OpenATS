"use client";

import type { Ref } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  DragDropVerticalIcon,
  PencilEdit01Icon,
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

interface CustomQuestionsTabProps {
  questions: CustomQuestion[];
  setIsAddingMode: (mode: boolean) => void;
  isAddingMode: boolean;
  editingQuestionId: number | null;
  setEditingQuestionId: (id: number | null) => void;
  editQuestionType: any;
  setEditQuestionType: (type: any) => void;
  editQuestionText: string;
  setEditQuestionText: (text: string) => void;
  editQuestionRequired: boolean;
  setEditQuestionRequired: (req: boolean) => void;
  handleSaveQuestion: (id: number) => void;
  updateQuestionMutationPending: boolean;
  openEditQuestion: (q: CustomQuestion) => void;
  deleteQuestionMutation: any;
  handleQuestionReorder: (from: number, to: number) => void;
  newQuestionType: any;
  setNewQuestionType: (type: any) => void;
  newQuestionText: string;
  setNewQuestionText: (text: string) => void;
  newQuestionRequired: boolean;
  setNewQuestionRequired: (req: boolean) => void;
  createQuestionMutation: any;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  short_answer: "Short Answer",
  long_answer: "Long Answer",
  checkbox: "Checkbox",
  radio: "Radio Button",
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
      {isManager && (
        <button
          onClick={() => setIsAddingMode(true)}
          className="flex items-center cursor-pointer gap-2 text-[var(--theme-color)] hover:underline font-medium text-[15px] w-fit"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={3} />
          <span>Add Custom Question</span>
        </button>
      )}

      <div className="space-y-3">
        {questions.map((q, index) => {
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
                        onValueChange={(val) => setEditQuestionType(val as any)}
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
                          variant="outline"
                          onClick={() => setEditingQuestionId(null)}
                          className="h-10 px-6 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium shadow-none"
                        >
                          Cancel
                        </Button>
                        <Button
                          disabled={
                            !editQuestionText.trim() ||
                            updateQuestionMutationPending
                          }
                          onClick={() => handleSaveQuestion(q.id)}
                          className="h-10 px-6 cursor-pointer bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white shadow-none rounded-lg font-medium disabled:opacity-50"
                        >
                          {updateQuestionMutationPending
                            ? "Saving…"
                            : "Save Changes"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100">
                        {q.questionType === "short_answer" && (
                          <HugeiconsIcon icon={TextIcon} className="size-4" />
                        )}
                        {q.questionType === "long_answer" && (
                          <HugeiconsIcon
                            icon={ParagraphIcon}
                            className="size-4"
                          />
                        )}
                        {q.questionType === "checkbox" && (
                          <HugeiconsIcon icon={Tick02Icon} className="size-4" />
                        )}
                        {q.questionType === "radio" && (
                          <HugeiconsIcon icon={CircleIcon} className="size-4" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-700 dark:text-neutral-200 font-medium text-[15px]">
                          {q.title}
                        </span>
                        {q.isRequired && (
                          <span className="text-[11px] text-red-500 font-medium">
                            Required
                          </span>
                        )}
                      </div>
                    </div>
                    {isManager && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEditQuestion(q)}
                          className="p-1.5 text-slate-400 hover:text-[var(--theme-color)] transition-colors"
                        >
                          <HugeiconsIcon
                            icon={PencilEdit01Icon}
                            className="size-[18px]"
                          />
                        </button>
                        <button
                          onClick={() => deleteQuestionMutation.mutate(q.id)}
                          disabled={deleteQuestionMutation.isPending}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            className="size-[18px]"
                          />
                        </button>
                        <button className="p-1.5 text-slate-300 cursor-grab active:cursor-grabbing">
                          <HugeiconsIcon
                            icon={DragDropVerticalIcon}
                            className="size-[18px]"
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

        {isAddingMode && isManager && (
          <div className="p-3 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-wrap items-center gap-4">
              <Select
                value={newQuestionType}
                onValueChange={(val) => setNewQuestionType(val as any)}
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
                  className="h-10 px-6 border-slate-200 cursor-pointer dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 font-medium shadow-none"
                >
                  Cancel
                </Button>
                <Button
                  disabled={
                    !newQuestionText.trim() || createQuestionMutation.isPending
                  }
                  className="h-10 px-6 bg-[var(--theme-color)] cursor-pointer hover:bg-[var(--theme-color-hover)] text-white shadow-none rounded-lg font-medium disabled:opacity-50"
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
                  {createQuestionMutation.isPending
                    ? "Adding..."
                    : "Add Question"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isManager && (
        <div className="pt-4">
          <Button className="bg-[var(--theme-color)] cursor-pointer hover:bg-[var(--theme-color-hover)] text-white rounded-lg h-10 px-6 font-medium shadow-none">
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
