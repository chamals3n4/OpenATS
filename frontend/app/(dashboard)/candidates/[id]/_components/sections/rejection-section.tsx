"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserRemove01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  ConfirmDeleteDialog,
  ConfirmDeleteName,
} from "@/components/ui/confirm-delete-dialog";
import { useUsers } from "@/hooks/queries/use-user";
import { useIsManager } from "@/hooks/use-role";
import { sortRejections } from "../../lib/rejection-utils";
import { RejectionCard } from "../rejection/rejection-card";
import type { useUnrejectCandidate } from "@/hooks/queries/use-candidates";
import type { CandidateDetail, Template } from "@/types";

interface RejectionSectionProps {
  candidate: CandidateDetail;
  candidateId: number;
  stageMap: Record<number, string>;
  emailTemplates: Template[];
  unrejectMutation: ReturnType<typeof useUnrejectCandidate>;
  onReject: () => void;
}

export function RejectionSection({
  candidate,
  candidateId,
  stageMap,
  emailTemplates,
  unrejectMutation,
  onReject,
}: RejectionSectionProps) {
  const isManager = useIsManager();
  // The users list is manager-only; other roles just don't see who rejected.
  const { data: usersData } = useUsers({ enabled: isManager });
  const [restoreOpen, setRestoreOpen] = useState(false);

  const rejections = useMemo(
    () => sortRejections(candidate.rejections ?? []),
    [candidate.rejections],
  );
  const userNames = useMemo(
    () =>
      new Map(
        (usersData?.data ?? []).map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]),
      ),
    [usersData],
  );
  const templateNames = useMemo(
    () => new Map(emailTemplates.map((t) => [t.id, t.name])),
    [emailTemplates],
  );

  const isRejected = candidate.status === "rejected";
  const fullName = `${candidate.firstName} ${candidate.lastName}`.trim();
  const restoreStage = rejections[0]?.fromStageId
    ? stageMap[rejections[0].fromStageId]
    : null;

  const handleRestore = () =>
    unrejectMutation.mutate(candidateId, {
      onSuccess: () => {
        toast.success(`${candidate.firstName} is back in the pipeline`);
        setRestoreOpen(false);
      },
      onError: (error) => toast.error(error.message || "Failed to restore the candidate"),
    });

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
            Rejection
          </h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
            Rejection history and actions
          </p>
        </div>

        {isManager &&
          (isRejected ? (
            <Button
              variant="cancel"
              onClick={() => setRestoreOpen(true)}
              className="h-9 px-4 text-sm"
            >
              Restore candidate
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={onReject}
              className="h-9 gap-2 border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 shadow-none hover:border-red-300 hover:bg-red-100 hover:text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70"
            >
              <HugeiconsIcon icon={UserRemove01Icon} className="size-4" strokeWidth={1.75} />
              Reject candidate
            </Button>
          ))}
      </div>

      {isRejected && (
        <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {candidate.firstName} is rejected and is no longer in the pipeline.
          {isManager && " Restore them to put them back where they were."}
        </p>
      )}

      {rejections.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900/30">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 dark:bg-neutral-800">
            <HugeiconsIcon
              icon={UserRemove01Icon}
              className="size-5 text-slate-400 dark:text-neutral-500"
            />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
            No rejections
          </p>
          <p className="mx-auto mt-1 max-w-[340px] text-sm text-slate-500 dark:text-neutral-400">
            If you reject {candidate.firstName}, the reason and any email sent
            are recorded here. You can restore them at any time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rejections.map((r, i) => (
            <RejectionCard
              key={r.id}
              rejection={r}
              stageName={r.fromStageId ? (stageMap[r.fromStageId] ?? null) : null}
              rejectedByName={r.rejectedBy ? (userNames.get(r.rejectedBy) ?? null) : null}
              templateName={r.templateId ? (templateNames.get(r.templateId) ?? null) : null}
              isCurrent={i === 0 && isRejected}
            />
          ))}
        </div>
      )}

      <ConfirmDeleteDialog
        open={restoreOpen}
        title="Restore this candidate?"
        description={
          <>
            <ConfirmDeleteName>{fullName}</ConfirmDeleteName> will go back to{" "}
            {restoreStage ? `the ${restoreStage} stage` : "the start of the pipeline"}.
            The rejection stays in the history below.
          </>
        }
        confirmLabel="Restore candidate"
        pendingLabel="Restoring"
        confirmClassName="bg-theme hover:bg-theme-hover"
        isPending={unrejectMutation.isPending}
        onClose={() => setRestoreOpen(false)}
        onConfirm={handleRestore}
      />
    </div>
  );
}
