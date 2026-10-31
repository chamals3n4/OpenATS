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
import { UnsavedChangesGuard } from "@/components/guards/unsaved-changes-guard";
import { Button } from "@/components/ui/button";
import { EditAssessmentDetailsDialog } from "../_components/edit-assessment-details-dialog";
import { DeleteQuestionDialog } from "../_components/builder/delete-question-dialog";
import { QuestionEditor } from "../_components/builder/question-editor";
import { QuestionSidebar } from "../_components/builder/question-sidebar";
import { useAssessmentQuestions } from "../_hooks/use-assessment-questions";
import {
  firstQuestionProblem,
  makeQuestion,
  questionFromApi,
  questionsFingerprint,
} from "../_lib/assessment-builder-utils";
import { saveQuestions } from "../_lib/save-questions";

/** View or edit an existing assessment */
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
  const [linkExpiryDays, setLinkExpiryDays] = useState("7");

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

  // Questions as loaded, used to enable Save
  const [savedFingerprint, setSavedFingerprint] = useState<string | null>(null);
  const isDirty = useMemo(
    () => savedFingerprint !== null && questionsFingerprint(questions) !== savedFingerprint,
    [questions, savedFingerprint],
  );

  const originalDbIds = useRef<number[]>([]);
  // Don't overwrite edits when the save refetches
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    const data = assessmentData?.data;
    if (!data) return;
    hasInitialized.current = true;

    // Run in an effect since it creates new ids
    /* eslint-disable react-hooks/set-state-in-effect */
    setTitle(data.title ?? "");
    setDescription(data.description ?? "");
    setTimeLimit(String(data.timeLimit ?? 120));
    setLinkExpiryDays(String(data.linkExpiryDays ?? 7));
    /* eslint-enable react-hooks/set-state-in-effect */

    const loaded = (data.questions ?? []).map(questionFromApi);
    originalDbIds.current = loaded.map((q) => q.dbId!).filter(Boolean);
    const starting = loaded.length > 0 ? loaded : [makeQuestion()];
    replaceQuestions(starting);
    setSavedFingerprint(questionsFingerprint(starting));
  }, [assessmentData, replaceQuestions]);

  const handleSave = async () => {
    // Current questions on screen
    const saved = questions;

    const problem = firstQuestionProblem(saved);
    if (problem) {
      toast.warning(problem);
      return;
    }

    setIsSaving(true);
    try {
      await saveQuestions({
        questions: saved,
        savedIds: originalDbIds,
        deleteQuestion: (id) => deleteQuestionMutation.mutateAsync(id),
        updateQuestion: (id, data) => updateQuestionMutation.mutateAsync({ questionId: id, data }),
        createQuestion: (data) => createQuestionMutation.mutateAsync(data),
        // Keep the new id, so a retry updates it instead of creating a copy
        onCreated: (uid, dbId) => updateQuestion(uid, { dbId }),
      });

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
    // Full height so the header stays and the panels scroll
    <div className="flex h-[calc(100dvh-var(--header-height))] w-full min-w-0 flex-col overflow-hidden bg-white dark:bg-neutral-950">
      <UnsavedChangesGuard when={isDirty} />
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-slate-300 px-4 py-4 sm:px-8 dark:border-neutral-700">
        <div className="min-w-0">
          <p className="text-sm text-slate-600 dark:text-neutral-400">
            {isManager ? "Edit assessment" : "Assessment"}
            {" · "}
            {Number(timeLimit) || 120} minutes
            {" · "}
            link valid {Number(linkExpiryDays) || 7} days
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
            // New editor per question so it starts at the top
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
          details={{
            title,
            description,
            timeLimit: Number(timeLimit) || 120,
            linkExpiryDays: Number(linkExpiryDays) || 7,
          }}
          onSaved={(d) => {
            setTitle(d.title);
            setDescription(d.description);
            setTimeLimit(String(d.timeLimit));
            setLinkExpiryDays(String(d.linkExpiryDays));
          }}
        />
      )}
    </div>
  );
}
