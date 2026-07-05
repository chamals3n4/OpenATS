"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { PencilEdit01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BulkSelectRowCell } from "@/components/table/bulk-selection";
import type { Candidate } from "@/types";
import { timeAgo } from "../lib/candidate-utils";
import { useIsManager } from "@/hooks/use-role";

interface CandidateTableRowProps {
  candidate: Candidate;
  onRowClick: (candidate: Candidate) => void;
  onEdit: (candidate: Candidate) => void;
  onDelete: (candidate: Candidate) => void;
  isSelected: boolean;
  onSelectedChange: (checked: boolean) => void;
}

export function CandidateTableRow({
  candidate,
  onRowClick,
  onEdit,
  onDelete,
  isSelected,
  onSelectedChange,
}: CandidateTableRowProps) {
  const isManager = useIsManager();
  return (
    <TableRow
      data-state={isSelected ? "selected" : undefined}
      className="border-b border-slate-300 dark:border-neutral-700 last:border-0 font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors"
      onClick={() => onRowClick(candidate)}
    >
      <BulkSelectRowCell
        checked={isSelected}
        onCheckedChange={onSelectedChange}
      />
      <TableCell className="h-10 px-6 py-0 text-slate-700 dark:text-neutral-300 font-medium">
        {candidate.firstName} {candidate.lastName}
      </TableCell>
      <TableCell className="h-10 px-6 py-0">
        {candidate.status === "rejected" ? (
          <Badge className="bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border-none shadow-none font-medium px-2 py-0.5 rounded-full text-xs">
            Rejected
          </Badge>
        ) : candidate.stageName ? (
          <Badge className="bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 border-none shadow-none font-medium px-2 py-0.5 rounded-full text-xs">
            {candidate.stageName}
          </Badge>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </TableCell>
      <TableCell className="h-10 px-6 py-0 text-slate-600 dark:text-neutral-400 font-normal">
        {candidate.jobTitle ?? "—"}
      </TableCell>
      <TableCell className="h-10 px-6 py-0 text-slate-600 dark:text-neutral-400 font-normal">
        {timeAgo(candidate.appliedAt)}
      </TableCell>
      <TableCell
        className="h-10 px-6 py-0"
        onClick={(e) => e.stopPropagation()}
      >
        {isManager && (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              className="h-8 rounded-md border border-slate-300 dark:border-neutral-600 bg-transparent hover:bg-slate-50 dark:hover:bg-neutral-900/50 px-4 text-sm font-semibold leading-none text-slate-700 dark:text-neutral-300 shadow-none cursor-pointer"
              onClick={() => onEdit(candidate)}
            >
              <HugeiconsIcon icon={PencilEdit01Icon} className="size-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              className="h-8 rounded-md border-none bg-red-500 px-4 text-sm font-semibold leading-none text-white shadow-none hover:bg-red-500 cursor-pointer"
              onClick={() => onDelete(candidate)}
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-3.5 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
