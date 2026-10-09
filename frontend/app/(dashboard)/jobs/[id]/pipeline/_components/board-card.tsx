"use client";

import { memo, useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { Checkbox } from "@/components/ui/checkbox";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { ScoreBadge } from "@/components/score-badge";
import { candidateFlags } from "@/lib/scoring";
import type { BoardCandidate, PipelineStage } from "@/types";
import { fullName, timeAgo } from "../lib/board-utils";
import { CardMenu } from "./card-menu";
import { FlagsDialog } from "./flags-dialog";

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
  /** True once anything is selected: a click toggles instead of opening. */
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
  const flags = candidateFlags(candidate);
  const [flagsOpen, setFlagsOpen] = useState(false);

  const [{ isDragging }, dragRef, previewRef] = useDrag<DragItem, unknown, { isDragging: boolean }>(
    {
      type: CARD_TYPE,
      item: { id: candidate.id, name: candidate.firstName, subtitle: `Applied ${applied}` },
      canDrag: !isMoving,
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    },
    [candidate.id, candidate.firstName, applied, isMoving],
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
      className={`group flex cursor-pointer select-none items-center gap-3 rounded-md border bg-white px-3 py-2.5 outline-none transition-[color,background-color,border-color,opacity] duration-200 focus-visible:border-neutral-900 dark:bg-neutral-900 dark:focus-visible:border-neutral-300 ${
        isDragging
          ? "border-dashed border-slate-400 opacity-40 dark:border-neutral-500"
          : isMoving
            ? "border-slate-300 opacity-60 dark:border-neutral-700"
            : isSelected
              ? "border-theme bg-theme/10"
              : isMatch
              ? "border-theme bg-theme/5 ring-1 ring-theme/40 hover:border-theme"
              : "border-slate-300 hover:border-slate-400 dark:border-neutral-700 dark:hover:border-neutral-500"
      }`}
    >
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          variant="theme"
          aria-label={`Select ${name}`}
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(candidate.id)}
          className="size-5 bg-white dark:bg-neutral-900"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p title={name} className="truncate text-sm font-medium text-slate-900 dark:text-neutral-100">
          {candidate.firstName}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-neutral-400">
          Applied {applied}
        </p>
      </div>

      <ScoreBadge
        total={candidate.totalScore}
        scoredParts={candidate.scoredParts}
        weightedParts={candidate.weightedParts}
        knockedOut={candidate.knockedOut}
        assessmentPassed={candidate.assessmentPassed}
        assessmentExpired={candidate.assessmentExpired}
        hideWhenUnscored
        hideFlags
        className="shrink-0"
      />

      {flags.length > 0 && (
        <>
          {/* The flags are an icon, not pills, so they cannot squeeze the name in a narrow column. */}
          <button
            type="button"
            aria-label={`Flags for ${name}: ${flags.map((f) => f.label).join(", ")}`}
            title={flags.map((f) => f.label).join(" · ")}
            onClick={(e) => {
              e.stopPropagation();
              setFlagsOpen(true);
            }}
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-amber-600 outline-none transition-colors hover:bg-amber-50 focus-visible:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30 dark:focus-visible:bg-amber-950/30"
          >
            <HugeiconsIcon icon={Alert02Icon} className="size-4" strokeWidth={2} />
          </button>
          <FlagsDialog
            candidate={candidate}
            name={name}
            open={flagsOpen}
            onOpenChange={setFlagsOpen}
            onOpenProfile={onOpen}
          />
        </>
      )}

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
