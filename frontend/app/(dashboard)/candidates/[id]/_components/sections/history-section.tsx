"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon } from "@hugeicons/core-free-icons";
import { timeAgo } from "../constants.ts";

export function HistorySection({
  candidate,
  stageMap,
}: {
  candidate: any;
  stageMap: Record<number, string>;
}) {
  return (
    <div className="p-5 sm:p-6">
      <div className="mb-6">
        <h3 className="text-[15px] font-bold text-slate-900 dark:text-neutral-100">
          Stage History
        </h3>
        <p className="text-[13px] text-slate-500 dark:text-neutral-400 mt-0.5">
          Progression through the hiring pipeline
        </p>
      </div>
      {candidate.history.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/30 px-6 py-12 text-center">
          <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
            <HugeiconsIcon
              icon={Clock01Icon}
              className="size-5 text-slate-300 dark:text-neutral-600"
            />
          </div>
          <p className="text-[14px] font-semibold text-slate-500 dark:text-neutral-400">
            No stage history yet
          </p>
          <p className="text-[12px] text-slate-400 dark:text-neutral-500 mt-1">
            Stage changes will appear here as the candidate moves through the
            pipeline.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <div className="relative">
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-200 dark:bg-neutral-800" />
            <div className="space-y-5 pl-8">
              {candidate.history.map((h: any, i: number) => (
                <div key={h.id} className="relative">
                  <div
                    className={`absolute -left-[31px] top-1.5 size-3.5 rounded-full border-[3px] border-white dark:border-neutral-900 ring-2 ${
                      i === candidate.history.length - 1
                        ? "bg-[var(--theme-color)] ring-[var(--theme-color)]/30"
                        : "bg-slate-300 dark:bg-neutral-600 ring-slate-200 dark:ring-neutral-700"
                    }`}
                  />
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[14px] font-semibold text-slate-800 dark:text-neutral-200">
                        {stageMap[h.stageId] ?? `Stage #${h.stageId}`}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 dark:text-neutral-500 bg-slate-50 dark:bg-neutral-800 px-2 py-0.5 rounded-md shrink-0">
                        {timeAgo(h.movedAt)}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-400 dark:text-neutral-500 mt-1">
                      {new Date(h.movedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
