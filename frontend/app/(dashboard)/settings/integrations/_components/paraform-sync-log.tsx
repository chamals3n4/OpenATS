"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/format";
import {
  useParaformRuns,
  useParaformSyncNow,
  type ParaformSyncRun,
} from "@/hooks/queries/use-paraform";

/** One line per run, in words, so an admin can see the sync is working without the server log. */
export function describeRun(run: ParaformSyncRun): string {
  if (run.status === "running") return "Syncing now…";
  if (run.status === "failed") return run.error ?? "The sync failed.";
  const parts = [
    run.candidatesImported === 0
      ? "No new candidates"
      : `${run.candidatesImported} new ${run.candidatesImported === 1 ? "candidate" : "candidates"} imported`,
  ];
  if (run.decisionsSent > 0) {
    parts.push(
      `${run.decisionsSent} ${run.decisionsSent === 1 ? "decision" : "decisions"} sent to Paraform`,
    );
  }
  return parts.join(", ");
}

export function ParaformSyncLog() {
  const runs = useParaformRuns(true);
  const syncNow = useParaformSyncNow();
  const list = runs.data?.data ?? [];
  const running = list.some((run) => run.status === "running");

  return (
    <div className="px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
            Sync log
          </h4>
          <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
            {list[0]
              ? `Last sync ${timeAgo(list[0].startedAt)}.`
              : "No sync has run yet."}{" "}
            It runs every 15 minutes on its own.
          </p>
        </div>
        <Button
          variant="cancel"
          className="h-8 px-3 text-sm"
          disabled={syncNow.isPending || running}
          onClick={() =>
            syncNow.mutate(undefined, {
              onSuccess: () => toast.success("Sync started"),
              onError: (error) => toast.error(error.message),
            })
          }
        >
          {running ? "Syncing" : "Sync now"}
        </Button>
      </div>

      {list.length > 0 && (
        <ul className="mt-3 space-y-2">
          {list.slice(0, 10).map((run) => (
            <li key={run.id} className="text-sm">
              <span className="text-slate-500 dark:text-neutral-400">
                {timeAgo(run.startedAt)} ·{" "}
              </span>
              <span
                className={
                  run.status === "failed"
                    ? "text-red-800 dark:text-red-300"
                    : "text-slate-900 dark:text-neutral-100"
                }
              >
                {describeRun(run)}
              </span>
              {run.problems.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-amber-900 dark:text-amber-200">
                  {run.problems.map((problem, i) => (
                    <li key={i}>{problem}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
