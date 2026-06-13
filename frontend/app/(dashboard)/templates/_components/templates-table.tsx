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
import type { Template } from "@/types";
import { TemplateTableRow } from "./template-table-row";
import {
  BulkSelectHeaderCell,
  BulkSelectionBar,
  useBulkSelection,
} from "@/components/table/bulk-selection";
import { BulkDeleteDialog } from "@/components/table/bulk-delete-dialog";
import { TableFooter, type PaginationInfo } from "@/components/table/table-footer";

interface TemplatesTableProps {
  templates: Template[];
  isLoading: boolean;
  onRowClick: (template: Template) => void;
  onDuplicate: (template: Template) => void;
  onDelete: (id: number) => void;
  onDeleteSelected: (ids: number[]) => boolean | void | Promise<boolean | void>;
  isDeletingSelected?: boolean;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
}

export function TemplatesTable({
  templates,
  isLoading,
  onRowClick,
  onDuplicate,
  onDelete,
  onDeleteSelected,
  isDeletingSelected,
  pagination,
  onPageChange,
}: TemplatesTableProps) {
  const visibleIds = useMemo(() => templates.map((t) => t.id), [templates]);
  const selection = useBulkSelection(visibleIds);
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
      <div className="border border-slate-200 dark:border-neutral-800 rounded-md bg-white dark:bg-neutral-950 shadow-none overflow-hidden">
        <BulkSelectionBar
          selectedCount={selection.selectedCount}
          label="template"
          onClear={selection.clearSelection}
          onDeleteSelected={() => setBulkDeleteOpen(true)}
          isDeleting={isDeletingSelected}
        />
        <BulkDeleteDialog
          isOpen={bulkDeleteOpen}
          label="template"
          count={selection.selectedCount}
          isPending={isDeletingSelected}
          onClose={() => setBulkDeleteOpen(false)}
          onConfirm={handleConfirmBulkDelete}
        />
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-transparent">
              <BulkSelectHeaderCell
                className="h-11"
                checked={selection.allVisibleSelected}
                indeterminate={selection.someVisibleSelected}
                disabled={isLoading || templates.length === 0}
                onCheckedChange={selection.toggleVisible}
              />
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Template Name
              </TableHead>
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Type
              </TableHead>
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Created By
              </TableHead>
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Last Edited
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
            ) : templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-400 text-sm">
                  No templates found.
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TemplateTableRow
                  key={template.id}
                  template={template}
                  onRowClick={onRowClick}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  isSelected={selection.selectedIds.has(template.id)}
                  onSelectedChange={(checked) => selection.toggleOne(template.id, checked)}
                />
              ))
            )}
          </TableBody>
        </Table>

        <TableFooter
          isLoading={isLoading}
          label="template"
          pagination={pagination}
          count={templates.length}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
