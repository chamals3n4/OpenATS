"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, TaskDone01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { FormField } from "@/components/form/form-field";
import { RowDeleteButton } from "@/components/table/row-actions";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog, ConfirmDeleteName } from "@/components/ui/confirm-delete-dialog";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useAssignments,
  useAttachAssignment,
  useDetachAssignment,
  useJobAssignments,
} from "@/hooks/queries/use-assignments";
import { usePipeline } from "@/hooks/queries/use-pipeline";
import { useIsManager } from "@/hooks/use-role";
import type { Assignment, JobAssignment, PipelineStage } from "@/types";
import { withStageColors } from "../../_lib/stage-colors";
import { sortByStageOrder } from "../../_lib/assessment-attach-utils";

const selectTriggerCls =
  "h-10! w-full rounded-md border border-slate-300 bg-gray-100 px-3! py-0! text-sm text-slate-900 shadow-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100";

function AttachForm({
  attached,
  assignments,
  stages,
  isPending,
  onSubmit,
  onCancel,
}: {
  attached: JobAssignment[];
  assignments: Assignment[];
  stages: PipelineStage[];
  isPending: boolean;
  onSubmit: (assignmentId: number, stageId: number) => void;
  onCancel: () => void;
}) {
  const [assignmentId, setAssignmentId] = useState("");
  const [stageId, setStageId] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const taken = (id: number) => attached.some((a) => a.triggerStageId === id);
  const assignmentItems = assignments.map((a) => ({ value: String(a.id), label: a.title }));
  const stageItems = stages.map((s) => ({ value: String(s.id), label: taken(s.id) ? `${s.name} (already sends one)` : s.name }));

  const assignmentError = !assignmentId ? "Choose an assignment." : null;
  const stageError = !stageId ? "Choose the stage that sends it." : taken(Number(stageId)) ? "This stage already sends an assignment." : null;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setShowErrors(true);
        if (assignmentError || stageError || isPending) return;
        onSubmit(Number(assignmentId), Number(stageId));
      }}
    >
      <DialogHeader className="px-6 pt-6">
        <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-neutral-100">Attach assignment</DialogTitle>
        <DialogDescription className="text-sm text-slate-600 dark:text-neutral-400">
          The candidate gets an email with the assignment as soon as they move into the stage you pick.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 px-6 py-5">
        <FormField label="Assignment" htmlFor="attach-assignment" required error={showErrors ? assignmentError : null}>
          <Select items={assignmentItems} value={assignmentId || null} onValueChange={(v) => setAssignmentId(v ?? "")}>
            <SelectTrigger id="attach-assignment" className={selectTriggerCls}>
              <SelectValue placeholder="Choose an assignment" />
            </SelectTrigger>
            <SelectContent>
              {assignmentItems.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Send when a candidate moves into" htmlFor="attach-assignment-stage" required error={showErrors ? stageError : null}>
          <Select items={stageItems} value={stageId || null} onValueChange={(v) => setStageId(v ?? "")}>
            <SelectTrigger id="attach-assignment-stage" className={selectTriggerCls}>
              <SelectValue placeholder="Choose a stage" />
            </SelectTrigger>
            <SelectContent>
              {stageItems.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <DialogFooter className="border-t border-slate-300 bg-slate-50 px-6 py-4 dark:border-neutral-700 dark:bg-neutral-950/50">
        <Button type="button" variant="cancel" onClick={onCancel} disabled={isPending} className="h-9 px-4 text-sm">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
        >
          {isPending && <Spinner className="size-3.5" />}
          {isPending ? "Attaching" : "Attach assignment"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Assignments a job sends by itself when candidates reach a stage. Sits under the automated assessments. */
export function AssignmentsAutomation({ jobId }: { jobId: number }) {
  const isManager = useIsManager();
  const { data: allData } = useAssignments();
  const { data: attachedData } = useJobAssignments(jobId);
  const { data: pipelineData } = usePipeline(jobId);
  const attach = useAttachAssignment(jobId);
  const detach = useDetachAssignment(jobId);
  const stages = useMemo(() => withStageColors(pipelineData?.data ?? []), [pipelineData?.data]);

  const [isAttaching, setIsAttaching] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<JobAssignment | null>(null);

  const all = allData?.data ?? [];
  const rows = sortByStageOrder(attachedData?.data ?? [], stages);
  const titleOf = (id: number) => all.find((a) => a.id === id)?.title ?? "Deleted assignment";

  const handleAttach = (assignmentId: number, triggerStageId: number) =>
    attach.mutate(
      { assignmentId, triggerStageId },
      {
        onSuccess: () => {
          setIsAttaching(false);
          toast.success("Assignment attached");
        },
        onError: (error) => toast.error(error.message || "Failed to attach the assignment"),
      },
    );

  const handleRemove = () => {
    if (!removeTarget) return;
    detach.mutate(removeTarget.id, {
      onSuccess: () => {
        setRemoveTarget(null);
        toast.success("Assignment removed");
      },
      onError: (error) => toast.error(error.message || "Failed to remove the assignment"),
    });
  };

  const attachButton = (extra = "") => (
    <Button
      type="button"
      onClick={() => setIsAttaching(true)}
      className={`h-9 shrink-0 cursor-pointer gap-2 border-none bg-theme px-4 text-sm font-semibold text-white shadow-none hover:bg-theme-hover ${extra}`}
    >
      <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2.5} />
      Attach assignment
    </Button>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-neutral-100">Automated assignments</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
            Take-home tasks sent by email when candidates reach the stage you choose.
          </p>
        </div>
        {isManager && rows.length > 0 && attachButton()}
      </div>

      {rows.length > 0 ? (
        <ul className="space-y-3">
          {rows.map((attachment) => {
            const assignment = all.find((a) => a.id === attachment.assignmentId);
            const stage = stages.find((s) => s.id === attachment.triggerStageId);
            return (
              <li
                key={attachment.id}
                className="flex items-center gap-4 rounded-lg border border-slate-300 bg-white px-4 py-4 dark:border-neutral-700 dark:bg-neutral-900"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-200">
                  <HugeiconsIcon icon={TaskDone01Icon} className="size-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  {assignment ? (
                    <Link
                      href={`/assessments/assignments/${assignment.id}`}
                      className="block truncate text-[15px] font-medium text-slate-900 hover:underline dark:text-neutral-100"
                    >
                      {assignment.title}
                    </Link>
                  ) : (
                    <p className="text-[15px] font-medium text-slate-500 dark:text-neutral-400">Deleted assignment</p>
                  )}
                  <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                    Sent when a candidate moves into{" "}
                    <span className="font-medium text-slate-800 dark:text-neutral-200">{stage?.name ?? "a removed stage"}</span>
                    {assignment && (
                      <>
                        {" · "}
                        {assignment.dueDays} {assignment.dueDays === 1 ? "day" : "days"} to hand in
                      </>
                    )}
                  </p>
                </div>
                {isManager && <RowDeleteButton onClick={() => setRemoveTarget(attachment)}>Remove</RowDeleteButton>}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">No assignments attached yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-neutral-400">
            Attach an assignment to a stage and every candidate who reaches it receives it automatically.
          </p>
          {isManager && attachButton("mt-4")}
        </div>
      )}

      <Dialog open={isAttaching} onOpenChange={(open) => !open && setIsAttaching(false)}>
        <DialogContent className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-xl border-slate-200 bg-white p-0 sm:max-w-[520px] dark:border-neutral-800 dark:bg-neutral-900">
          {isAttaching && (
            <AttachForm
              attached={attachedData?.data ?? []}
              assignments={all}
              stages={stages}
              isPending={attach.isPending}
              onSubmit={handleAttach}
              onCancel={() => setIsAttaching(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={removeTarget !== null}
        title="Remove this assignment?"
        description={
          <>
            <ConfirmDeleteName>{removeTarget ? titleOf(removeTarget.assignmentId) : ""}</ConfirmDeleteName> will no longer be
            sent automatically. Assignments already sent, and what candidates handed in, are kept.
          </>
        }
        confirmLabel="Remove"
        pendingLabel="Removing"
        isPending={detach.isPending}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
      />
    </div>
  );
}
