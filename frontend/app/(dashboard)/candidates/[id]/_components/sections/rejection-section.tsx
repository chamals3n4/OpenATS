"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { UserRemove01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { timeAgo } from "../constants";
import type { useUnrejectCandidate } from "@/hooks/queries/use-candidates";
import type { CandidateDetail } from "@/types";

interface RejectionSectionProps {
  candidate: CandidateDetail;
  candidateId: number;
  unrejectMutation: ReturnType<typeof useUnrejectCandidate>;
  onReject: () => void;
}

export function RejectionSection({
  candidate,
  candidateId,
  unrejectMutation,
  onReject,
}: RejectionSectionProps) {
  return (
    <div className="p-5 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
            Rejection
          </h3>
          <p className="text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
            Rejection history and actions
          </p>
        </div>
        {candidate.status === "rejected" ? (
          <Button
            size="sm"
            disabled={unrejectMutation.isPending}
            onClick={() => unrejectMutation.mutate(candidateId)}
            className="h-7 rounded-md border-none bg-slate-700 px-2.5 text-sm font-semibold text-white shadow-none hover:bg-slate-600 disabled:opacity-60"
          >
            {unrejectMutation.isPending ? "Restoring…" : "Unreject Candidate"}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onReject}
            className="h-7 rounded-md border-none bg-red-600 px-2.5 text-sm font-semibold text-white shadow-none hover:bg-red-500"
          >
            Reject Candidate
          </Button>
        )}
      </div>

      {(candidate.rejections ?? []).length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/30 px-6 py-12 text-center">
          <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
            <HugeiconsIcon
              icon={UserRemove01Icon}
              className="size-5 text-slate-300 dark:text-neutral-600"
            />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-neutral-400">
            {candidate.status === "rejected"
              ? "Candidate has been rejected"
              : "No rejections yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(candidate.rejections ?? []).map((r) => (
            <div
              key={r.id}
              className="rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-800 dark:text-neutral-200">
                    Rejected
                  </span>
                  <Badge
                    className={
                      r.emailStatus === "sent"
                        ? "rounded-md border-none px-2 py-0.5 text-xs font-bold uppercase tracking-wider shadow-none bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                        : "rounded-md border-none px-2 py-0.5 text-xs font-bold uppercase tracking-wider shadow-none bg-slate-50 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400"
                    }
                  >
                    Email: {r.emailStatus}
                  </Badge>
                </div>
                <span className="text-xs font-medium text-slate-400 dark:text-neutral-500">
                  {timeAgo(r.rejectedAt)}
                </span>
              </div>
              <div className="px-5 pb-4 space-y-1">
                <p className="text-sm text-slate-600 dark:text-neutral-300">
                  Reason: {r.reason}
                </p>
                {r.internalNote && (
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Internal note: {r.internalNote}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
