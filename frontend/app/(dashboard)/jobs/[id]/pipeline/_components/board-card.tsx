"use client";

import { memo, useCallback, useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";
import { useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { Checkbox } from "@/components/ui/checkbox";
import { initialsOf } from "@/lib/initials";
import type { BoardCandidate, PipelineStage } from "@/types";
import { fullName, timeAgo } from "../lib/board-utils";
import { CardMenu } from "./card-menu";

export const CARD_TYPE = "PIPELINE_CARD";

export type DragItem = { id: number; name: string; subtitle: string };

interface BoardCardProps {
  candidate: BoardCandidate;
  stages: PipelineStage[];
  now: number;
  /** True while this card's move is being saved: it cannot be dragged again until it lands. */
  isMoving: boolean;
  /** True while a search is active: every card shown is a match, so it gets the theme border. */
  isMatch: boolean;
  isSelected: boolean;
  /** True once anything is selected: checkboxes stay visible and a click toggles instead of opening. */
  selectionMode: boolean;
  onToggleSelect: (id: number) => void;
  onOpen: (id: number) => void;
  onMove: (candidateId: number, stageId: number, index: number) => void;
}

/** One candidate on the board. Memoized, so a drag over a column does not redraw every card. */
export const BoardCard = memo(function BoardCard({
  candidate,
  stages,
  now,
  isMoving,
  isMatch,
  isSelected,
  selectionMode,
  onToggleSelect,
  onOpen,
  onMove,
}: BoardCardProps) {
  const name = fullName(candidate);
  const applied = timeAgo(candidate.appliedAt, now);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const [{ isDragging }, dragRef, previewRef] = useDrag<DragItem, unknown, { isDragging: boolean }>(
    {
      type: CARD_TYPE,
      item: { id: candidate.id, name, subtitle: `Applied ${applied}` },
      canDrag: !isMoving,
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    },
    [candidate.id, name, applied, isMoving],
  );

  useEffect(() => {
    previewRef(getEmptyImage(), { captureDraggingState: true });
  }, [previewRef]);

  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      nodeRef.current = node;
      dragRef(node);
    },
    [dragRef],
  );

  // Clicks inside the actions menu are portaled but still bubble here through React.
  const activate = () => (selectionMode ? onToggleSelect(candidate.id) : onOpen(candidate.id));
  const open = (e: MouseEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.target as Node)) return;
    activate();
  };
  const openWithKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  };

  return (
    <div
      ref={attach}
      data-board-card
      role="button"
      tabIndex={0}
      aria-busy={isMoving}
      aria-label={`${name}, applied ${applied}. ${selectionMode ? "Toggle selection" : "Open profile"}`}
      aria-pressed={selectionMode ? isSelected : undefined}
      onClick={open}
      onKeyDown={openWithKey}
      className={`group flex cursor-pointer select-none items-center gap-3 rounded-md border bg-white px-3 py-2.5 outline-none transition-colors focus-visible:border-neutral-900 dark:bg-neutral-900 dark:focus-visible:border-neutral-300 ${
        isDragging
          ? "border-dashed border-slate-400 opacity-40 dark:border-neutral-500"
          : isMoving
            ? "border-slate-300 opacity-60 dark:border-neutral-700"
            : isSelected
              ? "border-theme bg-theme/10 ring-1 ring-theme"
              : isMatch
              ? "border-theme bg-theme/5 ring-1 ring-theme/40 hover:border-theme"
              : "border-slate-300 hover:border-slate-400 dark:border-neutral-700 dark:hover:border-neutral-500"
      }`}
    >
      {/* The avatar and the checkbox share one slot: hover, focus or selecting swaps them. */}
      <div className="relative size-8 shrink-0" onClick={(e) => e.stopPropagation()}>
        <span
          aria-hidden
          className={`absolute inset-0 flex items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 group-focus-within:opacity-0 group-hover:opacity-0 dark:bg-neutral-800 dark:text-neutral-200 ${
            selectionMode || isSelected ? "opacity-0" : ""
          }`}
        >
          {initialsOf(candidate.firstName, candidate.lastName)}
        </span>
        <Checkbox
          variant="theme"
          aria-label={`Select ${name}`}
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(candidate.id)}
          className={`absolute inset-1.5 size-5 bg-white group-focus-within:opacity-100 group-hover:opacity-100 dark:bg-neutral-900 ${
            selectionMode || isSelected ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-neutral-100">{name}</p>
        <p className="truncate text-xs text-slate-500 dark:text-neutral-400">
          Applied {applied}
        </p>
      </div>

      <CardMenu
        candidate={candidate}
        stages={stages}
        isSelected={isSelected}
        onOpen={onOpen}
        onMove={onMove}
        onToggleSelect={onToggleSelect}
      />
    </div>
  );
});
