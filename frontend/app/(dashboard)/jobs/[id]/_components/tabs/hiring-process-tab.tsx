"use client";

import { useRef, useState, type Ref } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, DragDropVerticalIcon } from "@hugeicons/core-free-icons";
import { RowDeleteButton, RowEditButton } from "@/components/table/row-actions";
import { Button } from "@/components/ui/button";
import { useDragSort } from "@/hooks/use-drag-sort";
import { useIsManager } from "@/hooks/use-role";
import type { PipelineStage } from "@/types";
import { StageDialog, STAGE_TYPES, type StageValues } from "../dialogs/stage-dialog";
import { ConfirmDeleteDialog, ConfirmDeleteName } from "@/components/ui/confirm-delete-dialog";
import { toast } from "sonner";
import {
  useCreateStage,
  useDeleteStage,
  usePipeline,
  useReorderStages,
  useUpdateStage,
} from "@/hooks/queries/use-pipeline";
import { withStageColors, type ColoredStage } from "../../_lib/stage-colors";

type Stage = PipelineStage & { color: string };

interface HiringProcessTabProps {
  stages: Stage[];
  onAddStage: () => void;
  onEditStage: (stage: PipelineStage) => void;
  setStageDeleteTarget: (target: { id: number; name: string } | null) => void;
  handleStageReorder: (from: number, to: number) => void;
}

const typeLabel = (stageType: string) => STAGE_TYPES.find((type) => type.value === stageType)?.label ?? stageType;

