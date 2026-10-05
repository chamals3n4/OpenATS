"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ConfirmDeleteDialog,
  ConfirmDeleteName,
} from "@/components/ui/confirm-delete-dialog";
import { useIsManager } from "@/hooks/use-role";
import type { CustomQuestion } from "@/types";
import type {
  useCreateQuestion,
  useDeleteQuestion,
  useUpdateQuestion,
} from "@/hooks/queries/use-jobs";
import { optionDraftsOf } from "../../lib/question-utils";
import type { OptionDraft } from "../../lib/question-utils";
import { QuestionDialog, QuestionForm, type QuestionValues } from "../questions/question-form";
import { QuestionRow } from "../questions/question-row";

interface CustomQuestionsTabProps {
  questions: CustomQuestion[];
  handleQuestionReorder: (from: number, to: number) => void;
  createQuestionMutation: ReturnType<typeof useCreateQuestion>;
  updateQuestionMutation: ReturnType<typeof useUpdateQuestion>;
  deleteQuestionMutation: ReturnType<typeof useDeleteQuestion>;
}

const NEW_QUESTION = {
  title: "",
  type: "short_answer" as const,
  required: false,
  options: [] as OptionDraft[],
};

export function CustomQuestionsTab({
  questions,
  handleQuestionReorder,
  createQuestionMutation,
  updateQuestionMutation,
  deleteQuestionMutation,
}: CustomQuestionsTabProps) {
  const isManager = useIsManager();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomQuestion | null>(null);

  const handleAdd = (values: QuestionValues) =>
    createQuestionMutation.mutate(
      { ...values, position: questions.length + 1 },
      {
        onSuccess: () => {
          setIsAdding(false);
          toast.success("Question added");
        },
        onError: (error) => toast.error(error.message || "Failed to add the question"),
      },
    );

  const handleSave = (id: number, values: QuestionValues) =>
    updateQuestionMutation.mutate(
      { questionId: id, data: values },
      {
        onSuccess: () => {
          setEditingId(null);
          toast.success("Question saved");
        },
        onError: (error) => toast.error(error.message || "Failed to save the question"),
      },
    );

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteQuestionMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        toast.success("Question deleted");
      },
      onError: (error) => toast.error(error.message || "Failed to delete the question"),
    });
  };

  const editing = questions.find((q) => q.id === editingId) ?? null;

  const startAdd = () => {
    setEditingId(null);
    setIsAdding(true);
  };
  const startEdit = (q: CustomQuestion) => {
    setIsAdding(false);
    setEditingId(q.id);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
            Application questions
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
            Candidates answer these when they apply for this role.
            {questions.length > 0 && ` ${questions.length} in total.`}
          </p>
        </div>
        {isManager && questions.length > 0 && (
          <Button
            type="button"
            onClick={startAdd}
            className="h-9 shrink-0 cursor-pointer gap-2 border-none bg-theme px-4 text-sm font-semibold text-white shadow-none hover:bg-theme-hover"
          >
            <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2.5} />
            Add question
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {questions.map((q, index) => (
          <QuestionRow
            key={q.id}
            question={q}
            index={index}
            canManage={isManager}
            onMove={handleQuestionReorder}
            onEdit={startEdit}
            onDelete={setDeleteTarget}
          />
        ))}

        {questions.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
            <p className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
              No application questions yet
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-neutral-400">
              Ask for the details that matter for this role, like a portfolio link or
              notice period.
            </p>
            {isManager && (
              <Button
                type="button"
                onClick={startAdd}
                className="mt-4 h-9 cursor-pointer gap-2 border-none bg-theme px-4 text-sm font-semibold text-white shadow-none hover:bg-theme-hover"
              >
                <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2.5} />
                Add question
              </Button>
            )}
          </div>
        )}
      </div>

      <QuestionDialog
        open={isAdding || editing !== null}
        onClose={() => {
          setIsAdding(false);
          setEditingId(null);
        }}
      >
        {editing ? (
          <QuestionForm
            key={editing.id}
            mode="edit"
            initial={{
              title: editing.title,
              type: editing.questionType,
              required: editing.isRequired,
              options: optionDraftsOf(editing),
            }}
            isPending={updateQuestionMutation.isPending}
            onSubmit={(values) => handleSave(editing.id, values)}
            onCancel={() => setEditingId(null)}
          />
        ) : isAdding ? (
          <QuestionForm
            mode="add"
            initial={NEW_QUESTION}
            isPending={createQuestionMutation.isPending}
            onSubmit={handleAdd}
            onCancel={() => setIsAdding(false)}
          />
        ) : null}
      </QuestionDialog>

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        title="Delete this question?"
        description={
          <>
            <ConfirmDeleteName>{deleteTarget?.title}</ConfirmDeleteName> will no longer be
            asked on the application form. Answers candidates already gave are kept.
          </>
        }
        isPending={deleteQuestionMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
