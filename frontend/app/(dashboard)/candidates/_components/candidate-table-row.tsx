"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { PencilEdit01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Candidate } from "@/types";
import { timeAgo } from "../libs/candidate-utils";

interface CandidateTableRowProps {
  candidate: Candidate;
  onRowClick: (candidate: Candidate) => void;
  onEdit: (candidate: Candidate) => void;
  onDelete: (candidate: Candidate) => void;
}

export function CandidateTableRow({
  candidate,
  onRowClick,
  onEdit,
  onDelete,
}: CandidateTableRowProps) {
  return (
    <TableRow
      className="border-b border-slate-300 dark:border-neutral-700 last:border-0 font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors"
      onClick={() => onRowClick(candidate)}
    >
      <TableCell className="h-13 px-8 py-0 font-medium text-slate-700 dark:text-neutral-200">
        {candidate.firstName} {candidate.lastName}
      </TableCell>
      <TableCell className="h-13 px-8 py-0">
        {candidate.status === "rejected" ? (
          <Badge className="bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border-none shadow-none font-medium px-2.5 py-0.5 rounded-full text-[12px]">
            Rejected
          </Badge>
        ) : candidate.stageName ? (
          <Badge className="bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 border-none shadow-none font-medium px-2.5 py-0.5 rounded-full text-[12px]">
            {candidate.stageName}
          </Badge>
        ) : (
          <span className="text-slate-400 text-sm">—</span>
        )}
      </TableCell>
      <TableCell className="h-13 px-8 py-0 text-slate-500 dark:text-neutral-400 font-normal">
        {candidate.jobTitle ?? "—"}
      </TableCell>
      <TableCell className="h-13 px-8 py-0 text-slate-500 dark:text-neutral-400 font-normal">
        {timeAgo(candidate.appliedAt)}
      </TableCell>
      <TableCell
        className="h-13 px-4 py-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            className="h-[34px] rounded-md border-none bg-neutral-700/90 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600 cursor-pointer"
            onClick={() => onEdit(candidate)}
          >
            <HugeiconsIcon icon={PencilEdit01Icon} className="size-4" />
            Edit
          </Button>
          <Button
            size="sm"
            className="h-[34px] rounded-md border-none bg-red-600/90 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-red-500 dark:bg-red-700/90 dark:hover:bg-red-600 cursor-pointer"
            onClick={() => onDelete(candidate)}
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-4" />
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
