"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateAssessment } from "@/hooks/queries/use-assessments";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAssessmentQuestions } from "../hooks/use-assessment-questions";
import { firstQuestionProblem, formatQuestionsForApi } from "../lib/assessment-builder-utils";
import { AssessmentMetaSection } from "../../_components/assessment-meta-section";
import { QuestionSidebar } from "./question-sidebar";
import { DeleteQuestionDialog } from "./delete-question-dialog";
import { QuestionEditor } from "./question-editor";

export default function CreateAssessmentPageClient() {
  const router = useRouter();
  const createAssessment = useCreateAssessment();

  // Open to begin with: a new assessment has no title yet, and it cannot be saved without one.
  const [metaOpen, setMetaOpen] = useState(true);
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [assessmentDesc, setAssessmentDesc] = useState("");
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
    addOption,
    removeOption,
    updateOptionText,
    toggleCorrectOption,
  } = useAssessmentQuestions();

  const handleSave = () => {
    if (!assessmentTitle.trim()) {
      return toast.warning("Assessment title is required.");
    }

    const problem = firstQuestionProblem(questions);
    if (problem) return toast.warning(problem);

    const payload = {
      title: assessmentTitle,
      description: assessmentDesc || null,
      timeLimit: parseInt(timeLimit) || 120,
      questions: formatQuestionsForApi(questions),
    };

    createAssessment.mutate(payload, {
      onSuccess: () => {
        toast.success("Assessment successfully created!");
        router.push("/assessments");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create assessment");
      },
    });
  };

  return (
    // Exactly as tall as the window under the top bar, like the pipeline board. That is what
    // keeps this page's header in place while the question list and the editor each scroll.
    <div className="flex h-[calc(100dvh-var(--header-height))] w-full min-w-0 flex-col overflow-hidden bg-white dark:bg-neutral-950">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-slate-300 px-4 py-4 sm:px-8 dark:border-neutral-700">
        <div className="min-w-0">
          <p className="text-sm text-slate-600 dark:text-neutral-400">New assessment</p>
          <h1 className="mt-0.5 truncate text-xl font-semibold leading-tight text-slate-900 dark:text-neutral-100">
            {assessmentTitle.trim() || "Untitled assessment"}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="cancel"
            nativeButton={false}
            render={<Link href="/assessments" />}
            className="h-9 cursor-pointer px-4 text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={createAssessment.isPending}
            className="h-9 cursor-pointer gap-2 border-none bg-theme px-4 text-sm font-semibold text-white shadow-none hover:bg-theme-hover disabled:opacity-70"
          >
            {createAssessment.isPending && <Loader2 className="size-4 animate-spin" />}
            {createAssessment.isPending ? "Saving" : "Save assessment"}
          </Button>
        </div>
      </header>

      {/* Meta Section */}
      <AssessmentMetaSection
        isOpen={metaOpen}
        onToggle={() => setMetaOpen((o) => !o)}
        title={assessmentTitle}
        onTitleChange={setAssessmentTitle}
        description={assessmentDesc}
        onDescriptionChange={setAssessmentDesc}
        timeLimit={timeLimit}
        onTimeLimitChange={setTimeLimit}
      />

      {/* Main Content: Sidebar + Editor */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <QuestionSidebar
          questions={questions}
          selectedQ={selectedQ}
          onSelect={setSelectedQ}
          onAdd={addQuestion}
          onRemove={requestRemoveQuestion}
          onMove={moveQuestion}
        />

        {currentQ && (
          <QuestionEditor
            // A new editor for each question, so the page is at the top when another is opened.
            key={currentQ.uid}
            question={currentQ}
            index={currentIndex}
            onUpdate={updateQuestion}
            onChangeType={changeQuestionType}
            onAddOption={addOption}
            onRemoveOption={removeOption}
            onUpdateOptionText={updateOptionText}
            onToggleCorrect={toggleCorrectOption}
            onRemoveQuestion={requestRemoveQuestion}
            canRemove={questions.length > 1}
          />
        )}
      </div>

      <DeleteQuestionDialog
        question={pendingRemove}
        number={pendingRemoveNumber}
        onCancel={cancelRemoveQuestion}
        onConfirm={confirmRemoveQuestion}
      />
    </div>
  );
}
