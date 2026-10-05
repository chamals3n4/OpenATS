"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ListSectionSpinner } from "@/components/dashboard-main-loading";
import { Button } from "@/components/ui/button";
import type { Candidate } from "@/types";
import { TableFooter, type PaginationInfo } from "@/components/table/table-footer";
import { useIsManager } from "@/hooks/use-role";
import { CandidateTableRow } from "./candidate-table-row";
import {
  BulkSelectHeaderCell,
  BulkSelectionBar,
  useBulkSelection,
} from "@/components/table/bulk-selection";
import { BulkDeleteDialog } from "@/components/table/bulk-delete-dialog";
import { BulkRejectDialog } from "./bulk-reject-dialog";

interface CandidatesTableProps {
  candidates: Candidate[];
  isLoading: boolean;
  onRowClick: (candidate: Candidate) => void;
  onEdit: (candidate: Candidate) => void;
  onDelete: (candidate: Candidate) => void;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  onDeleteSelected: (ids: number[]) => boolean | void | Promise<boolean | void>;
  onDeleteAllMatching?: () => boolean | void | Promise<boolean | void>;
  isDeletingSelected?: boolean;
  /** Rejects the picked candidates with a reason; resolve to false to keep the selection. */
  onRejectSelected?: (ids: number[], reason: string) => boolean | void | Promise<boolean | void>;
  isRejectingSelected?: boolean;
}

