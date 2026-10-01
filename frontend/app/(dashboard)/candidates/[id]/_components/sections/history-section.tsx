"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { useUsers } from "@/hooks/queries/use-user";
import { useIsManager } from "@/hooks/use-role";
import { timeAgo } from "../constants";
import { formatDateTime } from "../../lib/format-datetime";
import { formatElapsed } from "../../lib/format-elapsed";
import {
  buildTimeline,
  summarizeTimeline,
  type TimelineItem,
} from "../../lib/stage-history-utils";
import type { CandidateDetail } from "@/types";

function SectionHeader() {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
        Stage History
      </h3>
      <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
        Progression through the hiring pipeline
      </p>
    </div>
  );
}

function Tile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-md border border-slate-300 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
      <dt className="text-xs font-medium text-slate-500 dark:text-neutral-400">
        {label}
      </dt>
      <dd className="mt-1.5 truncate text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
        {children}
      </dd>
    </div>
  );
}

function TimelineRow({
  item,
  stageName,
  actor,
  isHired,
}: {
  item: TimelineItem;
  stageName: string;
  actor: string | null;
  isHired: boolean;
}) {
  return (
    <li className="group relative pb-7 pl-11 last:pb-0">
      {/* Connector to the next (older) entry */}
      <span
        aria-hidden
        className="absolute bottom-0 left-3 top-7 w-px bg-slate-300 group-last:hidden dark:bg-neutral-700"
      />
      <span
        aria-hidden
        className={`absolute left-0 top-0 flex size-6 items-center justify-center rounded-full ${
          isHired
            ? "bg-green-600 text-white"
            : item.isCurrent
              ? "bg-theme text-white"
              : "border border-slate-300 bg-white dark:border-neutral-600 dark:bg-neutral-900"
        }`}
      >
        {item.isCurrent || isHired ? (
          <HugeiconsIcon icon={Tick02Icon} className="size-3.5" strokeWidth={2.5} />
        ) : (
          <span className="size-2 rounded-full bg-slate-400 dark:bg-neutral-500" />
        )}
      </span>

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h4 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
            {stageName}
          </h4>
          {item.isCurrent && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                isHired
                  ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                  : "bg-theme/10 text-theme dark:text-primary"
              }`}
            >
              Current
            </span>
          )}
        </div>
        <span className="shrink-0 text-sm text-slate-500 dark:text-neutral-400">
          {timeAgo(item.movedAt)}
        </span>
      </div>

      <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
        {formatDateTime(item.movedAt)}
        {actor && <span> · {actor}</span>}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600 dark:text-neutral-400">
        <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
        {item.isCurrent
          ? `In this stage for ${formatElapsed(item.durationMs).toLowerCase()}`
          : `Spent ${formatElapsed(item.durationMs).toLowerCase()} here`}
      </p>
    </li>
  );
}

export function HistorySection({
  candidate,
  stageMap,
}: {
  candidate: CandidateDetail;
  stageMap: Record<number, string>;
}) {
  const isManager = useIsManager();
  // The users list is manager-only; other roles simply don't see who moved the candidate.
  const { data: usersData } = useUsers({ enabled: isManager });
  const [now] = useState(() => Date.now());

  const userNames = useMemo(
    () =>
      new Map(
        (usersData?.data ?? []).map((u) => [
          u.id,
          `${u.firstName} ${u.lastName}`.trim(),
        ]),
      ),
    [usersData],
  );

  const timeline = useMemo(
    () => buildTimeline(candidate.history, now),
    [candidate.history, now],
  );
  const summary = summarizeTimeline(timeline);

  // Marking someone hired moves them to a "Hired" stage, which is the newest entry.
  const isHiredEntry = (item: TimelineItem) =>
    (stageMap[item.stageId] ?? "").trim().toLowerCase() === "hired" ||
    (item.isCurrent && candidate.status === "hired");

  const actorFor = (item: TimelineItem) => {
    if (item.movedBy === null) {
      return item.isFirst ? "Submitted an application" : "Moved automatically";
    }
    const name = userNames.get(item.movedBy);
    return name ? `Moved by ${name}` : null;
  };

  if (timeline.length === 0) {
    return (
      <div className="p-5 sm:p-6">
        <SectionHeader />
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900/30">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 dark:bg-neutral-800">
            <HugeiconsIcon
              icon={Clock01Icon}
              className="size-5 text-slate-400 dark:text-neutral-500"
            />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
            No stage history yet
          </p>
          <p className="mx-auto mt-1 max-w-[300px] text-sm text-slate-500 dark:text-neutral-400">
            Stage changes will appear here as the candidate moves through the
            pipeline.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6">
      <SectionHeader />

      <dl className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        <Tile label="Current stage">
          {summary.current
            ? (stageMap[summary.current.stageId] ?? `Stage #${summary.current.stageId}`)
            : "—"}
        </Tile>
        <Tile label="Time in this stage">
          {summary.current ? formatElapsed(summary.current.durationMs) : "—"}
        </Tile>
        <Tile label="In pipeline for">{formatElapsed(summary.totalMs)}</Tile>
        <Tile label="Stage moves">{summary.moves}</Tile>
      </dl>

      <div className="rounded-md border border-slate-300 bg-white px-5 py-5 dark:border-neutral-700 dark:bg-neutral-900">
        <ol className="m-0 list-none p-0">
          {timeline.map((item) => (
            <TimelineRow
              key={item.id}
              item={item}
              stageName={stageMap[item.stageId] ?? `Stage #${item.stageId}`}
              actor={actorFor(item)}
              isHired={isHiredEntry(item)}
            />
          ))}
        </ol>
      </div>
    </div>
  );
}
