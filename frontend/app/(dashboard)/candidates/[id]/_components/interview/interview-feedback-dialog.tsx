"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon, LockIcon, StarIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { StarRating, RATING_LABELS } from "@/components/star-rating";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAddInterviewFeedback,
  useDeleteInterviewFeedback,
  useInterviewFeedback,
  type InterviewScorecard,
  type Recommendation,
} from "@/hooks/queries/use-interview-feedback";
import { useScorecard } from "@/hooks/queries/use-jobs";
import { useCurrentUser } from "@/hooks/queries/use-user";
import { useIsManager } from "@/hooks/use-role";

interface InterviewFeedbackDialogProps {
  interviewId: number;
  interviewName: string;
  /** The job being interviewed for, which decides the scorecard's criteria. */
  jobId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatFeedbackDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const RECOMMENDATIONS: { value: Recommendation; label: string; tone: string }[] = [
  { value: "strong_no", label: "Strong no", tone: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
  { value: "no", label: "No", tone: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400" },
  { value: "yes", label: "Yes", tone: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
  { value: "strong_yes", label: "Strong yes", tone: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" },
];

const recommendationOf = (value: Recommendation | null) =>
  RECOMMENDATIONS.find((r) => r.value === value) ?? null;

function SubmittedScorecard({
  card,
  canDelete,
  onDelete,
}: {
  card: InterviewScorecard;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const recommendation = recommendationOf(card.recommendation);
  return (
    <article className="rounded-md border border-slate-300 bg-slate-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-950/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-semibold text-slate-900 dark:text-neutral-100">{card.authorName}</span>
          {recommendation && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${recommendation.tone}`}>
              {recommendation.label}
            </span>
          )}
          {card.rating && card.ratings.length === 0 && (
            <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
              <HugeiconsIcon icon={StarIcon} className="size-3.5 fill-current" />
              {card.rating}/5
            </span>
          )}
          <span className="text-slate-500 dark:text-neutral-400">{formatFeedbackDate(card.updatedAt)}</span>
        </div>
        {canDelete && (
          <Button
            variant="ghost"
            aria-label={`Delete scorecard from ${card.authorName}`}
            title="Delete"
            onClick={onDelete}
            className="-mr-1.5 -mt-1 size-7 shrink-0 rounded-md p-0 text-slate-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          >
            <HugeiconsIcon icon={Delete01Icon} className="size-4" strokeWidth={1.75} />
          </Button>
        )}
      </div>

      {card.ratings.length > 0 && (
        <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {card.ratings.map((r) => (
            <div key={r.criterionId} className="flex items-center justify-between gap-3">
              <dt className="text-slate-600 dark:text-neutral-400">{r.name}</dt>
              <dd className="font-semibold tabular-nums text-slate-900 dark:text-neutral-100">{r.rating}/5</dd>
            </div>
          ))}
        </dl>
      )}

      {card.content && (
        <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-slate-800 dark:text-neutral-200">
          {card.content}
        </p>
      )}
    </article>
  );
}

/**
 * The interviewers' scorecards for an interview, and the form to fill in your own. An
 * interviewer sees nobody else's scorecard until they have submitted theirs.
 */
export function InterviewFeedbackDialog({
  interviewId,
  interviewName,
  jobId,
  open,
  onOpenChange,
}: InterviewFeedbackDialogProps) {
  const isManager = useIsManager();
  const { data: me } = useCurrentUser();
  const { data, isLoading } = useInterviewFeedback(interviewId);
  const { data: criteriaData } = useScorecard(jobId);
  const addFeedback = useAddInterviewFeedback();
  const deleteFeedback = useDeleteInterviewFeedback();

  const cards = data?.data ?? [];
  const meta = data?.meta;
  const criteria = criteriaData?.data ?? [];
  const mine = cards.find((c) => c.authorId === me?.data?.id);
  const hasSubmitted = meta?.hasSubmitted ?? !!mine;
  const hiddenCount = meta?.hiddenCount ?? 0;

  const [scores, setScores] = useState<Record<number, number | null>>({});
  const [overall, setOverall] = useState<number | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [text, setText] = useState("");
  const [seededFrom, setSeededFrom] = useState<number | null>(null);

  // Start the form from the scorecard you already submitted, so submitting again edits it.
  if (mine && seededFrom !== mine.id) {
    setSeededFrom(mine.id);
    setScores(Object.fromEntries(mine.ratings.map((r) => [r.criterionId, r.rating])));
    setOverall(mine.rating);
    setRecommendation(mine.recommendation);
    setText(mine.content);
  }

  const ratings = criteria.flatMap((c) => {
    const rating = scores[c.id];
    return rating ? [{ criterionId: c.id, rating }] : [];
  });
  const canSubmit =
    !addFeedback.isPending &&
    (text.trim().length > 0 || ratings.length > 0 || overall !== null || recommendation !== null);

  const handleSubmit = () => {
    if (!canSubmit) return;
    addFeedback.mutate(
      {
        interviewId,
        content: text.trim(),
        rating: criteria.length === 0 ? overall : null,
        recommendation,
        ratings,
      },
      {
        onSuccess: () => toast.success(mine ? "Scorecard updated" : "Scorecard submitted"),
        onError: () => toast.error("Failed to submit the scorecard"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto border-slate-200 bg-white p-6 sm:max-w-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900 dark:text-neutral-100">
            Interview scorecard
          </DialogTitle>
          <DialogDescription>
            {interviewName}. Scorecards are only visible to your team.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[35vh] min-h-24 space-y-3 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-5" />
            </div>
          ) : !hasSubmitted && hiddenCount > 0 ? (
            <p className="flex items-center gap-2.5 rounded-md border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-600 dark:border-neutral-700 dark:text-neutral-300">
              <HugeiconsIcon icon={LockIcon} className="size-4 shrink-0" />
              {hiddenCount === 1
                ? "1 scorecard is hidden"
                : `${hiddenCount} scorecards are hidden`}{" "}
              until you submit your own, so nobody&apos;s view sways another&apos;s.
            </p>
          ) : cards.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
              No scorecards yet. Be the first to submit one.
            </p>
          ) : (
            cards.map((card) => (
              <SubmittedScorecard
                key={card.id}
                card={card}
                canDelete={isManager}
                onDelete={() =>
                  deleteFeedback.mutate(
                    { interviewId, feedbackId: card.id },
                    { onError: () => toast.error("Failed to delete the scorecard") },
                  )
                }
              />
            ))
          )}
        </div>

        <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-neutral-800">
          <h3 className="text-sm font-medium text-slate-800 dark:text-neutral-200">
            {mine ? "Your scorecard" : "Fill in your scorecard"}
          </h3>

          {criteria.length > 0 ? (
            <ul className="space-y-2">
              {criteria.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-slate-800 dark:text-neutral-200">{c.name}</span>
                  <span className="flex items-center gap-2">
                    <StarRating
                      label={c.name}
                      size="sm"
                      value={scores[c.id] ?? null}
                      onChange={(v) => setScores((s) => ({ ...s, [c.id]: v }))}
                    />
                    <span className="w-24 text-xs text-slate-500 dark:text-neutral-400">
                      {scores[c.id] ? RATING_LABELS[(scores[c.id] as number) - 1] : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-slate-800 dark:text-neutral-200">Overall</span>
              <span className="flex items-center gap-2">
                <StarRating label="Overall rating" size="sm" value={overall} onChange={setOverall} />
                <span className="w-24 text-xs text-slate-500 dark:text-neutral-400">
                  {overall ? RATING_LABELS[overall - 1] : "Optional"}
                </span>
              </span>
            </div>
          )}

          <div role="radiogroup" aria-label="Recommendation" className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm text-slate-800 dark:text-neutral-200">Recommendation</span>
            {RECOMMENDATIONS.map((r) => (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={recommendation === r.value}
                onClick={() => setRecommendation(recommendation === r.value ? null : r.value)}
                className={`h-8 cursor-pointer rounded-md border px-3 text-sm font-medium transition-colors ${
                  recommendation === r.value
                    ? `border-transparent ${r.tone}`
                    : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={`feedback-${interviewId}`}
              className="text-sm text-slate-800 dark:text-neutral-200"
            >
              Notes
            </label>
            <Textarea
              id={`feedback-${interviewId}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
              }}
              placeholder="How did the interview go? Strengths and concerns."
              rows={4}
              className="min-h-24 resize-y border-slate-300 bg-gray-100 text-sm shadow-none dark:border-neutral-600 dark:bg-neutral-800"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="hidden text-xs text-slate-500 sm:block dark:text-neutral-400">
              Ctrl/⌘ + Enter to submit
            </span>
            <div className="ml-auto flex gap-2">
              <Button variant="cancel" onClick={() => onOpenChange(false)} className="h-9 px-4 text-sm">
                Close
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
              >
                {addFeedback.isPending && <Spinner className="size-3.5" />}
                {addFeedback.isPending ? "Saving" : mine ? "Update scorecard" : "Submit scorecard"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
