"use client";

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
import { OfferTableRow } from "./offer-table-row";

interface OffersTableProps {
  offers: Offer[];
  isLoading: boolean;
  onRowClick: (offer: Offer) => void;
  onDelete: (offer: Offer) => void;
}

export function OffersTable({
  offers,
  isLoading,
  onRowClick,
  onDelete,
}: OffersTableProps) {
  return (
    <div className="px-8 py-6">
      <div className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-none dark:border-neutral-700 dark:bg-neutral-900">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-transparent">
              <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Candidate Name
              </TableHead>
              <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Status
              </TableHead>
              <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Applied for
              </TableHead>
              <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Salary
              </TableHead>
              <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Sent on
              </TableHead>
              <TableHead className="h-13 px-4 w-44 text-right font-semibold text-slate-900 dark:text-neutral-100 text-sm">
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
            ) : offers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
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
                />
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between px-8 py-3.5 border-t border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          <span className="text-sm font-medium text-slate-400 dark:text-neutral-500">
            {isLoading
              ? "Loading..."
              : `${offers.length} result${offers.length !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>
    </div>
  );
}
