"use client";

import { RowDeleteButton, RowEditButton } from "@/components/table/row-actions";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BulkSelectRowCell } from "@/components/table/bulk-selection";
import type { Candidate } from "@/types";
import { timeAgo } from "../lib/candidate-utils";
import { useIsManager } from "@/hooks/use-role";
import { formatScore } from "@/lib/scoring";

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
      <TableCell className="h-12 px-6 py-0 text-slate-900 dark:text-neutral-100 font-medium">
        {candidate.firstName} {candidate.lastName}
      </TableCell>
      <TableCell className="h-12 px-6 py-0">
        {candidate.status === "rejected" ? (
          <Badge className="bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border-none shadow-none font-medium px-2 py-0.5 rounded-full text-[13px]">
            Rejected
          </Badge>
        ) : candidate.stageName ? (
          <Badge className="bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 border-none shadow-none font-medium px-2 py-0.5 rounded-full text-[13px]">
            {candidate.stageName}
          </Badge>
        ) : (
          <span className="text-slate-500">—</span>
        )}
      </TableCell>
      <TableCell className="h-12 px-6 py-0 text-slate-800 dark:text-neutral-200 font-normal">
        {candidate.jobTitle ?? "—"}
      </TableCell>
      <TableCell className="h-12 px-6 py-0">
        <div className="flex items-center gap-2">
          <span
            title={
              candidate.scoredParts
                ? `Based on ${candidate.scoredParts} scored ${candidate.scoredParts === 1 ? "part" : "parts"}`
                : "Not scored yet"
            }
            className="w-8 font-semibold tabular-nums text-slate-900 dark:text-neutral-100"
          >
            {formatScore(candidate.totalScore)}
          </span>
          {candidate.knockedOut && (
            <Badge className="border-none bg-red-50 px-2 py-0.5 text-[12px] font-medium text-red-600 shadow-none hover:bg-red-50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/30">
              Doesn&apos;t meet requirements
            </Badge>
          )}
          {candidate.assessmentPassed === false && (
            <Badge className="border-none bg-amber-50 px-2 py-0.5 text-[12px] font-medium text-amber-700 shadow-none hover:bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/30">
              Failed assessment
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="h-12 px-6 py-0 text-slate-800 dark:text-neutral-200 font-normal">
        {timeAgo(candidate.appliedAt)}
      </TableCell>
      <TableCell
        className="h-12 px-6 py-0"
        onClick={(e) => e.stopPropagation()}
      >
        {isManager && (
          <div className="flex items-center justify-end gap-2">
            <RowEditButton onClick={() => onEdit(candidate)} />
            <RowDeleteButton onClick={() => onDelete(candidate)} />
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
