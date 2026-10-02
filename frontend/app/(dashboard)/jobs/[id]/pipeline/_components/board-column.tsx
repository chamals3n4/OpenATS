"use client";

import { memo, useCallback, useRef, useState } from "react";
import { useDrop } from "react-dnd";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { BoardCandidate, PipelineStage } from "@/types";
import { dropIndex } from "../lib/board-utils";
import { BoardCard, CARD_TYPE, type DragItem } from "./board-card";

/**
 * Cards drawn per column until "Show more" is pressed. Every drawn card is also a drag source,
 * and a drag start makes each of them re-check itself, so a 500-card column froze the page for
 * seconds. Search and the totals still cover every card; only the drawing is limited.
 */
export const PAGE_SIZE = 50;

const STAGE_DOT: Record<PipelineStage["stageType"], string> = {
  screening: "bg-amber-500",
  interview: "bg-blue-500",
  offer: "bg-green-500",
};

interface BoardColumnProps {
  stage: PipelineStage;
  stages: PipelineStage[];
  /** The cards shown, after any search. */
  candidates: BoardCandidate[];
  /** How many the stage holds in all, so a search can say "2 of 5". */
  totalCount: number;
  now: number;
  isLoading: boolean;
  movingIds: ReadonlySet<number>;
  /** A search is active, so the cards shown are highlighted as matches. */
  isSearching: boolean;
  selectedIds: ReadonlySet<number>;
  selectionMode: boolean;
  onToggleSelect: (id: number) => void;
  /** Selects, or deselects when all are already selected, every card the column holds. */
  onToggleColumn: (candidateIds: number[]) => void;
  onOpen: (id: number) => void;
  onMove: (candidateId: number, stageId: number, index: number) => void;
}

/** Where the dragged card would land: the slot, and the line's offset inside the column body. */
type Slot = { index: number; top: number };

export const BoardColumn = memo(function BoardColumn({
  stage,
  stages,
  candidates,
  totalCount,
  now,
  isLoading,
  movingIds,
  isSearching,
  selectedIds,
  selectionMode,
  onToggleSelect,
  onToggleColumn,
  onOpen,
  onMove,
}: BoardColumnProps) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const shown = candidates.length > limit ? candidates.slice(0, limit) : candidates;
  const hiddenCount = candidates.length - shown.length;

  /** Reads the cards as drawn right now, so the slot is right even after the column scrolled. */
  const slotAt = useCallback((pointerY: number): Slot | null => {
    const body = bodyRef.current;
    if (!body) return null;
    const bodyTop = body.getBoundingClientRect().top;
    const rects = [...body.querySelectorAll<HTMLElement>("[data-board-card]")].map((el) =>
      el.getBoundingClientRect(),
    );
    const index = dropIndex(rects, pointerY);
    const edge = rects[index]?.top ?? (rects.length ? rects[rects.length - 1].bottom + 8 : bodyTop + 12);
    return { index, top: edge - 4 - bodyTop + body.scrollTop };
  }, []);

  const [{ isOver }, dropRef] = useDrop<DragItem, void, { isOver: boolean }>(
    {
      accept: CARD_TYPE,
      hover: (_item, monitor) => {
        const y = monitor.getClientOffset()?.y;
        if (y === undefined) return;
        const next = slotAt(y);
        setSlot((prev) => (prev && next && prev.index === next.index ? prev : next));
      },
      drop: (item, monitor) => {
        const y = monitor.getClientOffset()?.y;
        const target = y === undefined ? null : slotAt(y);
        setSlot(null);
        onMove(item.id, stage.id, target?.index ?? shown.length);
      },
      collect: (monitor) => ({ isOver: monitor.isOver() }),
    },
    [slotAt, onMove, stage.id, shown.length],
  );

  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      bodyRef.current = node;
      dropRef(node);
    },
    [dropRef],
  );

  const showLine = isOver && slot !== null;
  const selectedInColumn = candidates.reduce((n, c) => n + (selectedIds.has(c.id) ? 1 : 0), 0);
  const allSelected = candidates.length > 0 && selectedInColumn === candidates.length;

  return (
    <section
      data-stage-id={stage.id}
      aria-label={`${stage.name}, ${candidates.length} candidates shown`}
      className="flex min-h-0 w-72 shrink-0 flex-col"
    >
      <header className="group/header mb-3 flex items-center gap-2 px-1">
        {candidates.length > 0 && (
          <Checkbox
            variant="theme"
            aria-label={`Select all ${candidates.length} in ${stage.name}`}
            checked={allSelected}
            indeterminate={selectedInColumn > 0 && !allSelected}
            onCheckedChange={() => onToggleColumn(candidates.map((c) => c.id))}
            className={`size-4 focus-visible:opacity-100 group-hover/header:opacity-100 ${
              selectionMode ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
        <span aria-hidden className={`size-2 rounded-full ${STAGE_DOT[stage.stageType]}`} />
        <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-neutral-100">
          {stage.name}
        </h2>
        <span className="ml-auto rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium tabular-nums text-slate-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
          {isLoading ? "…" : candidates.length === totalCount ? totalCount : `${candidates.length} of ${totalCount}`}
        </span>
      </header>

      <div
        ref={attach}
        className={`relative min-h-0 flex-1 space-y-2 overflow-y-auto rounded-lg border p-2 [scrollbar-width:thin] ${
          isOver
            ? "border-theme bg-theme/5"
            : "border-slate-300 bg-slate-100/60 dark:border-neutral-700 dark:bg-neutral-900/40"
        }`}
      >
        {isLoading ? (
          <>
            <Skeleton className="h-14 w-full rounded-md" />
            <Skeleton className="h-14 w-full rounded-md" />
          </>
        ) : candidates.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-slate-500 dark:text-neutral-400">
            {isOver
              ? "Drop to move here"
              : totalCount > 0
                ? "No matches in this stage"
                : "No candidates in this stage"}
          </p>
        ) : (
          shown.map((candidate) => (
            <BoardCard
              key={candidate.id}
              candidate={candidate}
              stages={stages}
              now={now}
              isMoving={movingIds.has(candidate.id)}
              isMatch={isSearching}
              isSelected={selectedIds.has(candidate.id)}
              selectionMode={selectionMode}
              onToggleSelect={onToggleSelect}
              onOpen={onOpen}
              onMove={onMove}
            />
          ))
        )}

        {hiddenCount > 0 && (
          <Button
            type="button"
            variant="cancel"
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            className="h-9 w-full text-sm"
          >
            Show {Math.min(PAGE_SIZE, hiddenCount)} more ({hiddenCount} not shown)
          </Button>
        )}

        {showLine && shown.length > 0 && (
          <span
            aria-hidden
            style={{ top: slot.top }}
            className="pointer-events-none absolute inset-x-2 h-0.5 rounded-full bg-theme"
          />
        )}
      </div>
    </section>
  );
});
