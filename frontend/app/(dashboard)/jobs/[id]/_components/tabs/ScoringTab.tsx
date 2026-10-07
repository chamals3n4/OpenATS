"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { inputCls } from "@/components/form/form-field";
import { useIsManager } from "@/hooks/use-role";
import {
  useSaveScoreWeights,
  useSaveScorecard,
  useScorecard,
} from "@/hooks/queries/use-jobs";
import type { JobDetail } from "@/types";
import {
  CRITERION_MAX,
  MAX_CRITERIA,
  SCORE_PARTS,
  SCORING_TEMPLATES,
  SUGGESTED_CRITERIA,
  clampWeight,
  hasAnyWeight,
  sameWeights,
  sharesOf,
  templateOf,
  toWeightsPayload,
  validateCriteria,
  weightsOfJob,
  type CriterionDraft,
  type ScorePart,
  type Weights,
} from "../../lib/scoring-utils";

/** One colour per score part, shared by its tile dot and its slice of the share bar. */
const PART_COLOR: Record<ScorePart, string> = {
  questions: "bg-emerald-600",
  assessment: "bg-sky-500",
  rating: "bg-amber-500",
  interview: "bg-indigo-500",
};

const sectionCls =
  "rounded-lg border border-slate-300 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900";

function WeightsCard({ job }: { job: JobDetail }) {
  const isManager = useIsManager();
  const saved = weightsOfJob(job);
  const [weights, setWeights] = useState<Weights>(saved);
  const save = useSaveScoreWeights(job.id);

  const shares = sharesOf(weights);
  const dirty = !sameWeights(weights, saved);
  const valid = hasAnyWeight(weights);
  const activeTemplate = templateOf(weights);

  const handleSave = () =>
    save.mutate(toWeightsPayload(weights), {
      onSuccess: () => toast.success("Scoring saved"),
      onError: (e) => toast.error(e.message || "Failed to save the scoring"),
    });

  return (
    <section className={sectionCls}>
      <h3 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">Score weights</h3>
      <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
        A candidate&apos;s score is built from four parts. A part with no weight, or that has no result
        yet, is left out and the others share its place.
      </p>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Scoring templates">
        {SCORING_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={!isManager}
            onClick={() => setWeights(t.weights)}
            title={t.description}
            aria-pressed={activeTemplate === t.id}
            className={`h-8 cursor-pointer rounded-md border px-3 text-sm font-medium transition-colors disabled:cursor-default ${
              activeTemplate === t.id
                ? "border-theme bg-theme/10 text-slate-900 dark:text-neutral-100"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            {t.label}
          </button>
        ))}
        {activeTemplate === null && (
          <span className="inline-flex h-8 items-center px-1 text-sm text-slate-500 dark:text-neutral-400">
            Custom
          </span>
        )}
      </div>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {SCORE_PARTS.map((part) => (
          <li
            key={part.id}
            className="rounded-md border border-slate-200 bg-slate-50/60 p-3.5 dark:border-neutral-700 dark:bg-neutral-950/40"
          >
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor={`weight-${part.id}`}
                className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-neutral-100"
              >
                <span aria-hidden className={`size-2.5 rounded-full ${PART_COLOR[part.id]}`} />
                {part.label}
              </label>
              <span
                aria-label={`${part.label} share`}
                className="text-sm font-semibold tabular-nums text-slate-700 dark:text-neutral-300"
              >
                {shares[part.id]}%
              </span>
            </div>
            <p className="mt-1 min-h-8 text-xs text-slate-500 dark:text-neutral-400">{part.hint}</p>
            <Input
              id={`weight-${part.id}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              disabled={!isManager}
              value={weights[part.id]}
              onChange={(e) => setWeights((w) => ({ ...w, [part.id]: clampWeight(Number(e.target.value)) }))}
              className={`${inputCls} mt-2 w-full`}
            />
          </li>
        ))}
      </ul>

      <div
        role="img"
        aria-label="Share of each part"
        className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-neutral-700"
      >
        {SCORE_PARTS.map((part) => (
          <div
            key={part.id}
            style={{ width: `${shares[part.id]}%` }}
            className={`${PART_COLOR[part.id]} transition-[width] duration-200`}
          />
        ))}
      </div>

      {!valid && (
        <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
          Give at least one part a weight above 0.
        </p>
      )}

      {isManager && (
        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="cancel"
            disabled={!dirty || save.isPending}
            onClick={() => setWeights(saved)}
            className="h-9 px-4 text-sm"
          >
            Reset
          </Button>
          <Button
            type="button"
            disabled={!dirty || !valid || save.isPending}
            onClick={handleSave}
            className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
          >
            {save.isPending && <Spinner className="size-3.5" />}
            {save.isPending ? "Saving" : "Save weights"}
          </Button>
        </div>
      )}
    </section>
  );
}

