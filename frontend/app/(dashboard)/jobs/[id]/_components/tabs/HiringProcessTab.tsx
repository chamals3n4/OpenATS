"use client";

import type { Ref } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  DragDropVerticalIcon,
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
          <p className="text-sm text-slate-500 dark:text-neutral-400">
            {isManager
              ? "Drag stages to reorder them, or use the actions to make changes."
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
                className={`group flex items-center justify-between rounded-lg border px-4 py-3.5 transition-colors ${
                  isDragging
                    ? "border-slate-300 bg-slate-100 opacity-40 dark:border-neutral-700 dark:bg-neutral-800"
                    : isOver
                      ? "border-[var(--theme-color)]/50 bg-[var(--theme-color)]/5"
                      : "border-[var(--theme-color)]/25 bg-[var(--theme-color)]/[0.05] hover:border-[var(--theme-color)]/40 hover:bg-[var(--theme-color)]/[0.08] dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/70"
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <HugeiconsIcon
                    icon={DragDropVerticalIcon}
                    className="size-5 shrink-0 cursor-grab rounded text-slate-400 active:cursor-grabbing dark:text-neutral-500"
                  />
                  <div
                    className={`size-2.5 shrink-0 rounded-full ring-4 ring-slate-100 dark:ring-neutral-800 ${stage.color}`}
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
                        className="h-8 cursor-pointer rounded-md bg-[var(--theme-color)] px-3 text-xs font-medium text-white hover:bg-[var(--theme-color-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updateStageMutationPending ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingStageId(null)}
                        className="h-8 cursor-pointer rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <span className="text-[15px] font-semibold text-slate-800 dark:text-neutral-100">
                      {stage.name}
                    </span>
                  )}
                </div>
                {editingStageId !== stage.id && isManager && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setEditingStageId(stage.id);
                        setEditingStageName(stage.name);
                      }}
                      className="text-sm font-medium text-slate-600 transition-colors hover:text-[var(--theme-color)] dark:text-neutral-400 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        setStageDeleteTarget({
                          id: stage.id,
                          name: stage.name,
                        })
                      }
                      className="text-sm font-medium text-red-500 transition-colors hover:text-red-600 dark:text-red-400 cursor-pointer"
                    >
                      Delete
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
