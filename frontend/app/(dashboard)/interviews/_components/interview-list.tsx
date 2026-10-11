"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Location01Icon, Video01Icon } from "@hugeicons/core-free-icons";
import type { InterviewListItem } from "@/types";
import { OUTCOME_CONFIG, STATUS_CONFIG, fmtTimeRange } from "./constants";
import { InterviewActions } from "./interview-actions";
import { dayKey, groupByDay } from "../lib/calendar-utils";

interface InterviewListProps {
  interviews: InterviewListItem[];
  onFeedback: (iv: InterviewListItem) => void;
  onEdit: (iv: InterviewListItem) => void;
}

function dayTitle(key: string, todayKey: string, tomorrowKey: string) {
  const date = new Date(`${key}T00:00:00`);
  const long = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  if (key === todayKey) return { title: "Today", detail: long };
  if (key === tomorrowKey) return { title: "Tomorrow", detail: long };
  return { title: long, detail: null };
}

/** Every interview, a day at a time, with the ones still waiting for a time at the end. */
export function InterviewList({ interviews, onFeedback, onEdit }: InterviewListProps) {
  const now = new Date();
  const todayKey = dayKey(now);
  const tomorrowKey = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));

  const byDay = groupByDay(interviews);
  const waiting = interviews.filter((iv) => !iv.scheduledAt);
  const groups = [
    ...[...byDay.keys()].sort().map((key) => ({ key, ...dayTitle(key, todayKey, tomorrowKey), items: byDay.get(key)! })),
    ...(waiting.length > 0
      ? [{ key: "waiting", title: "Waiting for a time", detail: "The candidate has not picked a time yet", items: waiting }]
      : []),
  ];

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key} aria-label={group.title}>
          <header className="mb-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <h2
              className={`text-[15px] font-semibold ${
                group.key === todayKey ? "text-theme dark:text-primary" : "text-slate-900 dark:text-neutral-100"
              }`}
            >
              {group.title}
            </h2>
            {group.detail && <span className="text-sm text-slate-600 dark:text-neutral-400">{group.detail}</span>}
            <span className="ml-auto text-sm text-slate-600 dark:text-neutral-400">
              {group.items.length} interview{group.items.length === 1 ? "" : "s"}
            </span>
          </header>

          <ul className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-300 bg-white dark:divide-neutral-800 dark:border-neutral-700 dark:bg-neutral-900">
            {group.items.map((iv) => {
              const cfg = STATUS_CONFIG[iv.status] ?? STATUS_CONFIG.pending_schedule;
              const outcome = iv.outcome && iv.outcome !== "pending" ? OUTCOME_CONFIG[iv.outcome] : null;
              const onsite = iv.eventType === "onsite";
              return (
                <li key={iv.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
                  <p className="w-40 shrink-0 text-sm font-semibold tabular-nums text-slate-900 dark:text-neutral-100">
                    {iv.scheduledAt ? fmtTimeRange(iv.scheduledAt, iv.durationMinutes) : "No time yet"}
                  </p>

                  <div className="min-w-0 flex-1 basis-64">
                    <Link
                      href={`/candidates/${iv.candidateId}?from=interviews`}
                      className="text-[15px] font-semibold text-slate-900 hover:text-theme dark:text-neutral-100 dark:hover:text-primary"
                    >
                      {iv.candidateName}
                    </Link>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-neutral-400">
                      {[iv.eventName ?? iv.stageName, iv.jobTitle].filter(Boolean).join(" · ")}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-700 dark:text-neutral-300">
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden className={`size-2 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <HugeiconsIcon
                        icon={onsite ? Location01Icon : Video01Icon}
                        className="size-4 text-slate-500 dark:text-neutral-400"
                        strokeWidth={1.75}
                      />
                      {onsite ? "On-site" : "Virtual"}
                    </span>
                    {outcome && (
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${outcome.badge}`}>{outcome.label}</span>
                    )}
                    {iv.meetingUrl && iv.status === "scheduled" && (
                      <a
                        href={iv.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-theme underline underline-offset-4 dark:text-primary"
                      >
                        Join meeting
                      </a>
                    )}
                  </div>

                  <div className="ml-auto">
                    <InterviewActions interview={iv} onFeedback={onFeedback} onEdit={onEdit} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
