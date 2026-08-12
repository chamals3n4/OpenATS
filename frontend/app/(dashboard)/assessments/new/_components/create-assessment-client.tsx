"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateAssessment } from "@/hooks/queries/use-assessments";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAssessmentQuestions } from "../hooks/use-assessment-questions";
import { formatQuestionsForApi } from "../lib/assessment-builder-utils";
import { AssessmentMetaSection } from "./meta-section";
import { QuestionSidebar } from "./question-sidebar";
import { QuestionEditor } from "./question-editor";

export default function CreateAssessmentPageClient() {
  const router = useRouter();
  const createAssessment = useCreateAssessment();

  const [isActive, setIsActive] = useState(true);
  const [metaOpen, setMetaOpen] = useState(false);
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
    removeQuestion,
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
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-5 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between shrink-0 gap-4">
        <div className="flex items-center gap-5 min-w-0">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-neutral-100 leading-none whitespace-nowrap">
            Create New Assessment
          </h1>
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
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            className="text-white cursor-pointer rounded-lg h-10 px-6 font-medium shadow-none border-none transition-all active:scale-[0.98] disabled:opacity-70 gap-2"
            style={{ backgroundColor: "var(--theme-color)" }}
            onClick={handleSave}
            disabled={createAssessment.isPending}
          >
            {createAssessment.isPending && (
              <Loader2 className="size-4 animate-spin mr-1" />
            )}
            {createAssessment.isPending
              ? "Saving Assessment"
              : "Save Assessment"}
          </Button>
          <Link href="/assessments">
            <Button
              variant="outline"
              className="h-10 px-6 rounded-lg border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 shadow-none font-medium text-sm"
            >
              Cancel
            </Button>
          </Link>
        </div>
      </div>

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
      <div className="flex flex-1 overflow-hidden">
        <QuestionSidebar
          questions={questions}
          selectedQ={selectedQ}
          onSelect={setSelectedQ}
          onAdd={addQuestion}
          onRemove={removeQuestion}
          onMove={moveQuestion}
        />

        {currentQ && (
          <QuestionEditor
            question={currentQ}
            index={currentIndex}
            onUpdate={updateQuestion}
            onChangeType={changeQuestionType}
            onAddOption={addOption}
            onRemoveOption={removeOption}
            onUpdateOptionText={updateOptionText}
            onToggleCorrect={toggleCorrectOption}
            onRemoveQuestion={removeQuestion}
            canRemove={questions.length > 1}
          />
        )}
      </div>
    </div>
  );
}
