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
import { CandidateTableRow } from "./candidate-table-row";
import {
  BulkSelectHeaderCell,
  BulkSelectionBar,
  useBulkSelection,
} from "@/components/table/bulk-selection";
import { BulkDeleteDialog } from "@/components/table/bulk-delete-dialog";

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
}: CandidatesTableProps) {
  const visibleCandidateIds = useMemo(
    () => candidates.map((candidate) => candidate.id),
    [candidates],
  );
  const selection = useBulkSelection(visibleCandidateIds);
  const { clearSelection } = selection;
  const [allMatchingSelected, setAllMatchingSelected] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

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
          onDeleteSelected={() => setBulkDeleteOpen(true)}
          isDeleting={isDeletingSelected}
        >
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
            <TableRow className="border-b border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-transparent">
              <BulkSelectHeaderCell
                className="h-11"
                checked={allVisibleSelected}
                indeterminate={someVisibleSelected}
                disabled={isLoading || candidates.length === 0}
                onCheckedChange={handleToggleVisible}
              />
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Candidate Name
              </TableHead>
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Stage
              </TableHead>
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Applied for
              </TableHead>
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Applied on
              </TableHead>
              <TableHead className="h-11 px-6 w-40 text-right font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <ListSectionSpinner />
                </TableCell>
              </TableRow>
            ) : candidates.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
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

