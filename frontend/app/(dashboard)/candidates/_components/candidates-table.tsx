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
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Candidate } from "@/types";
import { CandidateTableRow } from "./candidate-table-row";

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CandidatesTableProps {
  candidates: Candidate[];
  isLoading: boolean;
  onRowClick: (candidate: Candidate) => void;
  onEdit: (candidate: Candidate) => void;
  onDelete: (candidate: Candidate) => void;
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
}

export function CandidatesTable({
  candidates,
  isLoading,
  onRowClick,
  onEdit,
  onDelete,
  pagination,
  onPageChange,
}: CandidatesTableProps) {
  const showPagination =
    pagination && pagination.totalPages > 1 && onPageChange;

  const rangeStart = pagination
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const rangeEnd = pagination
    ? Math.min(pagination.page * pagination.limit, pagination.total)
    : candidates.length;

  return (
    <div className="px-6 py-4">
      <div className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-none dark:border-neutral-700 dark:bg-neutral-900">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-transparent">
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Candidate Name
              </TableHead>
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Stage
              </TableHead>
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Applied for
              </TableHead>
              <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Applied on
              </TableHead>
              <TableHead className="h-11 px-6 w-40 text-right font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <ListSectionSpinner />
                </TableCell>
              </TableRow>
            ) : candidates.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-slate-400 text-sm"
                >
                  No candidates found.
                </TableCell>
              </TableRow>
            ) : (
              candidates.map((candidate) => (
                <CandidateTableRow
                  key={candidate.id}
                  candidate={candidate}
                  onRowClick={onRowClick}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            )}
          </TableBody>
        </Table>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-2.5 border-t border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          {/* Result count */}
          <span className="text-sm font-medium text-slate-400 dark:text-neutral-500">
            {isLoading ? (
              "Loading..."
            ) : pagination ? (
              <>
                {rangeStart}–{rangeEnd}{" "}
                <span className="text-slate-300 dark:text-neutral-600">of</span>{" "}
                {pagination.total} candidate{pagination.total !== 1 ? "s" : ""}
              </>
            ) : (
              `${candidates.length} result${candidates.length !== 1 ? "s" : ""}`
            )}
          </span>

          {/* Pagination controls */}
          {showPagination && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <PageNumbers
                current={pagination.page}
                total={pagination.totalPages}
                onPageChange={onPageChange}
              />

              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page number buttons with ellipsis ─────────────────────────────────────────

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
    <div className="flex items-center gap-1">
      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`ellipsis-${i}`}
            className="inline-flex items-center justify-center h-8 w-8 text-sm text-slate-400 dark:text-neutral-500 select-none"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={`inline-flex items-center justify-center h-8 w-8 rounded-md text-sm font-medium transition-colors
              ${
                p === current
                  ? "bg-slate-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800"
              }`}
          >
            {p}
          </button>
        ),
      )}
    </div>
  );
}

/** Returns a window like: 1 … 4 5 6 … 12 */
function buildPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];
  const addPage = (p: number) => pages.push(p);
  const addEllipsis = () => {
    if (pages[pages.length - 1] !== "...") pages.push("...");
  };

  addPage(1);

  if (current > 3) addEllipsis();

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) addPage(p);

  if (current < total - 2) addEllipsis();

  addPage(total);

  return pages;
}
