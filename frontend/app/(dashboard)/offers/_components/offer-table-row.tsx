"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BulkSelectRowCell } from "@/components/table/bulk-selection";
import type { Offer } from "@/types";
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
  offer: Offer;
  onRowClick: (offer: Offer) => void;
  onDelete: (offer: Offer) => void;
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
      <TableCell className="h-10 px-6 py-0 text-slate-700 dark:text-neutral-300 font-medium">
        {getCandidateName(offer as any)}
      </TableCell>
      <TableCell className="h-10 px-6 py-0">
        <Badge
          className={`${bg} ${text} hover:${bg} border-none shadow-none font-medium px-2 py-0.5 rounded-full text-xs`}
        >
          {capitalizeStatus(offer.status)}
        </Badge>
      </TableCell>
      <TableCell className="h-10 px-6 py-0 text-slate-600 dark:text-neutral-400 font-normal">
        {getJobTitle(offer as any)}
      </TableCell>
      <TableCell className="h-10 px-6 py-0 text-slate-600 dark:text-neutral-400 font-normal">
        {fmtSalary(offer)}
      </TableCell>
      <TableCell className="h-10 px-6 py-0 text-slate-600 dark:text-neutral-400 font-normal">
        {fmtDate(offer.sentAt)}
      </TableCell>
      <TableCell
        className="h-10 px-6 py-0"
        onClick={(e) => e.stopPropagation()}
      >
        {isManager && (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              className="h-8 rounded-md border-none bg-red-500 px-4 text-sm font-semibold leading-none text-white shadow-none hover:bg-red-500 cursor-pointer"
              onClick={() => onDelete(offer)}
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-3.5 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
