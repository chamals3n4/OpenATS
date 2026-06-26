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
import { JobTableRow } from "./job-table-row";
import {
  BulkSelectHeaderCell,
  BulkSelectionBar,
  useBulkSelection,
} from "@/components/table/bulk-selection";
import { BulkDeleteDialog } from "@/components/table/bulk-delete-dialog";
import { TableFooter, type PaginationInfo } from "@/components/table/table-footer";
import type { Job } from "@/types";
import { useIsManager } from "@/hooks/use-role";

interface JobsTableProps {
  jobs: Job[];
  departmentNameById: Map<number, string>;
  isLoading: boolean;
  onDelete: (job: Job) => void;
  onDeleteSelected: (ids: number[]) => boolean | void | Promise<boolean | void>;
  isDeletingSelected?: boolean;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
}

export function JobsTable({
  jobs,
  departmentNameById,
  isLoading,
  onDelete,
  onDeleteSelected,
  isDeletingSelected,
  pagination,
  onPageChange,
}: JobsTableProps) {
  const isManager = useIsManager();
  const visibleJobIds = useMemo(() => jobs.map((job) => job.id), [jobs]);
  const selection = useBulkSelection(visibleJobIds);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const handleConfirmBulkDelete = async () => {
    const shouldClear = await onDeleteSelected(Array.from(selection.selectedIds));
    if (shouldClear !== false) {
      selection.clearSelection();
      setBulkDeleteOpen(false);
    }
  };

  return (
    <div className="px-6 py-4">
      <div className="border border-slate-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 shadow-none overflow-hidden">
        <BulkSelectionBar
          selectedCount={selection.selectedCount}
          label="job"
          onClear={selection.clearSelection}
          onDeleteSelected={isManager ? () => setBulkDeleteOpen(true) : undefined}
          isDeleting={isDeletingSelected}
        />
        <BulkDeleteDialog
          isOpen={bulkDeleteOpen}
          label="job"
          count={selection.selectedCount}
          isPending={isDeletingSelected}
          onClose={() => setBulkDeleteOpen(false)}
          onConfirm={handleConfirmBulkDelete}
        />
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-transparent">
              <BulkSelectHeaderCell
                className="h-11"
                checked={selection.allVisibleSelected}
                indeterminate={selection.someVisibleSelected}
                disabled={isLoading || jobs.length === 0}
                onCheckedChange={selection.toggleVisible}
              />
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Job Name
              </TableHead>
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Job Type
              </TableHead>
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Department Name
              </TableHead>
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Created At
              </TableHead>
              <TableHead className="h-11 px-6 w-44 text-right font-semibold text-slate-900 dark:text-neutral-100 text-sm">
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
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-400 text-sm">
                  No jobs found.
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <JobTableRow
                  key={job.id}
                  job={job}
                  departmentName={
                    departmentNameById.get(job.departmentId) ?? `Department #${job.departmentId}`
                  }
                  onDelete={onDelete}
                  isSelected={selection.selectedIds.has(job.id)}
                  onSelectedChange={(checked) => selection.toggleOne(job.id, checked)}
                />
              ))
            )}
          </TableBody>
        </Table>

        <TableFooter
          isLoading={isLoading}
          label="job"
          pagination={pagination}
          count={jobs.length}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
