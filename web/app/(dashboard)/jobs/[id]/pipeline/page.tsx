"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { Ref } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useDrag, useDrop, useDragLayer } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { ArrowLeft, GripVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CandidateDetailSheetProvider } from "@/components/candidate-detail-sheet-context";
import { CandidatePreviewPane } from "@/components/candidate-preview-pane";
import { CandidateSidePanel } from "@/components/candidate-side-panel";
import { toast } from "sonner";

import {
  useJob,
  usePipeline,
  useCandidates,
  useMoveCandidateStage,
} from "@/hooks/use-api";
import type { Candidate, PipelineStage, StageAutomationFlags } from "@/types";
import { formatTimeAgo } from "@/lib/time-ago";

function showStageAutomationToasts(automation: StageAutomationFlags) {
  if (automation.assessmentInvite === "skipped_active_invite") {
    toast.message("Assessment", {
      description:
        "An invite is already active — no new email was sent. The existing link still works.",
    });
  } else if (automation.assessmentInvite === "sent") {
    toast.success("Assessment invite sent.");
  }

  if (automation.offer === "skipped_open_exists") {
    toast.message("Offer", {
      description:
        "This candidate already has an open offer — no duplicate was created.",
    });
  } else if (automation.offer === "created") {
    toast.success("Offer created.");
  }

  if (automation.rejectionEmail === "skipped_already_sent") {
    toast.message("Rejection", {
      description:
        "A rejection notice was already sent for this application — not sent again.",
    });
  } else if (automation.rejectionEmail === "sent") {
    toast.success("Rejection email sent.");
  }
}

