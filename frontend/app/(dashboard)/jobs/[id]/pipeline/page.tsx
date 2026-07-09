"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { Ref } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useDrag, useDrop, useDragLayer } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, GripVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useJob } from "@/hooks/queries/use-jobs";
import { useCurrentUser } from "@/hooks/queries/use-user";
import { usePipeline } from "@/hooks/queries/use-pipeline";
import {
  useCandidates,
  useMoveCandidateStage,
} from "@/hooks/queries/use-candidates";

import type { Candidate, PipelineStage, StageAutomationFlags } from "@/types";

function showStageAutomationToasts(automation: StageAutomationFlags) {
  if (automation.assessmentInvite === "skipped_active_invite") {
    toast.message("Assessment", {
      description:
        "An invite is already active — no new email was sent. The existing link still works.",
    });
  } else if (automation.assessmentInvite === "sent") {
    toast.success("Assessment invite sent.");
  }
}

const STAGE_COLORS: Record<PipelineStage["stageType"], string> = {
  screening: "#d97706",
  interview: "#3b82f6",
  offer: "#22c55e",
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

const CARD_TYPE = "PIPELINE_CARD";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function CustomDragLayer() {
  const { isDragging, item, currentOffset } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
    item: monitor.getItem() as { name: string; appliedAt: string } | null,
    currentOffset: monitor.getSourceClientOffset(),
  }));

  if (!isDragging || !currentOffset || !item) return null;

  return (
    <div
      style={{
        position: "fixed",
        pointerEvents: "none",
        left: 0,
        top: 0,
        zIndex: 9999,
        transform: `translate(${currentOffset.x}px, ${currentOffset.y}px)`,
      }}
    >
      <div
        style={{ transform: "rotate(3deg)" }}
        className="bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 shadow-xl px-3 py-2.5 rounded-lg flex items-center gap-2 w-65 opacity-95"
      >
        <GripVertical className="size-3.5 text-slate-300 shrink-0" />
        <div className="space-y-0.5 min-w-0">
          <p className="font-semibold text-theme text-[13px] leading-snug truncate">
            {item.name}
          </p>
          <p className="text-slate-400 text-[10px] font-medium uppercase tracking-tight">
            {item.appliedAt}
          </p>
        </div>
      </div>
    </div>
  );
}

type DragItem = {
  id: number;
  name: string;
  appliedAt: string;
  // The stage the drag STARTED in. Never mutated — the drop target relies on
  // this (not the live position) to decide whether a real cross-column move
  // must be persisted.
  originStageId: number;
  // Live position, mutated only during same-column hover reordering.
  fromStageId: number;
  fromIndex: number;
};