function CriteriaCard({ jobId, initial }: { jobId: number; initial: CriterionDraft[] }) {
  const isManager = useIsManager();
  const [criteria, setCriteria] = useState<CriterionDraft[]>(initial);
  const [showErrors, setShowErrors] = useState(false);
  const save = useSaveScorecard(jobId);

  const errors = validateCriteria(criteria);
  const hasErrors = Object.keys(errors.byIndex).length > 0 || !!errors.list;
  const dirty = JSON.stringify(criteria) !== JSON.stringify(initial);

  const rename = (i: number, name: string) =>
    setCriteria((list) => list.map((c, idx) => (idx === i ? { ...c, name } : c)));

  const handleSave = () => {
    setShowErrors(true);
    if (hasErrors) return;
    save.mutate(
      criteria.map((c) => ({ ...(c.id && { id: c.id }), name: c.name.trim() })),
      {
        onSuccess: () => {
          setShowErrors(false);
          toast.success("Scorecard saved");
        },
        onError: (e) => toast.error(e.message || "Failed to save the scorecard"),
      },
    );
  };

  return (
    <section className={sectionCls}>
      <h3 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">Interview scorecard</h3>
      <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
        After an interview, each interviewer scores the candidate from 1 to 5 on every criterion, adds an
        overall recommendation and notes. They can&apos;t see anyone else&apos;s scorecard until they submit
        their own.
      </p>

      {criteria.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-slate-300 px-4 py-6 text-center dark:border-neutral-700">
          <p className="text-sm text-slate-600 dark:text-neutral-300">
            No criteria yet. Interviewers will give one overall star rating instead.
          </p>
          {isManager && (
            <Button
              type="button"
              variant="cancel"
              onClick={() => setCriteria(SUGGESTED_CRITERIA.map((name) => ({ name })))}
              className="mt-3 h-8 px-3 text-sm"
            >
              Use {SUGGESTED_CRITERIA.join(", ")}
            </Button>
          )}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {criteria.map((c, i) => (
            <li key={c.id ?? `new-${i}`}>
              <div className="flex items-center gap-2">
                <Input
                  aria-label={`Criterion ${i + 1}`}
                  value={c.name}
                  maxLength={CRITERION_MAX}
                  disabled={!isManager}
                  onChange={(e) => rename(i, e.target.value)}
                  placeholder="e.g. Technical skill"
                  className={`${inputCls} flex-1`}
                />
                {isManager && (
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Remove criterion ${i + 1}`}
                    title="Remove"
                    onClick={() => setCriteria((list) => list.filter((_, idx) => idx !== i))}
                    className="size-9 shrink-0 rounded-md p-0 text-slate-500 hover:bg-red-50 hover:text-red-700 dark:text-neutral-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <HugeiconsIcon icon={Delete01Icon} className="size-4" strokeWidth={1.75} />
                  </Button>
                )}
              </div>
              {showErrors && errors.byIndex[i] && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{errors.byIndex[i]}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {showErrors && errors.list && (
        <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{errors.list}</p>
      )}

      {isManager && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="cancel"
            disabled={criteria.length >= MAX_CRITERIA}
            onClick={() => setCriteria((list) => [...list, { name: "" }])}
            className="h-9 gap-2 border-dashed px-3.5 text-sm"
          >
            <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2} />
            Add criterion
          </Button>
          <Button
            type="button"
            disabled={!dirty || save.isPending}
            onClick={handleSave}
            className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
          >
            {save.isPending && <Spinner className="size-3.5" />}
            {save.isPending ? "Saving" : "Save scorecard"}
          </Button>
        </div>
      )}
    </section>
  );
}

export function ScoringTab({ job }: { job: JobDetail | undefined }) {
  const { data, isLoading } = useScorecard(job?.id ?? 0);

  if (!job || isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-5" />
      </div>
    );
  }

  const criteria = (data?.data ?? []).map((c) => ({ id: c.id, name: c.name }));
  // Remount when the saved weights or criteria change, so the editors start from what is saved.
  const criteriaKey = criteria.map((c) => `${c.id}:${c.name}`).join("|");
  const weightsKey = Object.values(weightsOfJob(job)).join("-");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-neutral-100">Scoring</h2>
        <p className="mt-0.5 max-w-3xl text-sm text-slate-500 dark:text-neutral-400">
          How candidates for this role are ranked. Points on application answers are set in Custom
          Questions, and the pass mark for a test in Assessments.
        </p>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <WeightsCard key={weightsKey} job={job} />
        <CriteriaCard key={criteriaKey} jobId={job.id} initial={criteria} />
      </div>
    </div>
  );
}
