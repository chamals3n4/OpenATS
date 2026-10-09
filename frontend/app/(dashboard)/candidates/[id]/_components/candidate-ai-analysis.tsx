"use client";

import { Spinner } from "@/components/ui/spinner";
import {
  VERDICT_LABELS,
  breakdownRows,
  normalizeScore,
  resolveVerdict,
  toneForVerdict,
  type Tone,
} from "../lib/job-fit-utils";
import type { CandidateCvAnalysisPayload } from "@/types";

const card =
  "rounded-md border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900";

const TONE: Record<Tone, { text: string; bar: string; pill: string }> = {
  good: {
    text: "text-emerald-700 dark:text-emerald-400",
    bar: "bg-emerald-500",
    pill: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  fair: {
    text: "text-amber-700 dark:text-amber-400",
    bar: "bg-amber-500",
    pill: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  },
  poor: {
    text: "text-rose-700 dark:text-rose-400",
    bar: "bg-rose-500",
    pill: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300",
  },
};

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${card} px-5 py-4`}>
      <h3 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SkillGroup({
  title,
  skills,
  chip,
}: {
  title: string;
  skills: string[];
  chip: string;
}) {
  if (skills.length === 0) return null;
  return (
    <div>
      <h4 className="mb-2 text-sm font-medium text-slate-600 dark:text-neutral-400">
        {title} ({skills.length})
      </h4>
      <ul className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <li
            key={skill}
            className={`rounded-md border px-2.5 py-1 text-sm font-medium ${chip}`}
          >
            {skill}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span
            aria-hidden
            className="mt-2 size-1.5 shrink-0 rounded-full bg-slate-400 dark:bg-neutral-500"
          />
          <span className="text-[15px] leading-relaxed text-slate-800 dark:text-neutral-200">
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CandidateJobFitTab({
  resumeUrl,
  cv,
}: {
  resumeUrl: string | null;
  cv: CandidateCvAnalysisPayload | null;
}) {
  if (!resumeUrl) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/50 px-4 py-8 text-center dark:border-neutral-700 dark:bg-neutral-900/40">
        <p className="text-[15px] leading-relaxed text-slate-600 dark:text-neutral-400">
          No resume on file. Upload a resume when applying to get an automatic
          job fit summary.
        </p>
      </div>
    );
  }

  if (!cv) {
    return (
      <div className="rounded-md border border-slate-300 bg-slate-50/50 px-4 py-8 text-center dark:border-neutral-700 dark:bg-neutral-900/40">
        <p className="text-[15px] text-slate-600 dark:text-neutral-400">
          Job fit has not run for this candidate yet.
        </p>
      </div>
    );
  }

  if (cv.status === "pending") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <Spinner className="size-8" />
        <div>
          <p className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
            Analysing the resume
          </p>
          <p className="mx-auto mt-1 max-w-[300px] text-sm text-slate-500 dark:text-neutral-400">
            It is being compared with this job. This usually takes a few
            seconds.
          </p>
        </div>
      </div>
    );
  }

  if (cv.status === "failed") {
    return (
      <div
        role="alert"
        className="rounded-md border border-red-300 bg-red-50 px-4 py-4 dark:border-red-900/50 dark:bg-red-950/25"
      >
        <p className="text-[15px] font-semibold text-red-800 dark:text-red-300">
          We couldn&apos;t analyse this resume
        </p>
        <p className="mt-1 text-sm leading-relaxed text-red-800 dark:text-red-200/90">
          {cv.errorMessage ?? "Something went wrong while reading it."}
        </p>
      </div>
    );
  }

  const score = normalizeScore(cv.matchScore);
  const summary = cv.aiSummary;
  const verdict = resolveVerdict(score, summary?.verdict);
  const tone = TONE[toneForVerdict(verdict)];
  const matched = cv.matchedSkills ?? [];
  const missing = cv.missingSkills ?? [];
  const rows = cv.scoreBreakdown ? breakdownRows(cv.scoreBreakdown) : [];

  return (
    // Container queries: the same tab sits in a wide page and in a narrow side panel.
    <div className="@container space-y-4">
      <section className={`${card} px-5 py-5`}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="flex items-baseline gap-1.5">
            <span
              className={`text-4xl font-semibold leading-none tabular-nums ${tone.text}`}
            >
              {score}
            </span>
            <span className="text-base text-slate-500 dark:text-neutral-400">
              / 100
            </span>
          </p>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${tone.pill}`}
          >
            {VERDICT_LABELS[verdict]}
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Overall match"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={score}
          className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-neutral-700"
        >
          <div
            className={`h-full rounded-full ${tone.bar}`}
            style={{ width: `${score}%` }}
          />
        </div>

        {summary?.quickSummary && (
          <p className="mt-4 text-[15px] leading-relaxed text-slate-800 dark:text-neutral-200">
            {summary.quickSummary}
          </p>
        )}
      </section>

      <div className="grid gap-4 @2xl:grid-cols-2">
        {(matched.length > 0 || missing.length > 0) && (
          <Panel title="Skills match">
            <div className="space-y-4">
              <SkillGroup
                title="Matching skills"
                skills={matched}
                chip="border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
              />
              <SkillGroup
                title="Missing skills"
                skills={missing}
                chip="border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
              />
            </div>
          </Panel>
        )}

        {rows.length > 0 && (
          <Panel title="How the score breaks down">
            <ul className="space-y-3.5">
              {rows.map((row) => (
                <li key={row.key}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="text-sm text-slate-700 dark:text-neutral-300">
                      {row.label}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-slate-500 dark:text-neutral-400">
                      <span className="font-semibold text-slate-900 dark:text-neutral-100">
                        {row.points}
                      </span>
                      /{row.max}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={row.label}
                    aria-valuemin={0}
                    aria-valuemax={row.max}
                    aria-valuenow={row.points}
                    className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-neutral-700"
                  >
                    <div
                      className="h-full rounded-full bg-slate-700 dark:bg-neutral-300"
                      style={{ width: `${row.percent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      {summary && (
        <>
          {(summary.strengths.length > 0 || summary.gaps.length > 0) && (
            <div className="grid gap-4 @2xl:grid-cols-2">
              {summary.strengths.length > 0 && (
                <Panel title="Strengths">
                  <BulletList items={summary.strengths} />
                </Panel>
              )}
              {summary.gaps.length > 0 && (
                <Panel title="Gaps and things to check">
                  <BulletList items={summary.gaps} />
                </Panel>
              )}
            </div>
          )}

          {summary.hiringSignal && (
            <section className="rounded-md border border-slate-300 bg-slate-50 px-5 py-4 dark:border-neutral-700 dark:bg-neutral-950/40">
              <h3 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
                Hiring signal
              </h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-slate-800 dark:text-neutral-200">
                {summary.hiringSignal}
              </p>
            </section>
          )}
        </>
      )}

      <p className="text-sm text-slate-500 dark:text-neutral-400">
        Generated automatically from the resume and this job&apos;s
        requirements. Read the CV before you decide.
      </p>
    </div>
  );
}
