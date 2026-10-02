"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { MoreVerticalIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BoardCandidate, PipelineStage } from "@/types";
import { fullName, stageKeyOf } from "../lib/board-utils";

interface CardMenuProps {
  candidate: BoardCandidate;
  stages: PipelineStage[];
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onOpen: (id: number) => void;
  onMove: (candidateId: number, stageId: number, index: number) => void;
}

/**
 * The keyboard and touch way to move a card, since dragging needs a mouse. A stage picked here
 * puts the card at the top of that column, where it is always drawn.
 */
export function CardMenu({
  candidate,
  stages,
  isSelected,
  onToggleSelect,
  onOpen,
  onMove,
}: CardMenuProps) {
  const current = stageKeyOf(candidate);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${fullName(candidate)}`}
        onClick={(e) => e.stopPropagation()}
        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 outline-none transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:bg-slate-100 data-popup-open:bg-slate-100 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 dark:focus-visible:bg-neutral-800 dark:data-popup-open:bg-neutral-800"
      >
        <HugeiconsIcon icon={MoreVerticalIcon} className="size-4" strokeWidth={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => onOpen(candidate.id)}>Open profile</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleSelect(candidate.id)}>
          {isSelected ? "Deselect" : "Select"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Move to</DropdownMenuLabel>
          {stages.map((stage) => (
            <DropdownMenuItem
              key={stage.id}
              disabled={stage.id === current}
              onClick={() => onMove(candidate.id, stage.id, 0)}
              className="justify-between"
            >
              {stage.name}
              {stage.id === current && (
                <HugeiconsIcon icon={Tick02Icon} className="size-4" strokeWidth={2} />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
