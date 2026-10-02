"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDragLayer } from "react-dnd";
import { Button } from "@/components/ui/button";
import type { BoardCandidate } from "@/types";
import { useJob } from "@/hooks/queries/use-jobs";
import { useCurrentUser } from "@/hooks/queries/use-user";
import { usePipeline } from "@/hooks/queries/use-pipeline";
import { useJobAssessments } from "@/hooks/queries/use-assessments";
import { useBoardCandidates } from "@/hooks/queries/use-candidates";
import { BoardColumn } from "./_components/board-column";
import { BoardFiltersBar } from "./_components/board-filters-bar";
import { BulkActionBar } from "./_components/bulk-action-bar";
import { BoardHeader } from "./_components/board-header";
import { DragPreview } from "./_components/drag-preview";
import { MoveConfirmDialog } from "./_components/move-confirm-dialog";
import { useBoardMoves } from "./hooks/use-board-moves";
import { useEdgeScroll } from "./hooks/use-edge-scroll";
import {
  EMPTY_FILTERS,
  hasCandidateFilters,
  matchesFilters,
  type BoardFilters,
} from "./lib/board-filters";
import { bulkMoveTargets, groupByStage, isFullyVisibleX, toFullIndex } from "./lib/board-utils";

/** Re-reads the clock once a minute so "5m ago" on the cards does not go stale. */
function useMinuteClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function HiringPipelinePage() {
  const jobId = Number(useParams().id);
  const router = useRouter();

  const { data: currentUserRes, isLoading: isLoadingUser } = useCurrentUser();
  const { data: jobData, isLoading: isLoadingJob } = useJob(jobId);
  const role = currentUserRes?.data?.role;
  const isManager = role === "super_admin" || role === "hiring_manager";

  const { data: pipelineData, isLoading: isLoadingStages } = usePipeline(jobId);
  const board = useBoardCandidates(jobId, { enabled: isManager });
  const { data: assessmentData } = useJobAssessments(jobId);

  const job = jobData?.data;

  // Interviewers do not get the board.
  useEffect(() => {
    if (role && !isManager) router.replace(`/jobs/${jobId}`);
  }, [role, isManager, router, jobId]);

  useEffect(() => {
    if (!isLoadingJob && !job) router.replace("/jobs");
  }, [isLoadingJob, job, router]);

  const stages = useMemo(
    () => [...(pipelineData?.data ?? [])].sort((a, b) => a.position - b.position),
    [pipelineData],
  );
  const assessmentStageIds = useMemo(
    () =>
      new Set(
        (assessmentData?.data ?? [])
          .map((a) => a.triggerStageId)
          .filter((id): id is number => id !== null),
      ),
    [assessmentData],
  );

  const candidates = board.data?.data;
  const byStage = useMemo(() => groupByStage(candidates ?? []), [candidates]);

  const now = useMinuteClock();

  // Filters run on a deferred copy, so typing and picking stay instant even on a big board.
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS);
  const patchFilters = useCallback(
    (patch: Partial<BoardFilters>) => setFilters((f) => ({ ...f, ...patch })),
    [],
  );
  const clearFilters = useCallback(() => setFilters((f) => ({ ...EMPTY_FILTERS, search: f.search })), []);
  const deferred = useDeferredValue(filters);
  const isSearching = deferred.search.trim() !== "";
  const isFiltering = hasCandidateFilters(deferred);

  // Columns the stage filter leaves on the board.
  const shownStages = useMemo(
    () => (filters.stageIds.length === 0 ? stages : stages.filter((s) => filters.stageIds.includes(s.id))),
    [stages, filters.stageIds],
  );

  const visibleByStage = useMemo(() => {
    if (!isFiltering) return byStage;
    const filtered = new Map<number, BoardCandidate[]>();
    for (const [stageId, list] of byStage) {
      filtered.set(stageId, list.filter((c) => matchesFilters(c, deferred, now)));
    }
    return filtered;
  }, [byStage, deferred, isFiltering, now]);

  // Only candidates in the columns on screen count as matches or can be selected.
  const shownCandidates = useMemo(
    () => shownStages.flatMap((s) => visibleByStage.get(s.id) ?? []),
    [shownStages, visibleByStage],
  );
  const matchCount = isFiltering ? shownCandidates.length : null;

  // Selection. What is selected but no longer shown (filtered out) is ignored, not remembered.
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const selectedIds = useMemo(() => {
    const shown = new Set(shownCandidates.map((c) => c.id));
    return new Set([...selected].filter((id) => shown.has(id)));
  }, [selected, shownCandidates]);
  const selectionMode = selectedIds.size > 0;

  const toggleSelect = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const toggleColumn = useCallback((ids: number[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allOn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  useEffect(() => {
    if (!selectionMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectionMode, clearSelection]);

  const { movingIds, pending, requestMove, requestBulkMove, confirmPending, cancelPending } =
    useBoardMoves(jobId, stages, assessmentStageIds, { onBulkMoved: clearSelection });

  const bulkTargets = useMemo(
    () => bulkMoveTargets(stages, shownCandidates.filter((c) => selectedIds.has(c.id))),
    [stages, shownCandidates, selectedIds],
  );

  // The selected cards in the order they appear on the board, so they keep that order.
  const moveSelected = useCallback(
    (stageId: number) => {
      requestBulkMove(
        shownCandidates.filter((c) => selectedIds.has(c.id)).map((c) => c.id),
        stageId,
      );
    },
    [requestBulkMove, shownCandidates, selectedIds],
  );

  // A slot counted among the cards shown becomes a slot in the whole column.
  const moveVisible = useCallback(
    (candidateId: number, stageId: number, index: number) => {
      const full = byStage.get(stageId) ?? [];
      const visible = visibleByStage.get(stageId) ?? [];
      requestMove(candidateId, stageId, toFullIndex(full, visible, index));
    },
    [byStage, visibleByStage, requestMove],
  );

  const openCandidate = useCallback(
    (id: number) => router.push(`/candidates/${id}?from=pipeline`),
    [router],
  );

  const scrollRef = useRef<HTMLDivElement>(null);

  // A filter can match in a column that is scrolled out of view, so bring the first column with
  // a match into view. It runs when that column changes, not on every keystroke, so it does not
  // fight someone who scrolls away by hand while typing.
  const firstMatchStageId = isFiltering
    ? (shownStages.find((s) => (visibleByStage.get(s.id)?.length ?? 0) > 0)?.id ?? null)
    : null;
  useEffect(() => {
    if (firstMatchStageId === null) return;
    const container = scrollRef.current;
    const column = container?.querySelector<HTMLElement>(`[data-stage-id="${firstMatchStageId}"]`);
    if (!container || !column) return;
    const containerRect = container.getBoundingClientRect();
    const columnRect = column.getBoundingClientRect();
    if (isFullyVisibleX(columnRect, containerRect)) return;
    container.scrollTo({
      left: container.scrollLeft + (columnRect.left - containerRect.left) - 24,
      behavior: "smooth",
    });
  }, [firstMatchStageId]);

  // Clearing the filters puts the board back at the first stage.
  const wasFiltering = useRef(false);
  useEffect(() => {
    if (wasFiltering.current && !isFiltering) {
      scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
    }
    wasFiltering.current = isFiltering;
  }, [isFiltering]);

  const { isDragging } = useDragLayer((monitor) => ({ isDragging: monitor.isDragging() }));
  useEdgeScroll(scrollRef, isDragging);

  if (isLoadingUser || !role || !isManager) return null;

  const isLoading = board.isPending || isLoadingStages;

  return (
    <div className="relative flex h-[calc(100vh-var(--header-height))] w-full min-w-0 flex-col overflow-hidden bg-slate-50 dark:bg-neutral-950">
      <DragPreview />
      <BoardHeader
        jobId={jobId}
        job={job}
        candidateCount={candidates ? candidates.length : null}
        matchCount={matchCount}
        search={filters.search}
        onSearchChange={(search) => patchFilters({ search })}
      />
      <BoardFiltersBar
        filters={filters}
        stages={stages}
        onChange={patchFilters}
        onClear={clearFilters}
      />

      <div
        ref={scrollRef}
        className="min-h-0 w-full min-w-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:thin]"
      >
        {board.isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
              The pipeline could not be loaded
            </p>
            <p className="text-sm text-slate-500 dark:text-neutral-400">
              Check your connection and try again.
            </p>
            <Button variant="cancel" className="h-9 px-4 text-sm" onClick={() => board.refetch()}>
              Try again
            </Button>
          </div>
        ) : !isLoadingStages && stages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6">
            <p className="text-sm text-slate-500 dark:text-neutral-400">
              This job has no pipeline stages yet. Add some under Hiring Process.
            </p>
          </div>
        ) : (
          <div className="flex h-full w-max items-stretch gap-4 p-4 sm:p-6">
            {(isLoadingStages ? [] : shownStages).map((stage) => (
              <BoardColumn
                key={stage.id}
                stage={stage}
                stages={stages}
                candidates={visibleByStage.get(stage.id) ?? []}
                totalCount={byStage.get(stage.id)?.length ?? 0}
                now={now}
                isLoading={isLoading}
                movingIds={movingIds}
                isSearching={isSearching}
                selectedIds={selectedIds}
                selectionMode={selectionMode}
                onToggleSelect={toggleSelect}
                onToggleColumn={toggleColumn}
                onOpen={openCandidate}
                onMove={moveVisible}
              />
            ))}
          </div>
        )}
      </div>

      <BulkActionBar
        count={selectedIds.size}
        stages={bulkTargets}
        onMove={moveSelected}
        onClear={clearSelection}
      />

      <MoveConfirmDialog pending={pending} onClose={cancelPending} onConfirm={confirmPending} />
    </div>
  );
}
