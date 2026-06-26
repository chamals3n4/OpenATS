"use client";

import type { Ref } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  DragDropVerticalIcon,
  PencilEdit01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDragSort } from "@/hooks/use-drag-sort";
import { useIsManager } from "@/hooks/use-role";
import type { PipelineStage } from "@/types";

interface HiringProcessTabProps {
  stages: (PipelineStage & { color: string })[];
  setAddStageOpen: (open: boolean) => void;
  editingStageId: number | null;
  setEditingStageId: (id: number | null) => void;
  editingStageName: string;
  setEditingStageName: (name: string) => void;
  handleSaveStage: (id: number) => void;
  updateStageMutationPending: boolean;
  setStageDeleteTarget: (target: { id: number; name: string } | null) => void;
  handleStageReorder: (from: number, to: number) => void;
}

export function HiringProcessTab({
  stages,
  setAddStageOpen,
  editingStageId,
  setEditingStageId,
  editingStageName,
  setEditingStageName,
  handleSaveStage,
  updateStageMutationPending,
  setStageDeleteTarget,
  handleStageReorder,
}: HiringProcessTabProps) {
  const isManager = useIsManager();
  return (
    <>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-slate-900 dark:text-neutral-100 font-semibold text-[17px]">
            Hiring Pipeline Stages
          </h3>
          <p className="text-slate-500 dark:text-neutral-400 text-[13px]">
            {isManager
              ? "Drag To Reorder Stages. Click To Edit Or Remove."
              : "View only — contact a hiring manager to modify stages."}
          </p>
        </div>
        {isManager && (
          <Button
            onClick={() => setAddStageOpen(true)}
            className="bg-[var(--theme-color)] cursor-pointer hover:bg-[var(--theme-color-hover)] text-white rounded-lg h-10 px-4 font-medium shadow-none border-none gap-2 text-sm"
          >
            <HugeiconsIcon
              icon={PlusSignIcon}
              className="size-4"
              strokeWidth={3}
            />
            <span>Add New Stage</span>
          </Button>
        )}
      </div>

      <div className="space-y-2 pt-4">
        {stages.map((stage, index) => {
          function StageDraggable() {
            const { ref, isDragging, isOver } = useDragSort({
              id: stage.id,
              index,
              type: "HIRING_STAGE",
              onMove: handleStageReorder,
            });
            return (
              <div
                ref={ref as Ref<HTMLDivElement>}
                className={`flex items-center justify-between p-4 border rounded-lg transition-all group bg-white dark:bg-neutral-900 ${
                  isDragging
                    ? "opacity-40 border-slate-300 dark:border-neutral-700"
                    : isOver
                      ? "border-[var(--theme-color)]/40 bg-[var(--theme-color)]/5"
                      : "border-slate-200/70 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <HugeiconsIcon
                    icon={DragDropVerticalIcon}
                    className="size-5 text-slate-300 group-hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0"
                  />
                  <div
                    className={`size-2 rounded-full ${stage.color} shrink-0`}
                  />
                  {editingStageId === stage.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        autoFocus
                        value={editingStageName}
                        onChange={(e) => setEditingStageName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveStage(stage.id);
                          if (e.key === "Escape") setEditingStageId(null);
                        }}
                        className="h-8 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 shadow-none focus-visible:ring-1 focus-visible:ring-slate-300 text-[14px] w-48"
                      />
                      <button
                        onClick={() => handleSaveStage(stage.id)}
                        disabled={updateStageMutationPending}
                        className="text-xs font-medium text-white bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] px-3 h-8 rounded-md disabled:opacity-50"
                      >
                        {updateStageMutationPending ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingStageId(null)}
                        className="text-xs font-medium text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200 px-3 h-8 rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-700 dark:text-neutral-200 font-medium text-[15px]">
                      {stage.name}
                    </span>
                  )}
                </div>
                {editingStageId !== stage.id && isManager && (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        setEditingStageId(stage.id);
                        setEditingStageName(stage.name);
                      }}
                      className="text-[var(--theme-color)]/60 cursor-pointer hover:text-[var(--theme-color)] transition-colors"
                    >
                      <HugeiconsIcon
                        icon={PencilEdit01Icon}
                        className="size-[18px]"
                      />
                    </button>
                    <button
                      onClick={() =>
                        setStageDeleteTarget({
                          id: stage.id,
                          name: stage.name,
                        })
                      }
                      className="text-red-400/80 cursor-pointer hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      <HugeiconsIcon
                        icon={Delete02Icon}
                        className="size-[18px]"
                      />
                    </button>
                  </div>
                )}
              </div>
            );
          }
          return <StageDraggable key={stage.id} />;
        })}
      </div>
    </>
  );
}