function DraggableCard({
  candidate,
  stageId,
  index,
  onReorder,
  onClick,
  onDragMiss,
}: {
  candidate: Candidate;
  stageId: number;
  index: number;
  onReorder: (
    fromStageId: number,
    fromIndex: number,
    toStageId: number,
    toIndex: number,
  ) => void;
  onClick: (id: number) => void;
  onDragMiss: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const name = `${candidate.firstName} ${candidate.lastName}`;
  const appliedAtLabel = timeAgo(candidate.appliedAt);

  const [{ isDragging }, dragRef, dragPreviewRef] = useDrag<
    DragItem,
    unknown,
    { isDragging: boolean }
  >({
    type: CARD_TYPE,
    item: {
      id: candidate.id,
      name,
      appliedAt: appliedAtLabel,
      originStageId: stageId,
      fromStageId: stageId,
      fromIndex: index,
    },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    // Released outside any drop target → undo the ephemeral hover reorder.
    end: (_item, monitor) => {
      if (!monitor.didDrop()) onDragMiss();
    },
  });

  useEffect(() => {
    dragPreviewRef(getEmptyImage(), { captureDraggingState: true });
  }, [dragPreviewRef]);

  const [, dropRef] = useDrop<DragItem>({
    accept: CARD_TYPE,
    hover(dragItem, monitor) {
      if (!ref.current || dragItem.id === candidate.id) return;
      // Only reorder within the SAME column. Cross-column positioning is
      // committed by the column's drop handler, which keeps the dragged DOM
      // node in its origin column (no mid-drag re-parenting / react-dnd glitch).
      if (dragItem.fromStageId !== stageId) return;
      const { bottom, top } = ref.current.getBoundingClientRect();
      const hoverMiddleY = (bottom - top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientY = clientOffset.y - top;
      const toIndex = hoverClientY < hoverMiddleY ? index : index + 1;
      if (toIndex === dragItem.fromIndex) return;
      onReorder(dragItem.fromStageId, dragItem.fromIndex, stageId, toIndex);
      dragItem.fromIndex = toIndex > dragItem.fromIndex ? toIndex - 1 : toIndex;
    },
  });

  dragRef(dropRef(ref));

  return (
    <div
      ref={ref as unknown as Ref<HTMLDivElement>}
      onClick={() => !isDragging && onClick(candidate.id)}
      className={`bg-white dark:bg-neutral-900 px-3 py-2.5 rounded-lg flex items-center gap-2 group select-none transition-colors ${
        isDragging
          ? "border-2 border-dashed border-theme opacity-40 cursor-grabbing"
          : "border border-slate-200 dark:border-neutral-800 hover:border-(--theme-color)/40 cursor-pointer"
      }`}
    >
      <GripVertical className="size-3.5 text-slate-300 dark:text-neutral-600 shrink-0 group-hover:text-slate-400 dark:group-hover:text-neutral-500 transition-colors cursor-grab" />
      <div className="space-y-0.5 min-w-0">
        <p className="font-semibold text-slate-800 dark:text-neutral-200 text-[13px] leading-snug group-hover:text-theme transition-colors truncate">
          {name}
        </p>
        <p className="text-slate-400 dark:text-neutral-500 text-[10px] font-medium uppercase tracking-tight">
          {appliedAtLabel}
        </p>
      </div>
    </div>
  );
}

function DroppableColumn({
  stage,
  candidates,
  onDropToStage,
  onReorder,
  onCardClick,
  onDragMiss,
}: {
  stage: PipelineStage & { color: string };
  candidates: Candidate[];
  onDropToStage: (candidateId: number, toStageId: number) => void;
  onReorder: (
    fromStageId: number,
    fromIndex: number,
    toStageId: number,
    toIndex: number,
  ) => void;
  onCardClick: (id: number) => void;
  onDragMiss: () => void;
}) {
  const [{ isOver, canDrop }, dropRef] = useDrop<
    DragItem,
    void,
    { isOver: boolean; canDrop: boolean }
  >({
    accept: CARD_TYPE,
    // Persist only a genuine cross-column move, decided by the immutable
    // origin stage so an intra-drag hover can never suppress the API call.
    drop: (item, monitor) => {
      if (monitor.didDrop()) return;
      if (item.originStageId !== stage.id) {
        onDropToStage(item.id, stage.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  const isActive = isOver && canDrop;

  return (
    <div className="w-75 min-h-130 flex flex-col shrink-0">
      <div className="flex items-center gap-2.5 px-0.5 mb-4 shrink-0">
        <div
          className="size-2 rounded-full"
          style={{ backgroundColor: stage.color }}
        />
        <h3 className="font-semibold text-slate-700 dark:text-neutral-300 text-[15px]">
          {stage.name}
        </h3>
        <span className="ml-auto text-[11px] font-bold text-slate-500 dark:text-neutral-500 bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full border border-slate-300 dark:border-neutral-700 uppercase tracking-tighter">
          {candidates.length} Cards
        </span>
      </div>

      <div
        ref={dropRef as unknown as Ref<HTMLDivElement>}
        className={`flex-1 rounded-xl p-3 space-y-2 overflow-y-auto custom-scrollbar-y transition-colors duration-150 ${
          isActive
            ? "bg-(--theme-color)/5 border-2 border-dashed border-(--theme-color)/40"
            : "bg-slate-50/60 dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-800"
        }`}
      >
        {candidates.length === 0 && (
          <div
            className={`h-20 flex items-center justify-center rounded-lg border-2 border-dashed text-sm font-medium transition-colors ${
              isActive
                ? "border-(--theme-color)/40 text-(--theme-color)/60 bg-(--theme-color)/5"
                : "border-slate-200 dark:border-neutral-800 text-slate-300 dark:text-neutral-700"
            }`}
          >
            {isActive ? "Drop here" : "No candidates"}
          </div>
        )}
        {candidates.map((c, index) => (
          <DraggableCard
            key={c.id}
            candidate={c}
            stageId={stage.id}
            index={index}
            onReorder={onReorder}
            onClick={onCardClick}
            onDragMiss={onDragMiss}
          />
        ))}
      </div>
    </div>
  );
}

export default function HiringPipelinePage() {
  const params = useParams();
  const jobId = Number(params.id);

  const queryClient = useQueryClient();
  const { data: currentUserRes, isLoading: isLoadingUser } = useCurrentUser();
  const { data: jobData, isLoading: isLoadingJob } = useJob(jobId);
  const { data: pipelineData } = usePipeline(jobId);
  const { data: candidatesData } = useCandidates(jobId, {
    limit: 9999,
  });
  const moveStageMutation = useMoveCandidateStage();

  const router = useRouter();

  const job = jobData?.data;
  const role = currentUserRes?.data?.role;
  const isManager = role === "super_admin" || role === "hiring_manager";

  useEffect(() => {
    if (role && !isManager) router.replace(`/jobs/${jobId}`);
  }, [role, isManager, router, jobId]);

  useEffect(() => {
    if (!isLoadingJob && !job) router.replace("/jobs");
  }, [isLoadingJob, job, router]);

  const pipelineStages = pipelineData?.data ?? [];

  // Local copy for optimistic drag-drop updates.
  const [localCandidates, setLocalCandidates] = useState<Candidate[]>([]);

  // Latest raw server list — read inside drag callbacks without stale closures.
  const latestServerRef = useRef<Candidate[]>([]);
  // candidateId -> stage it was optimistically moved to, but the server hasn't
  // confirmed yet. Lets a stale background refetch be reconciled instead of
  // clobbering the optimistic position (the old "snap back" bug).
  const pendingMovesRef = useRef<Map<number, number>>(new Map());
  // candidateId -> true while a move request is in flight. Blocks a second
  // move of the same candidate so accidental re-drops can't double-fire
  // stage automation (offers / assessment invites).
  const inFlightRef = useRef<Set<number>>(new Set());

  // Merge the server snapshot with not-yet-confirmed optimistic moves.
  const reconcile = useCallback((server: Candidate[]): Candidate[] => {
    const pending = pendingMovesRef.current;
    return server
      .filter((c) => c.status !== "rejected")
      .map((c) => {
        const target = pending.get(c.id);
        if (target === undefined) return c;
        if (c.currentStageId === target) {
          // Server caught up — drop the optimistic override.
          pending.delete(c.id);
          return c;
        }
        return { ...c, currentStageId: target };
      });
  }, []);

  useEffect(() => {
    if (!candidatesData?.data) return;
    latestServerRef.current = candidatesData.data;
    setLocalCandidates(reconcile(candidatesData.data));
  }, [candidatesData, reconcile]);

  // Group by currentStageId
  const candidatesByStage = useMemo(
    () =>
      localCandidates.reduce(
        (acc, c) => {
          const key = c.currentStageId ?? -1;
          acc[key] = [...(acc[key] ?? []), c];
          return acc;
        },
        {} as Record<number, Candidate[]>,
      ),
    [localCandidates],
  );

  const stages = pipelineStages.map((s) => ({
    ...s,
    color: STAGE_COLORS[s.stageType] ?? "#94a3b8",
  }));

  // Reflect a confirmed stage change in every cached candidate list so other
  // views (job tabs, candidates table) stay consistent without a refetch.
  const writeStageToCaches = useCallback(
    (candidateId: number, toStageId: number) => {
      queryClient.setQueriesData<{ data?: Candidate[] }>(
        {
          // Patch list queries only — touching detail keys (numeric second part) would mark them fresh and skip the post-move refetch
          predicate: (query) => {
            const key = query.queryKey as unknown[];
            return key[0] === "candidates" && typeof key[1] !== "number";
          },
        },
        (old) => {
          if (!old || !Array.isArray(old.data)) return old;
          let changed = false;
          const data = old.data.map((c) => {
            if (c.id === candidateId && c.currentStageId !== toStageId) {
              changed = true;
              return { ...c, currentStageId: toStageId };
            }
            return c;
          });
          return changed ? { ...old, data } : old;
        },
      );
    },
    [queryClient],
  );

  // Move a candidate into another column — optimistic, guarded, reconciled.
  const handleDropToStage = useCallback(
    (candidateId: number, toStageId: number) => {
      // De-dupe: ignore if already moving, or already optimistically there.
      if (inFlightRef.current.has(candidateId)) return;
      if (pendingMovesRef.current.get(candidateId) === toStageId) return;

      inFlightRef.current.add(candidateId);
      pendingMovesRef.current.set(candidateId, toStageId);

      // Optimistic: drop the card at the bottom of the target column.
      setLocalCandidates((prev) => {
        const moving = prev.find((c) => c.id === candidateId);
        if (!moving) return prev;
        return [
          ...prev.filter((c) => c.id !== candidateId),
          { ...moving, currentStageId: toStageId },
        ];
      });

      // Stop any in-flight refetch from resolving with pre-move data.
      queryClient.cancelQueries({ queryKey: ["candidates"] });

      moveStageMutation.mutate(
        { id: candidateId, newStageId: toStageId },
        {
          onSuccess: (res) => {
            showStageAutomationToasts(res.stageAutomation);
            writeStageToCaches(candidateId, toStageId);
          },
          onError: () => {
            pendingMovesRef.current.delete(candidateId);
            setLocalCandidates(reconcile(latestServerRef.current));
            toast.error("Couldn't move candidate. Please try again.");
          },
          onSettled: () => {
            inFlightRef.current.delete(candidateId);
          },
        },
      );
    },
    [moveStageMutation, queryClient, reconcile, writeStageToCaches],
  );

  // Same-column reorder only (cross-column commits via handleDropToStage).
  const handleReorder = useCallback(
    (
      fromStageId: number,
      fromIndex: number,
      toStageId: number,
      toIndex: number,
    ) => {
      if (fromStageId !== toStageId || fromIndex === toIndex) return;
      setLocalCandidates((prev) => {
        const inStage = prev.filter((c) => c.currentStageId === fromStageId);
        const card = inStage[fromIndex];
        if (!card) return prev;
        const reordered = [...inStage];
        reordered.splice(fromIndex, 1);
        reordered.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, card);
        return prev
          .filter((c) => c.currentStageId !== fromStageId)
          .concat(reordered);
      });
    },
    [],
  );

  // Drag released outside any column — discard the ephemeral hover reorder.
  const handleDragMiss = useCallback(() => {
    setLocalCandidates(reconcile(latestServerRef.current));
  }, [reconcile]);

  // Edge-scroll when dragging near left/right
  const scrollRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const { isDragging } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
  }));

  useEffect(() => {
    if (!isDragging) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }
    const EDGE = 120;
    const SPEED = 12;
    const onMouseMove = (e: MouseEvent) => {
      const container = scrollRef.current;
      if (!container) return;
      const { left, right } = container.getBoundingClientRect();
      const scroll = () => {
        if (!isDragging) return;
        if (e.clientX < left + EDGE) container.scrollLeft -= SPEED;
        else if (e.clientX > right - EDGE) container.scrollLeft += SPEED;
        animFrameRef.current = requestAnimationFrame(scroll);
      };
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(scroll);
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isDragging]);

  if (isLoadingUser || !role || !isManager) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))] bg-white dark:bg-neutral-950 overflow-hidden w-full min-w-0">
      <CustomDragLayer />

      {/* Header */}
      <div className="shrink-0 border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="truncate text-[22px] font-bold leading-tight text-slate-950 dark:text-neutral-50">
                  {job?.title ?? "Loading…"}
                </h1>
                {job && (
                  <Badge
                    className={`rounded-md border-none px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider shadow-none shrink-0 ${
                      job.status === "published"
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400"
                    }`}
                  >
                    {job.status === "published" ? "Active Job" : job.status}
                  </Badge>
                )}
              </div>
              {job && (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] font-medium text-slate-500 dark:text-neutral-400">
                  <span>
                    {EMPLOYMENT_LABELS[job.employmentType] ?? job.employmentType}
                    {job.location ? ` · ${job.location}` : ""}
                  </span>
                  <span className="text-slate-300 dark:text-neutral-700">·</span>
                  <span>
                    {localCandidates.length} candidate
                    {localCandidates.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link href={`/jobs/${jobId}`}>
                <Button
                  size="sm"
                  className="h-[34px] cursor-pointer rounded-md border-none bg-neutral-700 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                >
                  <ArrowLeft className="size-4" />
                  Back to Job
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div
        ref={scrollRef}
        className="flex-1 w-full min-w-0 overflow-x-auto overflow-y-auto bg-slate-50/10 dark:bg-neutral-950 pipeline-scroll-container"
      >
        {stages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-400 dark:text-neutral-600 text-sm">
              No pipeline stages defined for this job yet.
            </p>
          </div>
        ) : (
          <div className="flex min-h-full p-8 gap-5 w-max items-stretch">
            {stages.map((stage) => (
              <DroppableColumn
                key={stage.id}
                stage={stage}
                candidates={candidatesByStage[stage.id] ?? []}
                onDropToStage={handleDropToStage}
                onReorder={handleReorder}
                onDragMiss={handleDragMiss}
                onCardClick={(id) => {
                  router.push(`/candidates/${id}?from=pipeline`);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        .pipeline-scroll-container {
          scrollbar-width: auto !important;
          -ms-overflow-style: auto !important;
        }
        .pipeline-scroll-container::-webkit-scrollbar {
          display: block !important;
          height: 10px !important;
          width: 0px !important;
        }
        .pipeline-scroll-container::-webkit-scrollbar-track {
          background: #f8fafc !important;
          border-top: 1px solid #e2e8f0 !important;
        }
        :global(.dark) .pipeline-scroll-container::-webkit-scrollbar-track {
          background: #0a0a0a !important;
          border-top-color: #1a1a1a !important;
        }
        .pipeline-scroll-container::-webkit-scrollbar-thumb {
          background: #cbd5e1 !important;
          border-radius: 10px !important;
          border: 2px solid #f8fafc !important;
        }
        :global(.dark) .pipeline-scroll-container::-webkit-scrollbar-thumb {
          background: #262626 !important;
          border-color: #0a0a0a !important;
        }
        .pipeline-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8 !important;
        }
        :global(.dark)
          .pipeline-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #404040 !important;
        }
        .custom-scrollbar-y::-webkit-scrollbar {
          display: block !important;
          width: 4px !important;
        }
        .custom-scrollbar-y::-webkit-scrollbar-thumb {
          background: #e2e8f0 !important;
          border-radius: 10px !important;
        }
        :global(.dark) .custom-scrollbar-y::-webkit-scrollbar-thumb {
          background: #262626 !important;
        }
      `}</style>
    </div>
  );
}
