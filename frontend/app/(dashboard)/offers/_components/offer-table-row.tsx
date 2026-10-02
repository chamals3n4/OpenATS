"use client";

import { RowDeleteButton } from "@/components/table/row-actions";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BulkSelectRowCell } from "@/components/table/bulk-selection";
import type { OfferWithRelations } from "@/types";
import {
  getStatusStyle,
  fmtSalary,
  fmtDate,
  capitalizeStatus,
  getCandidateName,
  getJobTitle,
} from "../lib/offer-utils";
import { useIsManager } from "@/hooks/use-role";

interface OfferTableRowProps {
  offer: OfferWithRelations;
  onRowClick: (offer: OfferWithRelations) => void;
  onDelete: (offer: OfferWithRelations) => void;
  isSelected: boolean;
  onSelectedChange: (checked: boolean) => void;
}

export function OfferTableRow({
  offer,
  onRowClick,
  onDelete,
  isSelected,
  onSelectedChange,
}: OfferTableRowProps) {
  const isManager = useIsManager();
  const { bg, text } = getStatusStyle(offer.status);

  return (
    <TableRow
      data-state={isSelected ? "selected" : undefined}
      className="border-b border-slate-300 dark:border-neutral-700 last:border-0 font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors"
      onClick={() => onRowClick(offer)}
    >
      <BulkSelectRowCell
        checked={isSelected}
        onCheckedChange={onSelectedChange}
      />
      <TableCell className="h-12 px-6 py-0 text-slate-900 dark:text-neutral-100 font-medium">
        {getCandidateName(offer)}
      </TableCell>
      <TableCell className="h-12 px-6 py-0">
        <Badge
          className={`${bg} ${text} hover:${bg} border-none shadow-none font-medium px-2 py-0.5 rounded-full text-[13px]`}
        >
          {capitalizeStatus(offer.status)}
        </Badge>
      </TableCell>
      <TableCell className="h-12 px-6 py-0 text-slate-800 dark:text-neutral-200 font-normal">
        {getJobTitle(offer)}
      </TableCell>
      <TableCell className="h-12 px-6 py-0 text-slate-800 dark:text-neutral-200 font-normal">
        {fmtSalary(offer)}
      </TableCell>
      <TableCell className="h-12 px-6 py-0 text-slate-800 dark:text-neutral-200 font-normal">
        {fmtDate(offer.sentAt)}
      </TableCell>
      <TableCell
        className="h-12 px-6 py-0"
        onClick={(e) => e.stopPropagation()}
      >
        {isManager && (
          <div className="flex items-center justify-end gap-2">
            <RowDeleteButton onClick={() => onDelete(offer)} />
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
