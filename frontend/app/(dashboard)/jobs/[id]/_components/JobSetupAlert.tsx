"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface JobSetupAlertProps {
  onAddQuestions: () => void;
  onSetUpScoring: () => void;
  onDismiss: () => void;
}

/** Shown on a job that has just been created, pointing at the setup that ranks its candidates. */
export function JobSetupAlert({ onAddQuestions, onSetUpScoring, onDismiss }: JobSetupAlertProps) {
  return (
    <Alert className="mb-4 border-green-300 bg-green-50 pr-12 text-green-950 dark:border-green-900 dark:bg-green-950/30 dark:text-green-100">
      <HugeiconsIcon icon={CheckmarkCircle01Icon} className="text-green-700 dark:text-green-400" />
      <AlertTitle>Job created</AlertTitle>
      <AlertDescription className="text-green-900/80 dark:text-green-200/80">
        <p>
          Add application questions to score candidates as they apply. You can give each answer points and
          mark an answer as a knockout.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={onAddQuestions}
            className="h-8 cursor-pointer border-none bg-theme px-3 text-sm font-semibold text-white shadow-none hover:bg-theme-hover"
          >
            Add questions
          </Button>
          <Button type="button" variant="cancel" onClick={onSetUpScoring} className="h-8 px-3 text-sm">
            Set up scoring
          </Button>
        </div>
      </AlertDescription>
      <Button
        type="button"
        variant="ghost"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="absolute right-2 top-2 size-8 rounded-md p-0 text-green-900 hover:bg-green-100 dark:text-green-200 dark:hover:bg-green-900/40"
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
      </Button>
    </Alert>
  );
}
