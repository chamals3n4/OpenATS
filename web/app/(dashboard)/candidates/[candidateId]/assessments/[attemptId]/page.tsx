"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  useAssessmentAttemptReview,
  type AssessmentReviewQuestion,
} from "@/hooks/use-api";

function formatReviewDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function rubricFromDescription(desc: string | null) {
  if (!desc) return null;
  if (desc.startsWith("[AI_GRADED]")) {
    return desc.replace(/^\[AI_GRADED\]\s*\n?/, "").trim() || null;
  }
  return desc.trim() || null;
}

function QuestionCard({ q, index }: { q: AssessmentReviewQuestion; index: number }) {
  const isObjective =
    q.questionType === "multiple_choice" ||
    q.questionType === "radio" ||
    q.questionType === "checkbox";
  const rubric = q.questionType === "short_answer" ? rubricFromDescription(q.description) : null;

  const pts =
    q.pointsEarned != null
      ? `${q.pointsEarned} / ${q.maxPoints} pts`
      : `0 / ${q.maxPoints} pts`;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/80 dark:bg-neutral-900/50">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-neutral-500">
              Question {index + 1}
            </span>
            <p className="text-[14px] font-semibold text-slate-800 dark:text-neutral-100 mt-1">
              {q.title}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="outline" className="text-[11px] font-medium capitalize">
              {q.questionType.replace(/_/g, " ")}
            </Badge>
            <span className="text-[12px] font-bold text-slate-600 dark:text-neutral-300">
              {pts}
            </span>
          </div>
        </div>
      </div>
      <div className="px-4 py-3 space-y-4 text-[13px]">
        {isObjective && (
          <>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                Candidate answer
              </p>
              {q.selectedOptionLabels.length > 0 ? (
                <ul className="list-disc list-inside text-slate-700 dark:text-neutral-300 space-y-0.5">
                  {q.selectedOptionLabels.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 italic">No option selected</p>
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1.5">
                Correct answer
              </p>
              {q.correctOptionLabels.length > 0 ? (
                <ul className="list-disc list-inside text-slate-700 dark:text-neutral-300 space-y-0.5">
                  {q.correctOptionLabels.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 italic">—</p>
              )}
            </div>
          </>
        )}
        {q.questionType === "short_answer" && (
          <>
            {rubric && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                  Rubric (AI grading)
                </p>
                <p className="text-slate-600 dark:text-neutral-400 whitespace-pre-wrap leading-relaxed">
                  {rubric}
                </p>
              </div>
            )}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                Candidate answer
              </p>
              <p className="text-slate-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed rounded-lg bg-slate-50 dark:bg-neutral-900/80 px-3 py-2 border border-slate-100 dark:border-neutral-800">
                {q.candidateAnswerText?.trim() || (
                  <span className="italic text-slate-400">No answer submitted</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-500 mb-1.5">
                AI feedback & grade
              </p>
              {q.aiFeedback ? (
                <p className="text-slate-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed rounded-lg border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2">
                  {q.aiFeedback}
                </p>
              ) : (
                <p className="text-slate-400 italic text-[12px]">
                  No AI rationale stored for this attempt. New completions will include
                  feedback when Groq grading returns it.
                </p>
              )}
            </div>
          </>
        )}
        {q.questionType === "long_answer" && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
              Candidate answer
            </p>
            <p className="text-slate-700 dark:text-neutral-300 whitespace-pre-wrap">
              {q.candidateAnswerText?.trim() || (
                <span className="italic text-slate-400">No answer submitted</span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CandidateAssessmentReviewPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = Number(params.candidateId);
  const attemptId = Number(params.attemptId);

  const { data, isLoading, isError } = useAssessmentAttemptReview(
    candidateId,
    attemptId,
    { enabled: Number.isFinite(candidateId) && Number.isFinite(attemptId) },
  );

  const review = data?.data;

  return (
    <div className="flex flex-col min-h-0 gap-6 p-6 max-w-4xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit gap-2 text-slate-600 dark:text-neutral-400 -ml-2"
          onClick={() => router.back()}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" strokeWidth={2} />
          Back
        </Button>
        <Link
          href="/candidates"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
        >
          Candidates
        </Link>
      </div>

      {isLoading && (
        <p className="text-slate-500 dark:text-neutral-400 text-sm">Loading review…</p>
      )}
      {isError && (
        <p className="text-red-500 text-sm">
          Could not load this assessment review. Check that the link is valid.
        </p>
      )}
      {review && (
        <>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-neutral-100">
              {review.attempt.assessmentTitle}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-[13px] text-slate-500 dark:text-neutral-400">
              <span>
                Completed {formatReviewDate(review.attempt.completedAt)}
              </span>
              {review.attempt.scorePercentage != null && (
                <>
                  <span aria-hidden>·</span>
                  <span className="font-semibold text-slate-700 dark:text-neutral-300">
                    Score {Math.round(Number(review.attempt.scorePercentage))}%
                  </span>
                </>
              )}
              {review.attempt.passed != null && (
                <Badge
                  className={
                    review.attempt.passed
                      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                  }
                >
                  {review.attempt.passed ? "Passed" : "Not passed"}
                </Badge>
              )}
            </div>
            {review.attempt.scoreRaw != null &&
              review.attempt.scoreTotal != null && (
                <p className="text-[12px] text-slate-400 mt-1">
                  Points earned: {Number(review.attempt.scoreRaw).toFixed(1)} /{" "}
                  {Number(review.attempt.scoreTotal).toFixed(1)}
                </p>
              )}
          </div>

          <div className="space-y-4">
            {review.questions.map((q, i) => (
              <QuestionCard key={q.questionId} q={q} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
