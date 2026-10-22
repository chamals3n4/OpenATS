"use client";

import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  ContractsIcon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons";
import type { AttentionReport } from "@/types";
import { ageLabel, daysAgo, interviewWhen } from "../../_lib/overview-utils";
import { cardCls } from "./card";

interface AttentionPanelProps {
  report: AttentionReport | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  now: number;
}

type Person = { key: number; href: string; name: string; meta: string };

interface Task {
  id: string;
  icon: IconSvgElement;
  count: number;
  label: string;
  /** Overdue kinds get a coloured number so they stand out */
  urgent?: "red" | "amber";
  /** Said in the "also clear" line when there is nothing to do */
  clear: string;
  href: string;
  hrefLabel: string;
  people: Person[];
}

// The count sits beside the label as a small badge; overdue kinds are tinted
const BADGE = {
  red: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900",
  amber: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  plain: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700",
} as const;

function TaskRow({ task }: { task: Task }) {
  const more = task.count - task.people.length;
  return (
    <li className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-neutral-100">
          <HugeiconsIcon icon={task.icon} className="size-4 shrink-0 text-slate-400 dark:text-neutral-500" strokeWidth={1.75} aria-hidden />
          {task.label}
          <span
            className={`rounded-md px-1.5 py-px text-xs font-semibold tabular-nums ring-1 ring-inset ${BADGE[task.urgent ?? "plain"]}`}
          >
            {task.count}
          </span>
        </p>
        {task.people.length > 0 && (
          <p className="mt-1 truncate pl-6 text-sm text-slate-500 dark:text-neutral-400">
            {task.people.map((person, index) => (
              <span key={person.key}>
                {index > 0 && ", "}
                <Link
                  href={person.href}
                  className="text-slate-700 underline-offset-2 hover:text-theme hover:underline dark:text-neutral-300"
                >
                  {person.name}
                </Link>{" "}
                <span className="text-slate-400 dark:text-neutral-500">({person.meta})</span>
              </span>
            ))}
            {more > 0 && ` and ${more} more`}
          </p>
        )}
      </div>
      <Link
        href={task.href}
        className="inline-flex shrink-0 items-center gap-1 pl-6 text-sm font-medium text-theme hover:underline sm:pl-0 dark:text-primary"
      >
        {task.hrefLabel}
        <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" aria-hidden />
      </Link>
    </li>
  );
}

/** What a manager should look at today */
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
    return <div className={`${cardCls} h-40 animate-pulse bg-slate-100 dark:bg-neutral-800`} />;
  }

  const { newApplicants, upcomingInterviews, offersAwaitingAnswer, stalledCandidates } = report;

  const tasks: Task[] = [
    {
      id: "stalled",
      icon: Clock01Icon,
      urgent: "red",
      count: stalledCandidates.count,
      label: `Waiting ${stalledCandidates.afterDays}+ days in a stage`,
      clear: "stalled candidates",
      href: "/jobs",
      hrefLabel: "Open jobs",
      people: stalledCandidates.items.map((c) => ({
        key: c.candidateId,
        href: `/candidates/${c.candidateId}`,
        name: c.candidateName,
        meta: ageLabel(c.days),
      })),
    },
    {
      id: "offers",
      icon: ContractsIcon,
      urgent: "amber",
      count: offersAwaitingAnswer.count,
      label: "Offers waiting for an answer",
      clear: "offers",
      href: "/offers",
      hrefLabel: "Open offers",
      people: offersAwaitingAnswer.items.map((o) => ({
        key: o.offerId,
        href: `/candidates/${o.candidateId}`,
        name: o.candidateName,
        meta: `sent ${ageLabel(daysAgo(o.sentAt, now))}${daysAgo(o.sentAt, now) > 0 ? " ago" : ""}`,
      })),
    },
    {
      id: "interviews",
      icon: Calendar03Icon,
      count: upcomingInterviews.count,
      label: "Interviews this week",
      clear: "interviews",
      href: "/interviews",
      hrefLabel: "Open interviews",
      people: upcomingInterviews.items.map((i) => ({
        key: i.interviewId,
        href: `/candidates/${i.candidateId}`,
        name: i.candidateName,
        meta: interviewWhen(i.startsAt, now),
      })),
    },
    {
      id: "applicants",
      icon: UserAdd01Icon,
      count: newApplicants.last24h,
      label: "New applicants in the last 24 hours",
      clear: "new applicants",
      href: "/candidates",
      hrefLabel: "View candidates",
      people: [],
    },
  ];
  const open = tasks.filter((task) => task.count > 0);
  const clear = tasks.filter((task) => task.count === 0);

  return (
    <section aria-label="Needs your attention" className={`${cardCls} overflow-hidden`}>
      <header className="flex items-baseline justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-neutral-800">
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">Needs you today</h2>
      </header>

      {open.length === 0 ? (
        <p className="flex items-center gap-2 px-5 py-5 text-sm text-slate-600 dark:text-neutral-400">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          Nothing needs you right now.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-slate-200 dark:divide-neutral-800">
            {open.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
          {clear.length > 0 && (
            <p className="border-t border-slate-200 px-5 py-2.5 text-xs text-slate-500 dark:border-neutral-800 dark:text-neutral-500">
              Nothing waiting for {clear.map((task) => task.clear).join(", ")}.
            </p>
          )}
        </>
      )}
    </section>
  );
}
