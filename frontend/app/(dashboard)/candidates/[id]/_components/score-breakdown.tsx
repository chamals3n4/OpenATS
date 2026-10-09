"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { StarRating, RATING_LABELS } from "@/components/star-rating";
import { useCurrentUser } from "@/hooks/queries/use-user";
import { useRateCandidate } from "@/hooks/queries/use-candidates";
import { SCORE_PARTS, formatScore, sharesOf, type ScorePart } from "@/lib/scoring";
import type { CandidateDetail } from "@/types";

const PART_FIELD: Record<ScorePart, keyof CandidateDetail> = {
  questions: "questionsScore",
  assessment: "assessmentScore",
  rating: "ratingScore",
  interview: "interviewScore",
};

const toNumber = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

/** The candidate's total score, its four parts, and the viewer's own star rating. */
export function ScoreBreakdown({ candidate }: { candidate: CandidateDetail }) {
  const { data: me } = useCurrentUser();
  const rate = useRateCandidate();

  const weights = candidate.weights ?? { questions: 30, assessment: 30, rating: 10, interview: 30 };
  const shares = sharesOf(weights);
  const weightedParts = SCORE_PARTS.filter((p) => weights[p.id] > 0).length;
  const total = toNumber(candidate.totalScore);

  const ratings = candidate.ratings ?? [];
  const isInterviewer = me?.data?.role === "interviewer";
  const spread = candidate.interviewSpread;
  const myRating = ratings.find((r) => r.userId === me?.data?.id)?.rating ?? null;

  // Clicking a star only changes what is shown. Nothing is saved until Update score is pressed.
  const [picked, setPicked] = useState<number | null | undefined>(undefined);
  const shownRating = picked !== undefined ? picked : myRating;
  const changed = picked !== undefined && picked !== myRating;

  const handleUpdate = () => {
    if (!changed) return;
    rate.mutate(
      { id: candidate.id, rating: picked },
      {
        onSuccess: () => setPicked(undefined),
        onError: () => toast.error("Failed to update the score"),
      },
    );
  };

  return (
    <section aria-label="Score" className="border-b border-slate-300 p-5 sm:p-6 dark:border-neutral-700">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-neutral-100">Score</h3>
          <p className="mt-0.5 text-[15px] text-slate-500 dark:text-neutral-400">
            {candidate.scoredParts ?? 0} of {weightedParts} {weightedParts === 1 ? "part" : "parts"} scored so far
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            type="button"
            onClick={handleUpdate}
            disabled={!changed || rate.isPending}
            className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
          >
            {rate.isPending && <Spinner className="size-3.5" />}
            {rate.isPending ? "Updating" : "Update score"}
          </Button>
          <p
            aria-label="Total score"
            className="text-4xl font-semibold leading-none tabular-nums text-slate-900 dark:text-neutral-100"
          >
            {formatScore(total)}
            {total !== null && <span className="ml-1 text-lg font-medium text-slate-400">/100</span>}
          </p>
        </div>
      </div>

      {(candidate.knockedOut || candidate.assessmentPassed === false) && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Flags">
          {candidate.knockedOut && (
            <li className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
              Does not meet requirements
            </li>
          )}
          {candidate.assessmentPassed === false && (
            <li className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              Failed assessment
            </li>
          )}
        </ul>
      )}

      <ul className="mt-5 space-y-3">
        {SCORE_PARTS.map((part) => {
          const score = toNumber(candidate[PART_FIELD[part.id]]);
          const unused = weights[part.id] <= 0;
          return (
            <li key={part.id} className="grid items-center gap-x-4 gap-y-1 sm:grid-cols-[8rem_1fr_6rem]">
              <span className="text-sm font-medium text-slate-900 dark:text-neutral-100">
                {part.label}
                <span className="ml-1.5 text-xs font-normal text-slate-500 dark:text-neutral-400">
                  {unused ? "not used" : `${shares[part.id]}%`}
                </span>
              </span>
              <div
                role="progressbar"
                aria-label={`${part.label} score`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={score === null ? undefined : Math.round(score)}
                className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-neutral-700"
              >
                {score !== null && !unused && (
                  <div
                    className="h-full rounded-full bg-theme"
                    style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                  />
                )}
              </div>
              <span className="text-sm tabular-nums text-slate-700 sm:text-right dark:text-neutral-300">
                {unused
                  ? "—"
                  : score === null
                    ? part.id === "interview" && isInterviewer
                      ? "Hidden for now"
                      : "Not yet"
                    : `${formatScore(score)} / 100`}
              </span>
              {part.id === "interview" && !unused && (score !== null || isInterviewer) && (
                <p className="text-xs text-slate-500 sm:col-span-3 dark:text-neutral-400">
                  {score === null
                    ? "Interview scores show after you submit your own scorecard."
                    : spread && spread.count > 1
                      ? `${spread.count} scorecards, from ${formatScore(spread.min)} to ${formatScore(spread.max)}`
                      : "1 scorecard so far"}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 pt-4 dark:border-neutral-800">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-neutral-100">Your rating</p>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            After reading the CV.{" "}
            {ratings.length > 0 &&
              `${ratings.length} ${ratings.length === 1 ? "person has" : "people have"} rated.`}
          </p>
        </div>
        <StarRating label="Your rating" value={shownRating} onChange={setPicked} disabled={rate.isPending} />
        <span className="text-sm text-slate-500 dark:text-neutral-400">
          {shownRating ? RATING_LABELS[shownRating - 1] : "Not rated"}
        </span>
      </div>
    </section>
  );
}
