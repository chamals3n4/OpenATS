"use client";

import { RowDeleteButton, RowEditButton } from "@/components/table/row-actions";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BulkSelectRowCell } from "@/components/table/bulk-selection";
import type { Candidate } from "@/types";
import { timeAgo } from "../lib/candidate-utils";
import { useIsManager } from "@/hooks/use-role";
import { ScoreBadge } from "@/components/score-badge";

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
        <ScoreBadge
          total={candidate.totalScore}
          scoredParts={candidate.scoredParts}
          weightedParts={candidate.weightedParts}
          knockedOut={candidate.knockedOut}
          assessmentPassed={candidate.assessmentPassed}
        />
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
