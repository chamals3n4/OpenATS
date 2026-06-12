"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { Template } from "@/types";
import { getTypeMeta, formatDate } from "../lib/templates-utils";

interface TemplateTableRowProps {
  template: Template;
  onRowClick: (template: Template) => void;
  onDuplicate: (template: Template) => void;
  onDelete: (id: number) => void;
}

export function TemplateTableRow({
  template,
  onRowClick,
  onDuplicate,
  onDelete,
}: TemplateTableRowProps) {
  const meta = getTypeMeta(template.type);

  return (
    <TableRow
      onClick={() => onRowClick(template)}
      className="border-b border-slate-300 dark:border-neutral-700 last:border-0 font-medium cursor-pointer hover:bg-slate-50/50 dark:hover:bg-neutral-900/50"
    >
      <TableCell className="h-11 px-6 py-0 text-[13px]">
        <span className="text-slate-700 dark:text-neutral-300 font-medium">
          {template.name}
        </span>
      </TableCell>
      <TableCell className="h-11 px-6 py-0 text-[13px]">
        <span
          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${meta.badge}`}
        >
          {meta.label}
        </span>
      </TableCell>
      <TableCell className="h-11 px-6 py-0 text-[13px] text-slate-600 dark:text-neutral-400 font-normal">
        System
      </TableCell>
      <TableCell className="h-11 px-6 py-0 text-[13px] text-slate-600 dark:text-neutral-400 font-normal">
        {formatDate(template.updatedAt)}
      </TableCell>
      <TableCell
        className="h-11 px-6 py-0 text-[13px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            className="h-7 rounded-md border border-slate-300 dark:border-neutral-600 bg-transparent hover:bg-slate-50 dark:hover:bg-neutral-900/50 px-2.5 text-[13px] gap-1.5 font-semibold leading-none text-slate-700 dark:text-neutral-300 shadow-none cursor-pointer"
            onClick={() => onDuplicate(template)}
          >
            Duplicate
          </Button>
          <Button
            size="sm"
            className="h-7 rounded-md border-none bg-red-500 px-2.5 text-[13px] gap-1.5 font-semibold leading-none text-white shadow-none hover:bg-red-500 cursor-pointer"
            onClick={() => onDelete(template.id)}
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-3" />
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
