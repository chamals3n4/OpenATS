"use client";

import { RowDeleteButton, RowEditButton } from "@/components/table/row-actions";
import { TableRow, TableCell } from "@/components/ui/table";
import type { Template } from "@/types";
import { getTypeMeta, formatDate } from "../lib/templates-utils";
import { BulkSelectRowCell } from "@/components/table/bulk-selection";
import { useIsManager } from "@/hooks/use-role";

interface TemplateTableRowProps {
  template: Template;
  onRowClick: (template: Template) => void;
  onDuplicate: (template: Template) => void;
  onDelete: (id: number) => void;
  isSelected?: boolean;
  onSelectedChange?: (checked: boolean) => void;
}

export function TemplateTableRow({
  template,
  onRowClick,
  onDuplicate,
  onDelete,
  isSelected = false,
  onSelectedChange,
}: TemplateTableRowProps) {
  const isManager = useIsManager();
  const meta = getTypeMeta(template.type);

  return (
    <TableRow
      onClick={() => onRowClick(template)}
      className="border-b border-slate-300 dark:border-neutral-700 last:border-0 font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors"
    >
      {onSelectedChange && (
        <BulkSelectRowCell checked={isSelected} onCheckedChange={onSelectedChange} />
      )}
      <TableCell className="h-12 px-6 py-0">
        <span className="text-slate-900 dark:text-neutral-100 font-medium">
          {template.name}
        </span>
      </TableCell>
      <TableCell className="h-12 px-6 py-0">
        <span
          className={`text-[13px] font-semibold px-2.5 py-0.5 rounded-full ${meta.badge}`}
        >
          {meta.label}
        </span>
      </TableCell>
      <TableCell className="h-12 px-6 py-0 text-slate-800 dark:text-neutral-200 font-normal">
        System
      </TableCell>
      <TableCell className="h-12 px-6 py-0 text-slate-800 dark:text-neutral-200 font-normal">
        {formatDate(template.updatedAt)}
      </TableCell>
      <TableCell
        className="h-12 px-6 py-0"
        onClick={(e) => e.stopPropagation()}
      >
        {isManager && (
          <div className="flex items-center justify-end gap-2">
            <RowEditButton onClick={() => onDuplicate(template)}>Duplicate</RowEditButton>
            <RowDeleteButton onClick={() => onDelete(template.id)} />
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