function StageRow({
  stage,
  index,
  canEdit,
  onEdit,
  onDelete,
  onMove,
}: {
  stage: Stage;
  index: number;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const { ref, isDragging, isOver } = useDragSort({ id: stage.id, index, type: "HIRING_STAGE", onMove });

  return (
    <li
      ref={ref as Ref<HTMLLIElement>}
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-white px-3 py-3 transition-colors dark:bg-neutral-900 ${
        isDragging
          ? "border-slate-300 opacity-40 dark:border-neutral-700"
          : isOver
            ? "border-theme bg-theme/5"
            : "border-slate-300 dark:border-neutral-700"
      }`}
    >
      {canEdit && (
        <HugeiconsIcon
          icon={DragDropVerticalIcon}
          aria-hidden
          className="size-5 shrink-0 cursor-grab text-slate-400 active:cursor-grabbing dark:text-neutral-500"
        />
      )}
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold tabular-nums text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate text-[15px] font-medium text-slate-900 dark:text-neutral-100">{stage.name}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-neutral-400">
          <span aria-hidden className={`size-2 rounded-full ${stage.color}`} />
          {typeLabel(stage.stageType)}
        </p>
      </div>
      {canEdit && (
        <div className="flex shrink-0 items-center gap-2">
          <RowEditButton aria-label={`Edit the stage ${stage.name}`} onClick={onEdit} />
          <RowDeleteButton aria-label={`Delete the stage ${stage.name}`} onClick={onDelete} />
        </div>
      )}
    </li>
  );
}

export function HiringProcessTabView({
  stages,
  onAddStage,
  onEditStage,
  setStageDeleteTarget,
  handleStageReorder,
}: HiringProcessTabProps) {
  const isManager = useIsManager();

  const addButton = (extra = "") => (
    <Button
      type="button"
      onClick={onAddStage}
      className={`h-9 shrink-0 cursor-pointer gap-2 border-none bg-theme px-4 text-sm font-semibold text-white shadow-none hover:bg-theme-hover ${extra}`}
    >
      <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2.5} />
      Add stage
    </Button>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-neutral-100">Hiring pipeline stages</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
            {isManager
              ? "The steps a candidate moves through, in order. Drag a stage to move it."
              : "The steps a candidate moves through, in order. Only hiring managers can change them."}
          </p>
        </div>
        {isManager && stages.length > 0 && addButton()}
      </div>

      {stages.length > 0 ? (
        <ol className="space-y-2">
          {stages.map((stage, index) => (
            <StageRow
              key={stage.id}
              stage={stage}
              index={index}
              canEdit={isManager}
              onEdit={() => onEditStage(stage)}
              onDelete={() => setStageDeleteTarget({ id: stage.id, name: stage.name })}
              onMove={handleStageReorder}
            />
          ))}
        </ol>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">No stages yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-neutral-400">
            Add the steps candidates go through for this job, such as screening, interview and offer.
          </p>
          {isManager && addButton("mt-4")}
        </div>
      )}
    </div>
  );
}

// Loads the stages and handles add, edit, delete and reorder
export function HiringProcessTab({ jobId }: { jobId: number }) {
  const { data: pipelineData } = usePipeline(jobId);
  const createStageMutation = useCreateStage(jobId);
  const updateStageMutation = useUpdateStage(jobId);
  const deleteStageMutation = useDeleteStage(jobId);
  const reorderStagesMutation = useReorderStages(jobId);

  // Local copy so reordering shows right away. Reset when the query changes
  const [stages, setStages] = useState<ColoredStage[]>([]);
  const [seededStages, setSeededStages] = useState<PipelineStage[] | null>(null);
  if (pipelineData?.data && pipelineData.data !== seededStages) {
    setSeededStages(pipelineData.data);
    setStages(withStageColors(pipelineData.data));
  }

  // Stage dialog: closed, add or edit
  const [stageDialog, setStageDialog] = useState<{ stage: PipelineStage | null } | null>(null);
  const [stageDeleteTarget, setStageDeleteTarget] = useState<{ id: number; name: string } | null>(
    null,
  );

  const handleSubmitStage = (values: StageValues) => {
    const editing = stageDialog?.stage;
    if (editing) {
      updateStageMutation.mutate(
        { stageId: editing.id, data: values },
        {
          onSuccess: () => {
            setStageDialog(null);
            toast.success("Stage saved");
          },
          onError: (error) => toast.error(error.message || "Failed to save the stage"),
        },
      );
      return;
    }
    const nextPosition =
      stages.length === 0 ? 1 : Math.max(...stages.map((s) => s.position ?? 0)) + 1;
    createStageMutation.mutate(
      { ...values, position: nextPosition },
      {
        onSuccess: () => {
          setStageDialog(null);
          toast.success("Stage added");
        },
        onError: (error) => toast.error(error.message || "Failed to add the stage"),
      },
    );
  };

  // Save the new order after a short pause
  const reorderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleStageReorder = (from: number, to: number) => {
    const reordered = [...stages];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setStages(reordered);

    if (reorderTimeoutRef.current) clearTimeout(reorderTimeoutRef.current);
    reorderTimeoutRef.current = setTimeout(() => {
      reorderStagesMutation.mutate(reordered.map((s, idx) => ({ id: s.id, position: idx + 1 })));
    }, 500);
  };

  return (
    <>
      <HiringProcessTabView
        stages={stages}
        onAddStage={() => setStageDialog({ stage: null })}
        onEditStage={(stage) => setStageDialog({ stage })}
        setStageDeleteTarget={setStageDeleteTarget}
        handleStageReorder={handleStageReorder}
      />

      <StageDialog
        open={stageDialog !== null}
        stage={stageDialog?.stage ?? null}
        isPending={createStageMutation.isPending || updateStageMutation.isPending}
        onSubmit={handleSubmitStage}
        onClose={() => setStageDialog(null)}
      />

      <ConfirmDeleteDialog
        open={stageDeleteTarget !== null}
        title="Delete this stage?"
        description={
          <>
            <ConfirmDeleteName>{stageDeleteTarget?.name ?? "This stage"}</ConfirmDeleteName> will be
            permanently deleted. This cannot be undone.
          </>
        }
        isPending={deleteStageMutation.isPending}
        onClose={() => setStageDeleteTarget(null)}
        onConfirm={() => {
          if (!stageDeleteTarget) return;
          deleteStageMutation.mutate(stageDeleteTarget.id, {
            onSuccess: () => setStageDeleteTarget(null),
          });
        }}
      />
    </>
  );
}
