"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Assessment, JobAssessment, PipelineStage } from "@/types";
import type { useAttachAssessment } from "@/hooks/queries/use-assessments";
import { useIsManager } from "@/hooks/use-role";

interface AssessmentsTabProps {
  isAssessmentDialogOpen: boolean;
  setIsAssessmentDialogOpen: (open: boolean) => void;
  attachedAssessments: JobAssessment[];
  allAssessments: Assessment[];
  stages: (PipelineStage & { color: string })[];
  setDetachTarget: (id: number | null) => void;
  attachAssessmentMutation: ReturnType<typeof useAttachAssessment>;
  assessmentSelectId: string;
  setAssessmentSelectId: (id: string) => void;
  triggerStageSelectId: string;
  setTriggerStageSelectId: (id: string) => void;
}

export function AssessmentsTab({
  isAssessmentDialogOpen,
  setIsAssessmentDialogOpen,
  attachedAssessments,
  allAssessments,
  stages,
  setDetachTarget,
  attachAssessmentMutation,
  assessmentSelectId,
  setAssessmentSelectId,
  triggerStageSelectId,
  setTriggerStageSelectId,
}: AssessmentsTabProps) {
  const isManager = useIsManager();
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[18px] font-semibold text-slate-900 dark:text-neutral-100">
            Automated Assessments
          </p>
          <p className="text-[13px] text-slate-400 dark:text-neutral-500 mt-1">
            Sent automatically when a candidate reaches the trigger stage.
          </p>
        </div>
        {isManager && <Dialog
          open={isAssessmentDialogOpen}
          onOpenChange={(open) => {
            setIsAssessmentDialogOpen(open);
            if (!open) {
              setAssessmentSelectId("");
              setTriggerStageSelectId("");
            }
          }}
        >
          <DialogTrigger
            render={
              <Button className="inline-flex cursor-pointer items-center gap-2 h-10 px-5 rounded-lg text-[13px] font-medium border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 hover:text-slate-800 dark:hover:text-neutral-100 transition-colors">
                <HugeiconsIcon
                  icon={PlusSignIcon}
                  className="size-4"
                  strokeWidth={2.5}
                />
                Attach Assessment
              </Button>
            }
          />
          <DialogContent className="!top-[18%] !translate-y-0 max-w-sm rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-6 duration-0 data-open:zoom-in-100 data-closed:zoom-out-100">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-[16px] font-semibold text-slate-900 dark:text-neutral-100">
                Attach Assessment
              </DialogTitle>
              <DialogDescription className="text-slate-400 dark:text-neutral-500 text-[13px] mt-1">
                Auto-send when a candidate enters the selected stage.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const assessmentId = Number(formData.get("assessmentId"));
                const triggerStageId = Number(formData.get("triggerStageId"));
                if (assessmentId && triggerStageId) {
                  attachAssessmentMutation.mutate(
                    { assessmentId, triggerStageId },
                    {
                      onSuccess: () => setIsAssessmentDialogOpen(false),
                    },
                  );
                }
              }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                  Assessment
                </Label>
                <Select
                  name="assessmentId"
                  value={assessmentSelectId}
                  onValueChange={(value) => setAssessmentSelectId(value ?? "")}
                  required
                >
                  <SelectTrigger className="w-full h-9 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-none rounded-lg text-[13px] text-slate-600 dark:text-neutral-300 focus:ring-0">
                    <SelectValue placeholder="Choose assessment…">
                      {assessmentSelectId
                        ? (allAssessments.find(
                            (a) => a.id.toString() === assessmentSelectId,
                          )?.title ?? null)
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    {allAssessments.map((a) => (
                      <SelectItem
                        key={a.id}
                        value={a.id.toString()}
                        className="text-[13px]"
                      >
                        {a.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                  Trigger Stage
                </Label>
                <Select
                  name="triggerStageId"
                  value={triggerStageSelectId}
                  onValueChange={(value) =>
                    setTriggerStageSelectId(value ?? "")
                  }
                  required
                >
                  <SelectTrigger className="w-full h-9 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-none rounded-lg text-[13px] text-slate-600 dark:text-neutral-300 focus:ring-0">
                    <SelectValue placeholder="When candidate moves into…">
                      {triggerStageSelectId
                        ? (stages.find(
                            (s) => s.id.toString() === triggerStageSelectId,
                          )?.name ?? null)
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    {stages.map((s) => (
                      <SelectItem
                        key={s.id}
                        value={s.id.toString()}
                        className="text-[13px]"
                      >
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={attachAssessmentMutation.isPending}
                  className="h-9 px-5 bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white shadow-none border-none rounded-lg text-[13px] font-medium"
                >
                  {attachAssessmentMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>}
      </div>

      {attachedAssessments.length > 0 ? (
        <div className="space-y-3">
          {attachedAssessments.map((attachment) => {
            const stageFound = stages.find(
              (s) => s.id === attachment.triggerStageId,
            );
            const assessmentFound = allAssessments.find(
              (a) => a.id === attachment.assessmentId,
            );
            return (
              <div
                key={attachment.id}
                className="flex items-center justify-between px-5 py-4 bg-white dark:bg-neutral-900 border border-[var(--theme-color)]/20 hover:border-[var(--theme-color)]/40 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="size-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center shrink-0 text-[18px]">
                    📋
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-slate-800 dark:text-neutral-200 truncate">
                      {assessmentFound?.title ?? "Unknown Assessment"}
                    </p>
                    <p className="text-[12px] text-slate-400 mt-0.5">
                      Triggers on{" "}
                      <span className="font-medium text-slate-500">
                        {stageFound?.name ?? "Unknown Stage"}
                      </span>
                      {assessmentFound?.timeLimit
                        ? ` · ${assessmentFound.timeLimit} mins`
                        : ""}
                    </p>
                  </div>
                </div>
                {isManager && (
                  <Button
                    onClick={() => setDetachTarget(attachment.id)}
                    className="shrink-0 ml-4 cursor-pointer bg-red inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-800 transition-colors"
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 dark:border-neutral-800 rounded-xl">
          <p className="text-[13px] text-slate-400 dark:text-neutral-500">
            No assessments attached yet.
          </p>
          {isManager && (
            <button
              onClick={() => setIsAssessmentDialogOpen(true)}
              className="mt-2 cursor-pointer text-[12px] font-medium text-[var(--theme-color)] hover:underline"
            >
              Attach one
            </button>
          )}
        </div>
      )}
    </>
  );
}
