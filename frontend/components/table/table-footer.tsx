"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface TableFooterProps {
  isLoading?: boolean;
  label: string;
  /** Pass pagination when server-side pagination is active */
  pagination?: PaginationInfo;
  /** Pass raw count when there is no server-side pagination */
  count?: number;
  onPageChange?: (page: number) => void;
}

export function TableFooter({
  isLoading,
  label,
  pagination,
  count,
  onPageChange,
}: TableFooterProps) {
  const showPagination = !!pagination && pagination.totalPages > 1 && !!onPageChange;

  const rangeStart = pagination ? (pagination.page - 1) * pagination.limit + 1 : 1;
  const rangeEnd = pagination
    ? Math.min(pagination.page * pagination.limit, pagination.total)
    : (count ?? 0);
  const total = pagination?.total ?? count ?? 0;
  const plural = total === 1 ? label : `${label}s`;

  return (
    <div className="flex items-center justify-between px-6 py-2.5 border-t border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      <span className="text-sm text-slate-400 dark:text-neutral-500">
        {isLoading ? (
          "Loading..."
        ) : total === 0 ? (
          `No ${plural} found`
        ) : pagination ? (
          <>
            <span className="font-medium text-slate-600 dark:text-neutral-300">
              {rangeStart}–{rangeEnd}
            </span>{" "}
            <span className="text-slate-300 dark:text-neutral-600">of</span>{" "}
            <span className="font-medium text-slate-600 dark:text-neutral-300">
              {total}
            </span>{" "}
            {plural}
          </>
        ) : (
          <>
            <span className="font-medium text-slate-600 dark:text-neutral-300">
              {total}
            </span>{" "}
            {plural}
          </>
        )}
      </span>

      {showPagination && (
        <div className="flex items-center gap-1">
          <PaginationButton
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="text-xs">Prev</span>
          </PaginationButton>

          <PageNumbers
            current={pagination.page}
            total={pagination.totalPages}
            onPageChange={onPageChange}
          />

          <PaginationButton
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            aria-label="Next page"
          >
            <span className="text-xs">Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </PaginationButton>
        </div>
      )}
    </div>
  );
}

function PaginationButton({
  children,
  onClick,
  disabled,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-slate-200 dark:border-neutral-700 text-slate-500 dark:text-neutral-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-neutral-800 hover:text-slate-700 dark:hover:text-neutral-200 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

function PageNumbers({
  current,
  total,
  onPageChange,
}: {
  current: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pages = buildPageRange(current, total);

  return (
    <div className="flex items-center gap-0.5">
      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`ellipsis-${i}`}
            className="inline-flex items-center justify-center h-8 w-7 text-xs text-slate-400 dark:text-neutral-500 select-none"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={`inline-flex items-center justify-center h-8 w-8 rounded-md text-xs font-medium transition-colors ${
              p === current
                ? "bg-slate-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "text-slate-500 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-slate-700 dark:hover:text-neutral-200"
            }`}
          >
            {p}
          </button>
        ),
      )}
    </div>
  );
}

function buildPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [];
  const add = (p: number) => pages.push(p);
  const ellipsis = () => { if (pages[pages.length - 1] !== "...") pages.push("..."); };

  add(1);
  if (current > 3) ellipsis();

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) add(p);

  if (current < total - 2) ellipsis();
  add(total);

  return pages;
}
