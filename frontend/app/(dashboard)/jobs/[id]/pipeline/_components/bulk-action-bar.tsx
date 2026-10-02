"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PipelineStage } from "@/types";

interface BulkActionBarProps {
  count: number;
  stages: PipelineStage[];
  onMove: (stageId: number) => void;
  onClear: () => void;
}

/** Floats over the bottom of the board while cards are selected. */
export function BulkActionBar({ count, stages, onMove, onClear }: BulkActionBarProps) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
    >
      <p className="text-sm font-medium whitespace-nowrap text-slate-900 dark:text-neutral-100">
        {count} selected
      </p>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button className="h-9 cursor-pointer gap-2 border-none bg-theme px-4 text-sm font-semibold text-white shadow-none hover:bg-theme-hover" />
          }
        >
          Move to
          <HugeiconsIcon icon={ArrowDown01Icon} className="size-4" strokeWidth={2} />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="center" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Move {count} to</DropdownMenuLabel>
            {stages.map((stage) => (
              <DropdownMenuItem key={stage.id} onClick={() => onMove(stage.id)}>
                {stage.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button type="button" variant="cancel" onClick={onClear} className="h-9 px-4 text-sm">
        Clear
      </Button>
    </div>
  );
}