export function CandidatesTable({
  candidates,
  isLoading,
  onRowClick,
  onEdit,
  onDelete,
  pagination,
  onPageChange,
  onDeleteSelected,
  onDeleteAllMatching,
  isDeletingSelected,
  onRejectSelected,
  isRejectingSelected,
}: CandidatesTableProps) {
  const isManager = useIsManager();
  const visibleCandidateIds = useMemo(
    () => candidates.map((candidate) => candidate.id),
    [candidates],
  );
  const selection = useBulkSelection(visibleCandidateIds);
  const { clearSelection } = selection;
  const [allMatchingSelected, setAllMatchingSelected] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);

  // Candidates who picked a knockout answer and are still in the process.
  const flaggedIds = useMemo(
    () => candidates.filter((c) => c.knockedOut && c.status !== "rejected").map((c) => c.id),
    [candidates],
  );
  const canReject = isManager && !!onRejectSelected && !allMatchingSelected;

  const selectedCount = allMatchingSelected
    ? (pagination?.total ?? selection.selectedCount)
    : selection.selectedCount;

  const allVisibleSelected =
    allMatchingSelected || selection.allVisibleSelected;
  const someVisibleSelected =
    !allMatchingSelected && selection.someVisibleSelected;

  const hasHiddenMatchingRows =
    !!pagination && visibleCandidateIds.length < pagination.total;

  const canSelectAllMatching =
    !!pagination &&
    !!onDeleteAllMatching &&
    selection.allVisibleSelected &&
    !allMatchingSelected &&
    selection.selectedCount < pagination.total;

  const handleSelectAllMatching = () => {
    if (!pagination) return;
    setAllMatchingSelected(true);
  };

  const handleClearSelection = () => {
    setAllMatchingSelected(false);
    clearSelection();
  };

  const handleToggleVisible = (checked: boolean) => {
    if (checked && hasHiddenMatchingRows && onDeleteAllMatching) {
      selection.toggleVisible(true);
      setAllMatchingSelected(true);
      return;
    }

    setAllMatchingSelected(false);
    selection.toggleVisible(checked);
  };

  const handleToggleOne = (id: number, checked: boolean) => {
    if (allMatchingSelected) {
      setAllMatchingSelected(false);
      selection.replaceSelection(
        checked
          ? visibleCandidateIds
          : visibleCandidateIds.filter((candidateId) => candidateId !== id),
      );
      return;
    }

    selection.toggleOne(id, checked);
  };

  const handleConfirmBulkReject = async (reason: string) => {
    const shouldClear = await onRejectSelected?.(Array.from(selection.selectedIds), reason);
    if (shouldClear !== false) {
      handleClearSelection();
      setBulkRejectOpen(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    const shouldClear = allMatchingSelected
      ? await onDeleteAllMatching?.()
      : await onDeleteSelected(Array.from(selection.selectedIds));
    if (shouldClear !== false) {
      handleClearSelection();
      setBulkDeleteOpen(false);
    }
  };


  return (
    <div className="px-6 py-4">
      <div className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-none dark:border-neutral-700 dark:bg-neutral-900">
        <BulkSelectionBar
          selectedCount={selectedCount}
          label="candidate"
          onClear={handleClearSelection}
          onDeleteSelected={isManager ? () => setBulkDeleteOpen(true) : undefined}
          isDeleting={isDeletingSelected}
        >
          {canReject && (
            <Button
              type="button"
              variant="cancel"
              onClick={() => setBulkRejectOpen(true)}
              disabled={isRejectingSelected}
              className="h-7 rounded-md px-2.5 text-xs font-semibold shadow-none"
            >
              Reject selected
            </Button>
          )}
          {canSelectAllMatching ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleSelectAllMatching}
              className="h-7 rounded-md px-2 text-xs font-semibold text-slate-600 shadow-none hover:bg-slate-200 hover:text-slate-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
            >
              Select all {pagination.total} candidates
            </Button>
          ) : null}
        </BulkSelectionBar>
        {isManager && onRejectSelected && flaggedIds.length > 0 && selectedCount === 0 && (
          <div className="flex h-10 items-center justify-between border-b border-slate-300 bg-red-50/60 px-4 text-sm dark:border-neutral-700 dark:bg-red-950/20">
            <span className="text-red-800 dark:text-red-300">
              {flaggedIds.length} {flaggedIds.length === 1 ? "candidate does" : "candidates do"} not meet the
              requirements
            </span>
            <Button
              type="button"
              variant="ghost"
              onClick={() => selection.replaceSelection(flaggedIds)}
              className="h-7 rounded-md px-2 text-xs font-semibold text-red-800 shadow-none hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              Select {flaggedIds.length === 1 ? "it" : "them"}
            </Button>
          </div>
        )}
        <BulkRejectDialog
          open={bulkRejectOpen}
          count={selectedCount}
          isPending={isRejectingSelected}
          onClose={() => setBulkRejectOpen(false)}
          onConfirm={handleConfirmBulkReject}
        />
        <BulkDeleteDialog
          isOpen={bulkDeleteOpen}
          label="candidate"
          count={selectedCount}
          isAllMatching={allMatchingSelected}
          isPending={isDeletingSelected}
          onClose={() => setBulkDeleteOpen(false)}
          onConfirm={handleConfirmBulkDelete}
        />
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-300 dark:border-neutral-700 bg-slate-100/70 dark:bg-neutral-800/60 hover:bg-slate-100/70 dark:hover:bg-neutral-800/60">
              <BulkSelectHeaderCell
                className="h-11"
                checked={allVisibleSelected}
                indeterminate={someVisibleSelected}
                disabled={isLoading || candidates.length === 0}
                onCheckedChange={handleToggleVisible}
              />
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-[15px]">
                Candidate Name
              </TableHead>
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-[15px]">
                Stage
              </TableHead>
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-[15px]">
                Applied for
              </TableHead>
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-[15px]">
                Score
              </TableHead>
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-[15px]">
                Applied on
              </TableHead>
              <TableHead className="h-11 px-6 w-40 text-right font-semibold text-slate-900 dark:text-neutral-100 text-[15px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <ListSectionSpinner />
                </TableCell>
              </TableRow>
            ) : candidates.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-slate-400 text-sm"
                >
                  No candidates found.
                </TableCell>
              </TableRow>
            ) : (
              candidates.map((candidate) => (
                <CandidateTableRow
                  key={candidate.id}
                  candidate={candidate}
                  onRowClick={onRowClick}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  isSelected={
                    allMatchingSelected || selection.selectedIds.has(candidate.id)
                  }
                  onSelectedChange={(checked) =>
                    handleToggleOne(candidate.id, checked)
                  }
                />
              ))
            )}
          </TableBody>
        </Table>

        <TableFooter
          isLoading={isLoading}
          label="candidate"
          pagination={pagination}
          count={candidates.length}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}