const STAGE_COLORS: Record<PipelineStage["stageType"], string> = {
  none: "#94a3b8",
  source: "#60a5fa",
  assessment: "#a78bfa",
  interview: "#3b82f6",
  offer: "#22c55e",
  rejection: "#ef4444",
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

const CARD_TYPE = "PIPELINE_CARD";

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

function DraggableCard({
  candidate,
  stageId,
  index,
  onReorder,
  onClick,
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
}) {
  const ref = useRef<HTMLDivElement>(null);
  const name = `${candidate.firstName} ${candidate.lastName}`;
  const appliedAtLabel = formatTimeAgo(candidate.appliedAt);

  const [{ isDragging }, dragRef, dragPreviewRef] = useDrag({
    type: CARD_TYPE,
    item: {
      id: candidate.id,
      name,
      appliedAt: appliedAtLabel,
      fromStageId: stageId,
      fromIndex: index,
    },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  useEffect(() => {
    dragPreviewRef(getEmptyImage(), { captureDraggingState: true });
  }, [dragPreviewRef]);

  const [, dropRef] = useDrop<{
    id: number;
    fromStageId: number;
    fromIndex: number;
  }>({
    accept: CARD_TYPE,
    hover(dragItem, monitor) {
      if (!ref.current || dragItem.id === candidate.id) return;
      const { bottom, top } = ref.current.getBoundingClientRect();
      const hoverMiddleY = (bottom - top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientY = clientOffset.y - top;
      const toIndex = hoverClientY < hoverMiddleY ? index : index + 1;
      onReorder(dragItem.fromStageId, dragItem.fromIndex, stageId, toIndex);
      dragItem.fromStageId = stageId;
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
}: {
  stage: PipelineStage & { color: string };
  candidates: Candidate[];
  onDropToStage: (
    candidateId: number,
    fromStageId: number,
    toStageId: number,
  ) => void;
  onReorder: (
    fromStageId: number,
    fromIndex: number,
    toStageId: number,
    toIndex: number,
  ) => void;
  onCardClick: (id: number) => void;
}) {
  const [{ isOver, canDrop }, dropRef] = useDrop<
    { id: number; fromStageId: number; fromIndex: number },
    void,
    { isOver: boolean; canDrop: boolean }
  >({
    accept: CARD_TYPE,
    drop: (item) => {
      if (item.fromStageId !== stage.id) {
        onDropToStage(item.id, item.fromStageId, stage.id);
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
          />
        ))}
      </div>
    </div>
  );
}

export default function HiringPipelinePage() {
  const params = useParams();
  const jobId = Number(params.id);

  const { data: jobData } = useJob(jobId);
  const { data: pipelineData } = usePipeline(jobId);
  const { data: candidatesData, refetch } = useCandidates(jobId);
  const moveStageMutation = useMoveCandidateStage();

  const job = jobData?.data;
  const pipelineStages = pipelineData?.data ?? [];

  // Detail sheet state
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(
    null,
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Local copy for optimistic drag-drop updates
  const [localCandidates, setLocalCandidates] = useState<Candidate[]>([]);

  useEffect(() => {
    if (candidatesData?.data) {
      setLocalCandidates(candidatesData.data);
    }
  }, [candidatesData]);

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

  // Move between columns — optimistic update + API
  const handleDropToStage = (
    candidateId: number,
    fromStageId: number,
    toStageId: number,
  ) => {
    setLocalCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId ? { ...c, currentStageId: toStageId } : c,
      ),
    );
    moveStageMutation.mutate(
      { id: candidateId, newStageId: toStageId },
      {
        onSuccess: (res) => showStageAutomationToasts(res.stageAutomation),
        onError: () => refetch(),
      },
    );
  };

  // Reorder within / across columns (local visual only)
  const handleReorder = (
    fromStageId: number,
    fromIndex: number,
    toStageId: number,
    toIndex: number,
  ) => {
    setLocalCandidates((prev) => {
      const fromList = (candidatesByStage[fromStageId] ?? []).slice();
      const card = fromList[fromIndex];
      if (!card) return prev;

      if (fromStageId === toStageId) {
        if (fromIndex === toIndex) return prev;
        const newList = [...fromList];
        newList.splice(fromIndex, 1);
        newList.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, card);
        return prev
          .filter((c) => c.currentStageId !== fromStageId)
          .concat(newList);
      }
      ArrowLeft;
      const toList = (candidatesByStage[toStageId] ?? []).slice();
      toList.splice(toIndex, 0, { ...card, currentStageId: toStageId });
      return prev
        .filter(
          (c) =>
            c.currentStageId !== fromStageId && c.currentStageId !== toStageId,
        )
        .concat(fromList.filter((_, i) => i !== fromIndex))
        .concat(toList);
    });
  };

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

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))] bg-white dark:bg-neutral-950 overflow-hidden w-full min-w-0">
      <CustomDragLayer />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-neutral-950 shrink-0 w-full">
        <div className="px-8 pt-8 pb-6 overflow-hidden">
          <div className="mb-4 flex items-center gap-2 text-[12px]">
            <Link
              href={`/jobs/${jobId}`}
              className="font-medium text-theme hover:underline"
            >
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <ArrowLeft className="size-3.5" />
                Back to the Job
              </span>
            </Link>
          </div>
          <div className="flex items-center justify-between gap-4 max-w-full">
            <div className="space-y-4 min-w-0">
              <div className="flex items-center gap-4">
                <h1 className="text-[32px] font-semibold text-slate-900 dark:text-neutral-100 leading-none truncate">
                  {job?.title ?? "Loading..."}
                </h1>
                {job && (
                  <Badge className="bg-[#E6F4EA] dark:bg-emerald-950/30 text-[#1E8E3E] dark:text-emerald-400 hover:bg-[#E6F4EA] dark:hover:bg-emerald-950/40 border-none font-medium px-3 py-1 rounded-full text-xs shadow-none shrink-0">
                    {job.status === "published" ? "Active Job" : job.status}
                  </Badge>
                )}
              </div>
              {job && (
                <div className="flex items-center text-sm font-medium text-slate-500 dark:text-neutral-400 gap-2 truncate whitespace-nowrap opacity-80">
                  <span className="shrink-0">
                    {EMPLOYMENT_LABELS[job.employmentType] ??
                      job.employmentType}
                  </span>
                  {job.location && (
                    <>
                      <span className="text-slate-300 dark:text-neutral-700 shrink-0">
                        -
                      </span>
                      <span className="shrink-0 truncate">{job.location}</span>
                    </>
                  )}
                  <span className="text-slate-300 dark:text-neutral-700 shrink-0">
                    -
                  </span>
                  <span className="shrink-0 text-slate-400 dark:text-neutral-500">
                    {localCandidates.length} candidate
                    {localCandidates.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="border-b border-slate-200 dark:border-neutral-800" />
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
                onCardClick={(id) => {
                  setSelectedCandidateId(id);
                  setIsDetailOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Candidate detail sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent
          showCloseButton={true}
          className="w-[98vw] sm:max-w-[98vw] p-0 flex flex-row gap-0 border-l border-slate-200 dark:border-neutral-800 shadow-none overflow-hidden bg-white dark:bg-neutral-950"
        >
          {selectedCandidateId &&
            (() => {
              const c = localCandidates.find(
                (x) => x.id === selectedCandidateId,
              );
              if (!c) return null;
              return (
                <CandidateDetailSheetProvider key={selectedCandidateId}>
                  <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
                    <div className="px-6 lg:px-8 py-4 lg:py-5 border-b border-slate-100 dark:border-neutral-800 shrink-0 bg-white dark:bg-neutral-950">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 min-w-0">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-neutral-100 tracking-tight">
                          {c.firstName} {c.lastName}
                        </h2>
                        {c.stageName && (
                          <Badge className="bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 border-none shadow-none font-medium px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wider whitespace-nowrap">
                            {c.stageName}
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-500 dark:text-neutral-400 text-[13px] mt-0.5">
                        {job?.title ?? ""}
                        <span className="mx-1.5 opacity-30">•</span>
                        Applied {formatTimeAgo(c.appliedAt)}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-1.5">
                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400 text-[12px] font-medium">
                          {c.email}
                        </span>
                        {c.phone && (
                          <span className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400 text-[12px] font-medium">
                            {c.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <CandidatePreviewPane
                      candidateId={selectedCandidateId}
                      open={isDetailOpen}
                    />
                  </div>

                  <CandidateSidePanel
                    candidateId={selectedCandidateId}
                    open={isDetailOpen}
                  />
                </CandidateDetailSheetProvider>
              );
            })()}
        </SheetContent>
      </Sheet>

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
