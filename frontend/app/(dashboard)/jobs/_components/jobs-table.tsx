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
import { Button } from "@/components/ui/button";
import { JobTableRow } from "./job-table-row";
import {
  BulkSelectHeaderCell,
  BulkSelectionBar,
  useBulkSelection,
} from "@/components/table/bulk-selection";
import { BulkDeleteDialog } from "@/components/table/bulk-delete-dialog";
import type { Job } from "@/types";

interface JobsTableProps {
  jobs: Job[];
  departmentNameById: Map<number, string>;
  onDelete: (job: Job) => void;
  onDeleteSelected: (ids: number[]) => boolean | void | Promise<boolean | void>;
  isDeletingSelected?: boolean;
}

export function JobsTable({
  jobs,
  departmentNameById,
  onDelete,
  onDeleteSelected,
  isDeletingSelected,
}: JobsTableProps) {
  const hasJobs = jobs.length > 0;
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
          onDeleteSelected={() => setBulkDeleteOpen(true)}
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
                checked={selection.allVisibleSelected}
                indeterminate={selection.someVisibleSelected}
                disabled={!hasJobs}
                onCheckedChange={selection.toggleVisible}
              />
              <TableHead className="h-10 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Job Name
              </TableHead>
              <TableHead className="h-10 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Job Type
              </TableHead>
              <TableHead className="h-10 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Department Name
              </TableHead>
              <TableHead className="h-10 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Created At
              </TableHead>
              <TableHead className="h-10 px-6 w-44 text-right font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasJobs ? (
              jobs.map((job) => (
                <JobTableRow
                  key={job.id}
                  job={job}
                  departmentName={
                    departmentNameById.get(job.departmentId) ??
                    `Department #${job.departmentId}`
                  }
                  onDelete={onDelete}
                  isSelected={selection.selectedIds.has(job.id)}
                  onSelectedChange={(checked) =>
                    selection.toggleOne(job.id, checked)
                  }
                />
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-slate-400 text-sm"
                >
                  No jobs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination — extract to JobsPagination component if it grows */}
        <div className="flex items-center justify-between px-6 py-2.5 border-t border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          <span className="text-sm font-medium text-slate-400">
            {hasJobs
              ? `Showing 1-${jobs.length} of ${jobs.length} results`
              : "Showing 0 of 0 results"}
          </span>
          <div className="flex items-center gap-3">
            <Button className="h-8 rounded-md border border-slate-300 dark:border-neutral-600 bg-transparent hover:bg-slate-50 dark:hover:bg-neutral-900/50 px-4 text-sm font-semibold leading-none text-slate-700 dark:text-neutral-300 shadow-none">
              Previous
            </Button>
            <Button className="h-8 rounded-md border-none bg-theme hover:bg-theme-hover px-4 text-sm font-semibold leading-none text-white shadow-none">
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
