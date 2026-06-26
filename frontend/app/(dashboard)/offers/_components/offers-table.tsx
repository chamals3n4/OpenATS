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
import type { Offer } from "@/types";
import { useIsManager } from "@/hooks/use-role";
import { OfferTableRow } from "./offer-table-row";
import {
  BulkSelectHeaderCell,
  BulkSelectionBar,
  useBulkSelection,
} from "@/components/table/bulk-selection";
import { BulkDeleteDialog } from "@/components/table/bulk-delete-dialog";
import { TableFooter, type PaginationInfo } from "@/components/table/table-footer";

interface OffersTableProps {
  offers: Offer[];
  isLoading: boolean;
  onRowClick: (offer: Offer) => void;
  onDelete: (offer: Offer) => void;
  onDeleteSelected: (ids: number[]) => boolean | void | Promise<boolean | void>;
  isDeletingSelected?: boolean;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
}

export function OffersTable({
  offers,
  isLoading,
  onRowClick,
  onDelete,
  onDeleteSelected,
  isDeletingSelected,
  pagination,
  onPageChange,
}: OffersTableProps) {
  const isManager = useIsManager();
  const visibleOfferIds = useMemo(() => offers.map((offer) => offer.id), [offers]);
  const selection = useBulkSelection(visibleOfferIds);
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
      <div className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-none dark:border-neutral-700 dark:bg-neutral-900">
        <BulkSelectionBar
          selectedCount={selection.selectedCount}
          label="offer"
          onClear={selection.clearSelection}
          onDeleteSelected={isManager ? () => setBulkDeleteOpen(true) : undefined}
          isDeleting={isDeletingSelected}
        />
        <BulkDeleteDialog
          isOpen={bulkDeleteOpen}
          label="offer"
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
                disabled={isLoading || offers.length === 0}
                onCheckedChange={selection.toggleVisible}
              />
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Candidate Name
              </TableHead>
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Status
              </TableHead>
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Applied for
              </TableHead>
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Salary
              </TableHead>
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Sent on
              </TableHead>
              <TableHead className="h-11 px-6 w-40 text-right font-semibold text-slate-900 dark:text-neutral-100 text-sm">
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
            ) : offers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-slate-400 text-sm"
                >
                  No offers found.
                </TableCell>
              </TableRow>
            ) : (
              offers.map((offer) => (
                <OfferTableRow
                  key={offer.id}
                  offer={offer}
                  onRowClick={onRowClick}
                  onDelete={onDelete}
                  isSelected={selection.selectedIds.has(offer.id)}
                  onSelectedChange={(checked) =>
                    selection.toggleOne(offer.id, checked)
                  }
                />
              ))
            )}
          </TableBody>
        </Table>

        <TableFooter
          isLoading={isLoading}
          label="offer"
          pagination={pagination}
          count={offers.length}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
