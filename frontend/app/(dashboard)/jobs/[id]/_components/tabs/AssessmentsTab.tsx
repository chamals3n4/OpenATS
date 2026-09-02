"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Task01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Assessment, JobAssessment, PipelineStage } from "@/types";
import type { useAttachAssessment } from "@/hooks/queries/use-assessments";
import { useIsManager } from "@/hooks/use-role";

const assessmentAccents = [
  {
    surface: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
  },
  {
    surface: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
  },
  {
    surface: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
  },
  {
    surface: "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400",
  },
] as const;

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
              <Button className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100">
                <HugeiconsIcon
                  icon={PlusSignIcon}
                  className="size-4"
                  strokeWidth={2.5}
                />
                Attach Assessment
              </Button>
            }
          />
          <DialogContent className="max-w-md gap-0 overflow-hidden rounded-xl border-slate-200 bg-white p-0 dark:border-neutral-800 dark:bg-neutral-900">
            <DialogHeader className="px-6 py-5">
              <DialogTitle className="text-base font-semibold text-slate-900 dark:text-neutral-100">
                Attach Assessment
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
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
              className="px-6 py-5"
            >
              <div className="space-y-5">
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-neutral-300">
                  Assessment
                </Label>
                <Select
                  name="assessmentId"
                  value={assessmentSelectId}
                  onValueChange={(value) => setAssessmentSelectId(value ?? "")}
                  required
                >
                  <SelectTrigger className="h-10! w-full rounded-md border-slate-200 bg-slate-50 text-sm text-slate-700 shadow-none focus-visible:border-[var(--theme-color)] focus-visible:ring-0 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200">
                    <SelectValue placeholder="Choose assessment…">
                      {assessmentSelectId
                        ? (allAssessments.find(
                            (a) => a.id.toString() === assessmentSelectId,
                          )?.title ?? null)
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
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
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-neutral-300">
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
                  <SelectTrigger className="h-10! w-full rounded-md border-slate-200 bg-slate-50 text-sm text-slate-700 shadow-none focus-visible:border-[var(--theme-color)] focus-visible:ring-0 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200">
                    <SelectValue placeholder="When candidate moves into…">
                      {triggerStageSelectId
                        ? (stages.find(
                            (s) => s.id.toString() === triggerStageSelectId,
                          )?.name ?? null)
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
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
              </div>
              <DialogFooter className="mt-6 border-t border-slate-100 pt-4 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsAssessmentDialogOpen(false)}
                  disabled={attachAssessmentMutation.isPending}
                  className="h-9 border-2 border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={attachAssessmentMutation.isPending}
                  className="h-9 gap-2 rounded-md border-none bg-[var(--theme-color)] px-4 text-sm font-medium text-white shadow-none hover:bg-[var(--theme-color-hover)]"
                >
                  {attachAssessmentMutation.isPending && <Spinner className="size-3.5" />}
                  {attachAssessmentMutation.isPending ? "Saving" : "Attach assessment"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>}
      </div>

      {attachedAssessments.length > 0 ? (
        <div className="space-y-3">
          {attachedAssessments.map((attachment) => {
            const accent =
              assessmentAccents[attachment.id % assessmentAccents.length];
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
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${accent.surface}`}
                  >
                    <HugeiconsIcon icon={Task01Icon} className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-slate-800 dark:text-neutral-200">
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
                  <button
                    type="button"
                    onClick={() => setDetachTarget(attachment.id)}
                    className="ml-4 shrink-0 cursor-pointer text-sm font-medium text-red-500 transition-colors hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
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
