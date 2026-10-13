"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Edit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  useAssessment,
  useCreateAssessmentQuestion,
  useUpdateAssessmentQuestion,
  useDeleteAssessmentQuestion,
} from "@/hooks/queries/use-assessments";
import { useIsManager } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { EditAssessmentDetailsDialog } from "../_components/edit-assessment-details-dialog";
import { DeleteQuestionDialog } from "../new/_components/delete-question-dialog";
import { QuestionEditor } from "../new/_components/question-editor";
import { QuestionSidebar } from "../new/_components/question-sidebar";
import { useAssessmentQuestions } from "../new/hooks/use-assessment-questions";
import {
  firstQuestionProblem,
  makeQuestion,
  questionFromApi,
  questionsFingerprint,
  questionToApi,
} from "../new/lib/assessment-builder-utils";

/**
 * An existing assessment. A manager edits it; anyone else reads it. It uses the same question
 * list and question editor as the page that creates one, so the two cannot drift apart.
 */
export default function EditAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const isManager = useIsManager();
  const assessmentId = parseInt(use(params).id, 10);

  const { data: assessmentData, isLoading } = useAssessment(assessmentId);
  const createQuestionMutation = useCreateAssessmentQuestion(assessmentId);
  const updateQuestionMutation = useUpdateAssessmentQuestion(assessmentId);
  const deleteQuestionMutation = useDeleteAssessmentQuestion(assessmentId);

  const [isSaving, setIsSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState("120");

  const {
    questions,
    selectedQ,
    currentQ,
    currentIndex,
    setSelectedQ,
    addQuestion,
    requestRemoveQuestion,
    cancelRemoveQuestion,
    confirmRemoveQuestion,
    pendingRemove,
    pendingRemoveNumber,
    updateQuestion,
    changeQuestionType,
    moveQuestion,
    replaceQuestions,
    addOption,
    removeOption,
    updateOptionText,
    toggleCorrectOption,
  } = useAssessmentQuestions();

  // What the questions looked like when they were loaded. Save is off until they differ from it.
  const [savedFingerprint, setSavedFingerprint] = useState<string | null>(null);
  const isDirty = useMemo(
    () => savedFingerprint !== null && questionsFingerprint(questions) !== savedFingerprint,
    [questions, savedFingerprint],
  );

  const originalDbIds = useRef<number[]>([]);
  // Saving refetches the assessment. That must not put the saved copy back over what is on screen.
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    const data = assessmentData?.data;
    if (!data) return;
    hasInitialized.current = true;

    // In an effect, not during render: building the questions hands out new ids each time.
    /* eslint-disable react-hooks/set-state-in-effect */
    setTitle(data.title ?? "");
    setDescription(data.description ?? "");
    setTimeLimit(String(data.timeLimit ?? 120));
    /* eslint-enable react-hooks/set-state-in-effect */

    const loaded = (data.questions ?? []).map(questionFromApi);
    originalDbIds.current = loaded.map((q) => q.dbId!).filter(Boolean);
    const starting = loaded.length > 0 ? loaded : [makeQuestion()];
    replaceQuestions(starting);
    setSavedFingerprint(questionsFingerprint(starting));
  }, [assessmentData, replaceQuestions]);

  const handleSave = async () => {
    // What is on screen now. The saves below refetch, and this must not change under them.
    const saved = questions;

    const problem = firstQuestionProblem(saved);
    if (problem) {
      toast.warning(problem);
      return;
    }

    setIsSaving(true);
    try {
      const kept = new Set(saved.filter((q) => q.dbId).map((q) => q.dbId!));
      for (const dbId of originalDbIds.current.filter((id) => !kept.has(id))) {
        await deleteQuestionMutation.mutateAsync(dbId);
      }

      for (const [idx, q] of saved.entries()) {
        const data = questionToApi(q, idx);
        if (q.dbId) {
          await updateQuestionMutation.mutateAsync({ questionId: q.dbId, data });
        } else {
          await createQuestionMutation.mutateAsync(data);
        }
      }

      toast.success("Assessment updated.");
      router.push("/assessments");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update the assessment");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <Loader2 className="size-6 animate-spin text-slate-400 dark:text-neutral-600" />
      </div>
    );
  }

  return (
    // Exactly as tall as the window under the top bar, like the pipeline board. That is what
    // keeps this page's header in place while the question list and the editor each scroll.
    <div className="flex h-[calc(100dvh-var(--header-height))] w-full min-w-0 flex-col overflow-hidden bg-white dark:bg-neutral-950">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-slate-300 px-4 py-4 sm:px-8 dark:border-neutral-700">
        <div className="min-w-0">
          <p className="text-sm text-slate-600 dark:text-neutral-400">
            {isManager ? "Edit assessment" : "Assessment"}
            {" · "}
            {Number(timeLimit) || 120} minutes
          </p>
          <div className="mt-0.5 flex items-center gap-3">
            <h1 className="truncate text-xl font-semibold leading-tight text-slate-900 dark:text-neutral-100">
              {title || "Untitled assessment"}
            </h1>
            {isManager && (
              <Button
                variant="cancel"
                onClick={() => setDetailsOpen(true)}
                className="h-8 shrink-0 cursor-pointer gap-1.5 px-3 text-sm"
              >
                <HugeiconsIcon icon={Edit02Icon} className="size-4" strokeWidth={1.75} />
                Edit details
              </Button>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="cancel"
            nativeButton={false}
            render={<Link href="/assessments" />}
            className="h-9 cursor-pointer px-4 text-sm"
          >
            {isManager ? "Cancel" : "Back to assessments"}
          </Button>
          {isManager && (
            <Button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              title={isDirty ? undefined : "Nothing has been changed yet"}
              className="h-9 cursor-pointer gap-2 border-none bg-theme px-4 text-sm font-semibold text-white shadow-none hover:bg-theme-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              {isSaving ? "Saving" : "Save changes"}
            </Button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <QuestionSidebar
          questions={questions}
          selectedQ={selectedQ}
          onSelect={setSelectedQ}
          onAdd={addQuestion}
          onRemove={requestRemoveQuestion}
          onMove={moveQuestion}
          readOnly={!isManager}
        />

        {currentQ && (
          <QuestionEditor
            // A new editor for each question, so the page is at the top when another is opened.
            key={currentQ.uid}
            question={currentQ}
            index={currentIndex < 0 ? 0 : currentIndex}
            onUpdate={updateQuestion}
            onChangeType={changeQuestionType}
            onAddOption={addOption}
            onRemoveOption={removeOption}
            onUpdateOptionText={updateOptionText}
            onToggleCorrect={toggleCorrectOption}
            onRemoveQuestion={requestRemoveQuestion}
            canRemove={questions.length > 1}
            readOnly={!isManager}
          />
        )}
      </div>

      <DeleteQuestionDialog
        question={pendingRemove}
        number={pendingRemoveNumber}
        onCancel={cancelRemoveQuestion}
        onConfirm={confirmRemoveQuestion}
      />

      {isManager && (
        <EditAssessmentDetailsDialog
          assessmentId={assessmentId}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          details={{ title, description, timeLimit: Number(timeLimit) || 120 }}
          onSaved={(d) => {
            setTitle(d.title);
            setDescription(d.description);
            setTimeLimit(String(d.timeLimit));
          }}
        />
      )}
    </div>
  );
}
