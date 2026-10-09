"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Quiz03Icon,
  CheckmarkCircle01Icon,
  Link01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { formatDate } from "../constants";
import { formatDuration } from "../../lib/assessment-result-utils";
import type { useCandidateAssessments } from "@/hooks/queries/use-assessments";

type Attempt = NonNullable<
  ReturnType<typeof useCandidateAssessments>["data"]
>["data"][number];

interface ScoresSectionProps {
  assessmentsData: ReturnType<typeof useCandidateAssessments>["data"];
  onViewAttempt: (id: number) => void;
}

const STATUS_STYLES: Record<string, { label: string; pill: string; dot: string }> =
  {
    pending: {
      label: "Not started",
      pill: "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
      dot: "bg-amber-500",
    },
    started: {
      label: "In progress",
      pill: "bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
      dot: "bg-blue-500",
    },
    completed: {
      label: "Completed",
      pill: "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300",
      dot: "bg-green-500",
    },
    expired: {
      label: "Expired",
      pill: "bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300",
      dot: "bg-slate-400",
    },
  };

function SectionHeader() {
  return (
    <div className="mb-6">
      <h3 className="text-base font-bold text-slate-900 dark:text-neutral-100">
        Assessments
      </h3>
      <p className="mt-0.5 text-[15px] text-slate-500 dark:text-neutral-400">
        Test results and evaluation scores
      </p>
    </div>
  );
}

function Fact({
  label,
  children,
  sub,
}: {
  label: string;
  children: React.ReactNode;
  sub?: string | null;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500 dark:text-neutral-400">
        {label}
      </dt>
      <dd className="mt-1 text-[15px] font-medium text-slate-900 dark:text-neutral-100">
        {children}
      </dd>
      {sub && (
        <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
          {sub}
        </p>
      )}
    </div>
  );
}

function ScoreFact({ attempt }: { attempt: Attempt }) {
  // Postgres `numeric` reaches us as a string (e.g. "100.00"), so convert it.
  const score =
    attempt.scorePercentage === null ? null : Number(attempt.scorePercentage);
  const barColor =
    attempt.passed === true
      ? "bg-green-500"
      : attempt.passed === false
        ? "bg-red-500"
        : "bg-slate-400";

  return (
    <Fact label="Score">
      {score === null || !Number.isFinite(score) ? (
        <span className="text-slate-400">No score</span>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-2xl font-semibold leading-none">
            {Math.round(score)}%
          </span>
          <div
            role="progressbar"
            aria-label="Score"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(score)}
            className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-neutral-700"
          >
            <div
              className={`h-full rounded-full ${barColor}`}
              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
            />
          </div>
        </div>
      )}
    </Fact>
  );
}

function AttemptCard({
  attempt,
  onViewAttempt,
}: {
  attempt: Attempt;
  onViewAttempt: (id: number) => void;
}) {
  const [copied, setCopied] = useState(false);
  const status = STATUS_STYLES[attempt.status] ?? STATUS_STYLES.pending;
  const isCompleted = attempt.status === "completed";
  const isOpen = attempt.status === "pending" || attempt.status === "started";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/assessment/${attempt.token}`,
      );
      setCopied(true);
      toast.success("Assessment link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link");
    }
  };

  return (
    <article className="overflow-hidden rounded-md border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <header className="flex items-center justify-between gap-3 px-5 pt-4">
        <h4 className="truncate text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
          {attempt.assessmentTitle}
        </h4>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.pill}`}
        >
          <span className={`size-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </header>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 sm:grid-cols-4">
        {isCompleted && (
          <>
            <ScoreFact attempt={attempt} />
            {attempt.passed !== null && (
              <Fact label="Result">
                <span
                  className={
                    attempt.passed
                      ? "text-green-700 dark:text-green-400"
                      : "text-red-700 dark:text-red-400"
                  }
                >
                  {attempt.passed ? "Passed" : "Failed"}
                </span>
              </Fact>
            )}
          </>
        )}
        {attempt.startedAt && (
          <Fact label="Started">{formatDate(attempt.startedAt)}</Fact>
        )}
        {isCompleted && (
          <Fact
            label="Completed"
            sub={formatDuration(attempt.startedAt, attempt.completedAt)}
          >
            {formatDate(attempt.completedAt)}
          </Fact>
        )}
        {isOpen && (
          <Fact label="Link expires">{formatDate(attempt.expiresAt)}</Fact>
        )}
        {attempt.status === "expired" && (
          <Fact label="Expired on">{formatDate(attempt.expiresAt)}</Fact>
        )}
      </dl>

      {(isCompleted || isOpen) && (
        <footer className="flex items-center justify-end gap-2 border-t border-slate-300 px-5 py-3 dark:border-neutral-700">
          {isOpen && (
            <Button
              type="button"
              variant="cancel"
              onClick={handleCopy}
              className="h-8 gap-2 px-3 text-sm"
            >
              <HugeiconsIcon
                icon={copied ? CheckmarkCircle01Icon : Link01Icon}
                className="size-4"
                strokeWidth={1.75}
              />
              {copied ? "Copied" : "Copy link"}
            </Button>
          )}
          {isCompleted && (
            <Button
              type="button"
              onClick={() => onViewAttempt(attempt.id)}
              className="h-8 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
            >
              View answers
            </Button>
          )}
        </footer>
      )}
    </article>
  );
}

export function ScoresSection({
  assessmentsData,
  onViewAttempt,
}: ScoresSectionProps) {
  const attempts = assessmentsData?.data ?? [];

  if (!assessmentsData) {
    return (
      <div className="p-5 sm:p-6">
        <SectionHeader />
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-2.5 text-slate-400 dark:text-neutral-500">
            <div className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-400 dark:border-neutral-600" />
            <p className="text-sm font-medium">Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="p-5 sm:p-6">
        <SectionHeader />
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900/30">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 dark:bg-neutral-800">
            <HugeiconsIcon
              icon={Quiz03Icon}
              className="size-5 text-slate-400 dark:text-neutral-500"
            />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
            No assessments yet
          </p>
          <p className="mx-auto mt-1 max-w-[300px] text-sm text-slate-500 dark:text-neutral-400">
            Results will appear here once the candidate completes an assessment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6">
      <SectionHeader />
      <div className="space-y-4">
        {attempts.map((attempt) => (
          <AttemptCard
            key={attempt.id}
            attempt={attempt}
            onViewAttempt={onViewAttempt}
          />
        ))}
      </div>
    </div>
  );
}
