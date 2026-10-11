"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Quiz01Icon, Tick02Icon, Time01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatDuration } from "../../_lib/assessment-constants";
import type { AttemptData } from "../../_lib/assessment-types";

interface IntroScreenProps {
  attempt: AttemptData;
  starting: boolean;
  onStart: () => void;
}

export function IntroScreen({ attempt, starting, onStart }: IntroScreenProps) {
  const { assessment, candidate } = attempt;
  const duration = formatDuration(assessment.timeLimit ?? 0);
  const count = assessment.questions.length;
  // "Software Engineer at Acme", or whichever of the two is known.
  const appliedFor = [attempt.jobTitle, attempt.company?.name].filter(Boolean).join(" at ");

  const rules = [
    `You have ${duration}. The clock starts when you press Start and does not pause.`,
    "When the time runs out, your answers are submitted for you.",
    "You can move between questions and change an answer until you submit.",
    "Your answers are saved as you go, so you can reload the page without losing them.",
    "Once you submit, you cannot change anything.",
  ];

  return (
    <main className="flex min-h-dvh items-center bg-white px-4 py-8 sm:px-6 dark:bg-neutral-950">
      <div className="mx-auto w-full max-w-3xl rounded-lg border border-slate-300 px-6 py-8 sm:px-10 sm:py-10 dark:border-neutral-700">
        <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-[32px] dark:text-neutral-100">
          {assessment.title}
        </h1>
        {appliedFor && (
          <p className="mt-2 text-[15px] font-medium text-slate-700 dark:text-neutral-300">{appliedFor}</p>
        )}
        <p className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] font-medium text-slate-700 dark:text-neutral-300">
          <span className="flex items-center gap-2">
            <HugeiconsIcon icon={Quiz01Icon} className="size-5 text-theme dark:text-primary" strokeWidth={1.75} />
            {count} question{count === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-2">
            <HugeiconsIcon icon={Time01Icon} className="size-5 text-theme dark:text-primary" strokeWidth={1.75} />
            {duration}
          </span>
        </p>

        {assessment.description && (
          <p className="mt-8 whitespace-pre-line text-[15px] leading-relaxed text-slate-600 dark:text-neutral-300">
            {assessment.description}
          </p>
        )}

        <p className="mt-8 text-[15px] text-slate-700 dark:text-neutral-300">
          Hello {candidate.firstName}, please read this before you begin.
        </p>

        <ul className="mt-4 space-y-3">
          {rules.map((rule) => (
            <li key={rule} className="flex gap-3 text-[15px] leading-relaxed text-slate-700 dark:text-neutral-300">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-theme/10 text-theme dark:text-primary">
                <HugeiconsIcon icon={Tick02Icon} className="size-3.5" strokeWidth={3} />
              </span>
              {rule}
            </li>
          ))}
        </ul>

        <Button
          type="button"
          onClick={onStart}
          disabled={starting}
          className="mt-10 h-11 w-full cursor-pointer gap-2 rounded-md border-none bg-theme px-6 text-[15px] font-semibold text-white shadow-none hover:bg-theme-hover"
        >
          {starting && <Spinner className="size-4" />}
          {starting ? "Starting" : "Start the assessment"}
        </Button>
        <p className="mt-3 text-center text-sm text-slate-500 dark:text-neutral-400">
          Start only when you are ready. The time begins straight away.
        </p>
      </div>
    </main>
  );
}
