"use client";

import { Spinner } from "@/components/ui/spinner";
import type { CandidateCvAnalysisPayload } from "@/types";

const card =
  "rounded-md border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900";

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

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/50 px-4 py-8 text-center dark:border-neutral-700 dark:bg-neutral-900/40">
      <p className="mx-auto max-w-md text-[15px] leading-relaxed text-slate-600 dark:text-neutral-400">
        {children}
      </p>
    </div>
  );
}

/**
 * The AI's notes on a candidate's CV: a summary, strengths, gaps, and which of the job's skills
 * the CV shows. It gives no score and no verdict on purpose. It describes; people decide.
 */
export function CandidateAiAnalysis({
  resumeUrl,
  cv,
}: {
  resumeUrl: string | null;
  cv: CandidateCvAnalysisPayload | null;
}) {
  if (!resumeUrl) {
    return <Notice>No CV on file, so there is nothing for the AI to read.</Notice>;
  }

  if (!cv) {
    return (
      <Notice>
        There is no AI analysis for this candidate. A CV is analysed when a candidate applies, or when
        their CV is replaced, while AI CV analysis is turned on.
      </Notice>
    );
  }

  if (cv.status === "pending") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <Spinner className="size-8" />
        <div>
          <p className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
            Reading the CV
          </p>
          <p className="mx-auto mt-1 max-w-[300px] text-sm text-slate-500 dark:text-neutral-400">
            This usually takes a few seconds.
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
          We couldn&apos;t analyse this CV
        </p>
        <p className="mt-1 text-sm leading-relaxed text-red-800 dark:text-red-200/90">
          {cv.errorMessage ?? "Something went wrong while reading it."}
        </p>
      </div>
    );
  }

  const summary = cv.aiSummary;
  const found = cv.matchedSkills ?? [];
  const notFound = cv.missingSkills ?? [];
  const strengths = summary?.strengths ?? [];
  const gaps = summary?.gaps ?? [];
  const hasNotes =
    !!summary?.quickSummary || strengths.length > 0 || gaps.length > 0 || found.length > 0 || notFound.length > 0;

  if (!hasNotes) {
    return <Notice>The AI read this CV but had nothing to note.</Notice>;
  }

  return (
    // Container queries: the same notes sit in a wide page and in a narrow side panel.
    <div className="@container space-y-4">
      {summary?.quickSummary && (
        <Panel title="Summary">
          <p className="text-[15px] leading-relaxed text-slate-800 dark:text-neutral-200">
            {summary.quickSummary}
          </p>
        </Panel>
      )}

      {(strengths.length > 0 || gaps.length > 0) && (
        <div className="grid gap-4 @2xl:grid-cols-2">
          {strengths.length > 0 && (
            <Panel title="Strengths">
              <BulletList items={strengths} />
            </Panel>
          )}
          {gaps.length > 0 && (
            <Panel title="Gaps and things to check">
              <BulletList items={gaps} />
            </Panel>
          )}
        </div>
      )}

      {(found.length > 0 || notFound.length > 0) && (
        <Panel title="Skills this job asks for">
          <div className="space-y-4">
            <SkillGroup
              title="Found in the CV"
              skills={found}
              chip="border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
            />
            <SkillGroup
              title="Not found in the CV"
              skills={notFound}
              chip="border-slate-300 bg-slate-50 text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            />
          </div>
        </Panel>
      )}

      <p className="text-sm text-slate-500 dark:text-neutral-400">
        These notes can be wrong or miss things. Read the CV yourself before you decide.
      </p>
    </div>
  );
}
