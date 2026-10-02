"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import type { AttentionReport } from "@/types";
import { ageLabel, daysAgo, interviewWhen } from "../../lib/overview-utils";
import { cardCls } from "./card";

interface AttentionPanelProps {
  report: AttentionReport | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  now: number;
}

function Column({
  title,
  count,
  href,
  hrefLabel,
  emptyText,
  children,
}: {
  title: string;
  count: number;
  href: string;
  hrefLabel: string;
  emptyText: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-slate-600 dark:text-neutral-400">{title}</h3>
        <p className="text-2xl leading-none font-semibold tabular-nums text-slate-900 dark:text-neutral-100">
          {count}
        </p>
      </div>

      <div className="mt-3 min-h-[3.5rem] flex-1">
        {count === 0 ? (
          <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-neutral-400">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
            {emptyText}
          </p>
        ) : (
          children
        )}
      </div>

      <Link
        href={href}
        className="mt-3 text-sm font-medium text-theme hover:underline dark:text-primary"
      >
        {hrefLabel}
      </Link>
    </section>
  );
}

function Row({
  href,
  title,
  detail,
  meta,
}: {
  href: string;
  title: string;
  detail: string;
  meta: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="-mx-2 flex items-start justify-between gap-3 rounded-md px-2 py-1.5 outline-none transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-slate-900 dark:text-neutral-100">
            {title}
          </span>
          <span className="block truncate text-xs text-slate-500 dark:text-neutral-400">{detail}</span>
        </span>
        <span className="shrink-0 pt-0.5 text-xs font-medium whitespace-nowrap text-slate-700 dark:text-neutral-300">
          {meta}
        </span>
      </Link>
    </li>
  );
}

/** What a hiring manager should look at today, with a way into each. */
export function AttentionPanel({ report, isLoading, isError, onRetry, now }: AttentionPanelProps) {
  if (isError && !report) {
    return (
      <section className={`${cardCls} flex flex-wrap items-center justify-between gap-3 px-5 py-4`} role="alert">
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          Could not load what needs your attention.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Try again
        </button>
      </section>
    );
  }

  if (isLoading || !report) {
    return <div className={`${cardCls} h-48 animate-pulse bg-slate-100 dark:bg-neutral-800`} />;
  }

  const { newApplicants, upcomingInterviews, offersAwaitingAnswer, stalledCandidates } = report;

  return (
    <section
      aria-label="Needs your attention"
      className={`${cardCls} grid grid-cols-1 divide-y divide-slate-300 sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4 xl:divide-x dark:divide-neutral-700`}
    >
      <Column
        title="New applicants"
        count={newApplicants.last24h}
        href="/candidates"
        hrefLabel="View candidates"
        emptyText="No new applicants in the last 24 hours"
      >
        <p className="text-sm text-slate-600 dark:text-neutral-400">in the last 24 hours</p>
      </Column>

      <Column
        title="Interviews this week"
        count={upcomingInterviews.count}
        href="/interviews"
        hrefLabel="Open interviews"
        emptyText="No interviews scheduled this week"
      >
        <ul>
          {upcomingInterviews.items.map((i) => (
            <Row
              key={i.interviewId}
              href={`/candidates/${i.candidateId}`}
              title={i.candidateName}
              detail={i.jobTitle}
              meta={interviewWhen(i.startsAt, now)}
            />
          ))}
        </ul>
      </Column>

      <Column
        title="Offers waiting for an answer"
        count={offersAwaitingAnswer.count}
        href="/offers"
        hrefLabel="Open offers"
        emptyText="No offers are waiting"
      >
        <ul>
          {offersAwaitingAnswer.items.map((o) => (
            <Row
              key={o.offerId}
              href={`/candidates/${o.candidateId}`}
              title={o.candidateName}
              detail={o.jobTitle}
              meta={`Sent ${ageLabel(daysAgo(o.sentAt, now))}${daysAgo(o.sentAt, now) > 0 ? " ago" : ""}`}
            />
          ))}
        </ul>
      </Column>

      <Column
        title={`Waiting ${stalledCandidates.afterDays}+ days in a stage`}
        count={stalledCandidates.count}
        href="/jobs"
        hrefLabel="Open jobs"
        emptyText="Nobody is stuck in a stage"
      >
        <ul>
          {stalledCandidates.items.map((c) => (
            <Row
              key={c.candidateId}
              href={`/candidates/${c.candidateId}`}
              title={c.candidateName}
              detail={`${c.stageName} · ${c.jobTitle}`}
              meta={ageLabel(c.days)}
            />
          ))}
        </ul>
      </Column>
    </section>
  );
}
