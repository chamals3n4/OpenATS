"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Trash2Icon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type RowId = string | number;

// Dark border and pointer so the box is easy to see
const SELECT_BOX =
  "size-[18px] cursor-pointer rounded-[4px] border-slate-400 bg-white shadow-none hover:border-slate-600 disabled:cursor-not-allowed dark:border-neutral-500 dark:bg-neutral-900 dark:hover:border-neutral-300";

/** Class for extra buttons in the selection bar */
export const BULK_BAR_BUTTON = "h-8 rounded-md px-3 text-[13px] font-semibold shadow-none";

export function useBulkSelection<T extends RowId>(visibleIds: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<T>>(() => new Set());

  const visibleIdSet = useMemo(() => new Set(visibleIds), [visibleIds]);

  const selectedVisibleIds = useMemo(
    () => visibleIds.filter((id) => selectedIds.has(id)),
    [selectedIds, visibleIds],
  );

  const selectedCount = selectedIds.size;
  const visibleSelectedCount = selectedVisibleIds.length;
  const hasVisibleRows = visibleIds.length > 0;
  const allVisibleSelected =
    hasVisibleRows && visibleSelectedCount === visibleIds.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  const toggleOne = useCallback((id: T, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const toggleVisible = useCallback(
    (checked: boolean) => {
      setSelectedIds((current) => {
        const next = new Set(current);
        if (checked) {
          visibleIds.forEach((id) => next.add(id));
        } else {
          visibleIds.forEach((id) => next.delete(id));
        }
        return next;
      });
    },
    [visibleIds],
  );

  const replaceSelection = useCallback((ids: T[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const pruneHiddenSelection = useCallback(() => {
    setSelectedIds((current) => {
      const next = new Set<T>();
      current.forEach((id) => {
        if (visibleIdSet.has(id)) next.add(id);
      });
      return next;
    });
  }, [visibleIdSet]);

  return {
    selectedIds,
    selectedCount,
    visibleSelectedCount,
    allVisibleSelected,
    someVisibleSelected,
    toggleOne,
    toggleVisible,
    replaceSelection,
    clearSelection,
    pruneHiddenSelection,
  };
}

export function BulkSelectHeaderCell({
  checked,
  indeterminate,
  disabled,
  onCheckedChange,
  className,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <TableHead className={cn("h-10 w-11 px-4", className)}>
      <Checkbox
        aria-label="Select visible rows"
        checked={checked}
        indeterminate={indeterminate}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className={SELECT_BOX}
      />
    </TableHead>
  );
}

export function BulkSelectRowCell({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <TableCell
      className={cn("h-10 w-11 px-4 py-0", className)}
      onClick={(event) => event.stopPropagation()}
    >
      <Checkbox
        aria-label="Select row"
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={SELECT_BOX}
      />
    </TableCell>
  );
}

export function BulkSelectionBar({
  selectedCount,
  label,
  onClear,
  children,
  onDeleteSelected,
  isDeleting,
}: {
  selectedCount: number;
  label: string;
  onClear: () => void;
  children?: ReactNode;
  onDeleteSelected?: () => void;
  isDeleting?: boolean;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-300 bg-slate-50 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-900/80">
      <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-800 dark:text-neutral-100">
        <span>
          {selectedCount} {label}
          {selectedCount === 1 ? "" : "s"} selected
        </span>
        <Button
          type="button"
          variant="ghost"
          onClick={onClear}
          className={cn(
            BULK_BAR_BUTTON,
            "cursor-pointer gap-1.5 px-2 font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50",
          )}
        >
          <XIcon className="size-3.5" />
          Clear
        </Button>
      </div>
      <div className="flex items-center gap-2">
        {children}
        {onDeleteSelected ? (
          <Button
            type="button"
            variant="destructive"
            onClick={onDeleteSelected}
            disabled={isDeleting}
            className={cn(BULK_BAR_BUTTON, "cursor-pointer gap-1.5")}
          >
            <Trash2Icon className="size-3.5" />
            {isDeleting ? "Deleting..." : "Delete selected"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
