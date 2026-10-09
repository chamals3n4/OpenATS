"use client";

import { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Task01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { FormField } from "@/components/form/form-field";
import { RowDeleteButton } from "@/components/table/row-actions";
import { Button } from "@/components/ui/button";
import {
  ConfirmDeleteDialog,
  ConfirmDeleteName,
} from "@/components/ui/confirm-delete-dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Assessment, JobAssessment, PipelineStage } from "@/types";
import { Input } from "@/components/ui/input";
import {
  useUpdatePassMark,
  type useAttachAssessment,
  type useDetachAssessment,
} from "@/hooks/queries/use-assessments";
import { useIsManager } from "@/hooks/use-role";
import {
  describeAssessment,
  isAlreadyAttached,
  sortByStageOrder,
} from "../../lib/assessment-attach-utils";

interface AssessmentsTabProps {
  jobId: number;
  attachedAssessments: JobAssessment[];
  allAssessments: Assessment[];
  stages: (PipelineStage & { color: string })[];
  attachAssessmentMutation: ReturnType<typeof useAttachAssessment>;
  detachAssessmentMutation: ReturnType<typeof useDetachAssessment>;
}

const DEFAULT_PASS_MARK = 60;

/** The percentage a candidate needs; saved when the field loses focus with a changed value. */
function PassMarkField({ jobId, attachment, canEdit }: { jobId: number; attachment: JobAssessment; canEdit: boolean }) {
  const update = useUpdatePassMark(jobId);
  const [value, setValue] = useState(String(attachment.passMark ?? DEFAULT_PASS_MARK));

  const commit = () => {
    const next = Math.min(100, Math.max(0, Math.round(Number(value)) || 0));
    setValue(String(next));
    if (next === attachment.passMark) return;
    update.mutate(
      { attachmentId: attachment.id, passMark: next },
      {
        onSuccess: () => toast.success("Pass mark saved"),
        onError: (e) => {
          setValue(String(attachment.passMark));
          toast.error(e.message || "Failed to save the pass mark");
        },
      },
    );
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      <label
        htmlFor={`pass-mark-${attachment.id}`}
        className="text-sm text-slate-500 dark:text-neutral-400"
      >
        Pass mark
      </label>
      <Input
        id={`pass-mark-${attachment.id}`}
        type="number"
        inputMode="numeric"
        min={0}
        max={100}
        disabled={!canEdit || update.isPending}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="h-9 w-20 rounded-md border-slate-300 bg-gray-100 text-sm shadow-none dark:border-neutral-600 dark:bg-neutral-800"
      />
      <span className="text-sm text-slate-500 dark:text-neutral-400">%</span>
    </div>
  );
}

const selectTriggerCls =
  "h-10! w-full rounded-md border border-slate-300 bg-gray-100 px-3! py-0! text-sm text-slate-900 shadow-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100";

function AttachForm({
  attached,
  allAssessments,
  stages,
  isPending,
  onSubmit,
  onCancel,
}: {
  attached: JobAssessment[];
  allAssessments: Assessment[];
  stages: (PipelineStage & { color: string })[];
  isPending: boolean;
  onSubmit: (assessmentId: number, stageId: number, passMark: number) => void;
  onCancel: () => void;
}) {
  const [passMark, setPassMark] = useState(String(DEFAULT_PASS_MARK));
  const [assessmentId, setAssessmentId] = useState("");
  const [stageId, setStageId] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const duplicate =
    assessmentId && stageId
      ? isAlreadyAttached(attached, Number(assessmentId), Number(stageId))
      : false;

  const assessmentError = !assessmentId ? "Choose an assessment." : null;
  const stageError = !stageId
    ? "Choose the stage that sends it."
    : duplicate
      ? "This assessment is already sent at this stage."
      : null;

  const assessmentItems = allAssessments.map((a) => ({
    value: String(a.id),
    label: a.title,
  }));
  const stageItems = stages.map((s) => ({ value: String(s.id), label: s.name }));
  const picked = allAssessments.find((a) => String(a.id) === assessmentId);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setShowErrors(true);
        if (assessmentError || stageError || isPending) return;
        onSubmit(
          Number(assessmentId),
          Number(stageId),
          Math.min(100, Math.max(0, Math.round(Number(passMark)) || 0)),
        );
      }}
    >
      <DialogHeader className="px-6 pt-6">
        <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
          Attach assessment
        </DialogTitle>
        <DialogDescription className="text-sm text-slate-600 dark:text-neutral-400">
          The candidate gets an email with the test as soon as they move into the stage you pick.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 px-6 py-5">
        <FormField
          label="Assessment"
          htmlFor="attach-assessment"
          required
          error={showErrors ? assessmentError : null}
          hint={picked ? describeAssessment(picked) : undefined}
        >
          <Select
            items={assessmentItems}
            value={assessmentId || null}
            onValueChange={(v) => setAssessmentId(v ?? "")}
          >
            <SelectTrigger id="attach-assessment" className={selectTriggerCls}>
              <SelectValue placeholder="Choose an assessment" />
            </SelectTrigger>
            <SelectContent>
              {assessmentItems.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          label="Send when a candidate moves into"
          htmlFor="attach-stage"
          required
          error={showErrors || duplicate ? stageError : null}
        >
          <Select
            items={stageItems}
            value={stageId || null}
            onValueChange={(v) => setStageId(v ?? "")}
          >
            <SelectTrigger id="attach-stage" className={selectTriggerCls}>
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

        <FormField
          label="Pass mark (%)"
          htmlFor="attach-pass-mark"
          hint="Candidates scoring below this are flagged as having failed the assessment. You decide whether to reject them."
        >
          <Input
            id="attach-pass-mark"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            value={passMark}
            onChange={(e) => setPassMark(e.target.value)}
            className="h-10 w-28 rounded-md border-slate-300 bg-gray-100 text-sm shadow-none dark:border-neutral-600 dark:bg-neutral-800"
          />
        </FormField>
      </div>

      <DialogFooter className="border-t border-slate-300 bg-slate-50 px-6 py-4 dark:border-neutral-700 dark:bg-neutral-950/50">
        <Button
          type="button"
          variant="cancel"
          onClick={onCancel}
          disabled={isPending}
          className="h-9 px-4 text-sm"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
        >
          {isPending && <Spinner className="size-3.5" />}
          {isPending ? "Attaching" : "Attach assessment"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AssessmentsTab({
  jobId,
  attachedAssessments,
  allAssessments,
  stages,
  attachAssessmentMutation,
  detachAssessmentMutation,
}: AssessmentsTabProps) {
  const isManager = useIsManager();
  const [isAttaching, setIsAttaching] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<JobAssessment | null>(null);

  const rows = sortByStageOrder(attachedAssessments, stages);
  const titleOf = (id: number) =>
    allAssessments.find((a) => a.id === id)?.title ?? "Deleted assessment";

  const handleAttach = (assessmentId: number, triggerStageId: number, passMark: number) =>
    attachAssessmentMutation.mutate(
      { assessmentId, triggerStageId, passMark },
      {
        onSuccess: () => {
          setIsAttaching(false);
          toast.success("Assessment attached");
        },
        onError: (error) => toast.error(error.message || "Failed to attach the assessment"),
      },
    );

  const handleRemove = () => {
    if (!removeTarget) return;
    detachAssessmentMutation.mutate(removeTarget.id, {
      onSuccess: () => {
        setRemoveTarget(null);
        toast.success("Assessment removed");
      },
      onError: (error) => toast.error(error.message || "Failed to remove the assessment"),
    });
  };

  const attachButton = (extra = "") => (
    <Button
      type="button"
      onClick={() => setIsAttaching(true)}
      className={`h-9 shrink-0 cursor-pointer gap-2 border-none bg-theme px-4 text-sm font-semibold text-white shadow-none hover:bg-theme-hover ${extra}`}
    >
      <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2.5} />
      Attach assessment
    </Button>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
            Automated assessments
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
            Sent to candidates by email when they reach the stage you choose.
          </p>
        </div>
        {isManager && rows.length > 0 && attachButton()}
      </div>

      {rows.length > 0 ? (
        <ul className="space-y-3">
          {rows.map((attachment) => {
            const assessment = allAssessments.find((a) => a.id === attachment.assessmentId);
            const stage = stages.find((s) => s.id === attachment.triggerStageId);
            const meta = describeAssessment(assessment);
            return (
              <li
                key={attachment.id}
                className="flex items-center gap-4 rounded-lg border border-slate-300 bg-white px-4 py-4 dark:border-neutral-700 dark:bg-neutral-900"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-200">
                  <HugeiconsIcon icon={Task01Icon} className="size-4" strokeWidth={1.75} />
                </span>

                <div className="min-w-0 flex-1">
                  {assessment ? (
                    <Link
                      href={`/assessments/${assessment.id}`}
                      className="block truncate text-[15px] font-medium text-slate-900 hover:underline dark:text-neutral-100"
                    >
                      {assessment.title}
                    </Link>
                  ) : (
                    <p className="text-[15px] font-medium text-slate-500 dark:text-neutral-400">
                      Deleted assessment
                    </p>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-slate-500 dark:text-neutral-400">
                    <span>
                      Sent when a candidate moves into{" "}
                      <span className="font-medium text-slate-800 dark:text-neutral-200">
                        {stage?.name ?? "a removed stage"}
                      </span>
                    </span>
                    {meta && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{meta}</span>
                      </>
                    )}
                  </p>
                </div>

                <PassMarkField jobId={jobId} attachment={attachment} canEdit={isManager} />

                {isManager && (
                  <RowDeleteButton onClick={() => setRemoveTarget(attachment)}>
                    Remove
                  </RowDeleteButton>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
            No assessments attached yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-neutral-400">
            Attach a test to a stage and every candidate who reaches it receives it automatically.
          </p>
          {isManager && attachButton("mt-4")}
        </div>
      )}

      <Dialog open={isAttaching} onOpenChange={(o) => !o && setIsAttaching(false)}>
        <DialogContent className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-xl border-slate-200 bg-white p-0 sm:max-w-[520px] dark:border-neutral-800 dark:bg-neutral-900">
          {isAttaching && (
            <AttachForm
              attached={attachedAssessments}
              allAssessments={allAssessments}
              stages={stages}
              isPending={attachAssessmentMutation.isPending}
              onSubmit={handleAttach}
              onCancel={() => setIsAttaching(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={removeTarget !== null}
        title="Remove this assessment?"
        description={
          <>
            <ConfirmDeleteName>
              {removeTarget ? titleOf(removeTarget.assessmentId) : ""}
            </ConfirmDeleteName>{" "}
            will no longer be sent automatically. Results from candidates who already took it are kept.
          </>
        }
        confirmLabel="Remove"
        pendingLabel="Removing"
        isPending={detachAssessmentMutation.isPending}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
      />
    </div>
  );
}
