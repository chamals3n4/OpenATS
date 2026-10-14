"use client";

import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useBulkDeleteCandidates,
  useBulkRejectCandidates,
  useCandidates,
  useDeleteCandidate,
  useUpdateCandidateBasicDetails,
} from "@/hooks/queries/use-candidates";
import { toast } from "sonner";
import { useJobs } from "@/hooks/queries/use-jobs";
import type { Candidate } from "@/types";
import { CandidateFilters } from "./candidate-filters";
import {
  readStoredFilters,
  subscribeStoredFilters,
  writeStoredFilters,
} from "../_lib/candidate-filter-storage";
import {
  EMPTY_FILTERS,
  hasFilterParams,
  parseFilterState,
  resolveFilterState,
  toFilterParams,
  type CandidateFilterState,
} from "../_lib/candidate-filter-state";
import { useCurrentUser } from "@/hooks/queries/use-user";
import { CandidatesTable } from "./candidates-table";
import { CandidateEditDialog } from "./candidate-edit-dialog";
import { CandidateDeleteDialog } from "./candidate-delete-dialog";
import {
  createEmptyFormData,
  candidateToFormData,
  buildUpdateFormData,
} from "../_lib/candidate-types";

const PAGE_LIMIT = 15;

export default function CandidatesPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filters are kept in the URL and in the browser. Search is local
  const stored = useSyncExternalStore(subscribeStoredFilters, readStoredFilters, () => null);
  // Don't fetch until saved filters are loaded
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const filters = useMemo(
    () => resolveFilterState(new URLSearchParams(searchParams.toString()), stored),
    [searchParams, stored],
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data: me } = useCurrentUser();
  const isInterviewer = me?.data?.role === "interviewer";

  // Save filters from a shared link too
  useEffect(() => {
    const url = new URLSearchParams(searchParams.toString());
    if (hasFilterParams(url)) writeStoredFilters(toFilterParams(parseFilterState(url)).toString());
  }, [searchParams]);

  const setFilters = useCallback(
    (next: CandidateFilterState) => {
      const query = toFilterParams(next).toString();
      writeStoredFilters(query);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      setPage(1);
    },
    [router, pathname],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 150);
    return () => clearTimeout(t);
  }, [search]);

  const selectedJobId = filters.jobId;
  const selectedStatus = filters.status;
  // Ignore score filters for interviewers
  const scoreFilter = isInterviewer ? undefined : filters.minScore;
  const onlyFullyScored = isInterviewer ? false : filters.fullyScored;
  const hasScoreFilters =
    scoreFilter !== undefined ||
    onlyFullyScored ||
    filters.flag !== "any" ||
    filters.minExperience !== undefined;

  // ── Data ───────────────────────────────────────────────────
  const { data: candidatesData, isLoading } = useCandidates(selectedJobId, {
    search: debouncedSearch || undefined,
    status: selectedStatus === "all" ? undefined : selectedStatus,
    sort: filters.sort === "score" ? "score" : undefined,
    minScore: scoreFilter,
    flag: filters.flag === "any" ? undefined : filters.flag,
    fullyScored: onlyFullyScored || undefined,
    minExperience: filters.minExperience,
    page,
    limit: PAGE_LIMIT,
  }, { enabled: hydrated });
  const { data: jobsData } = useJobs();

  const candidates = candidatesData?.data ?? [];
  const pagination = candidatesData?.pagination;
  const jobs = jobsData?.data ?? [];

  // ── Delete ─────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null);
  const deleteMutation = useDeleteCandidate();
  const bulkDeleteMutation = useBulkDeleteCandidates();

  const handleDeleteSelected = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return false;
      try {
        // The server takes at most 200 at a time.
        let count = 0;
        for (let start = 0; start < ids.length; start += 200) {
          const { data } = await bulkDeleteMutation.mutateAsync({
            candidateIds: ids.slice(start, start + 200),
          });
          count += data.count;
        }
        toast.success(`Deleted ${count} ${count === 1 ? "candidate" : "candidates"}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete the candidates");
        return false;
      }
    },
    [bulkDeleteMutation],
  );

  const bulkRejectMutation = useBulkRejectCandidates();
  const handleRejectSelected = useCallback(
    async (ids: number[], reason: string) => {
      try {
        const { data } = await bulkRejectMutation.mutateAsync({ candidateIds: ids, reason });
        if (data.failed.length > 0) {
          toast.error(`Rejected ${data.rejected.length}, but ${data.failed.length} could not be rejected`);
          // Keep only the failed ones selected
          return data.failed.map((f) => f.id);
        }
        toast.success(`Rejected ${data.rejected.length} ${data.rejected.length === 1 ? "candidate" : "candidates"}`);
      } catch {
        toast.error("Failed to reject the candidates");
        return false;
      }
    },
    [bulkRejectMutation],
  );

  const handleDeleteAllMatchingCandidates = useCallback(async () => {
    const total = pagination?.total ?? 0;
    // Only within one job
    if (total === 0 || selectedJobId === undefined) return false;
    try {
      const { data } = await bulkDeleteMutation.mutateAsync({
        jobId: selectedJobId,
        search: debouncedSearch || undefined,
        status: selectedStatus === "all" ? undefined : selectedStatus,
        // Server deletes nothing if the count changed
        expectedCount: total,
      });
      toast.success(`Deleted ${data.count} ${data.count === 1 ? "candidate" : "candidates"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete the candidates");
      return false;
    }
  }, [
    bulkDeleteMutation,
    debouncedSearch,
    pagination?.total,
    selectedJobId,
    selectedStatus,
  ]);

  const selectionScopeKey = useMemo(
    () =>
      `${selectedJobId ?? "all"}|${selectedStatus}|${debouncedSearch}|${filters.sort}|${scoreFilter ?? ""}|${filters.flag}|${onlyFullyScored}|${filters.minExperience ?? ""}`,
    [debouncedSearch, selectedJobId, selectedStatus, filters.sort, scoreFilter, filters.flag, onlyFullyScored, filters.minExperience],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteTarget, deleteMutation]);

  // ── Edit ───────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<Candidate | null>(null);
  const [editForm, setEditForm] = useState(createEmptyFormData());
  const updateMutation = useUpdateCandidateBasicDetails();

  const openEditDialog = useCallback((candidate: Candidate) => {
    setEditTarget(candidate);
    setEditForm(candidateToFormData(candidate));
  }, []);

  const handleConfirmUpdate = useCallback(() => {
    if (!editTarget) return;
    updateMutation.mutate(
      { id: editTarget.id, formData: buildUpdateFormData(editForm) },
      {
        onSuccess: () => {
          setEditTarget(null);
          setEditForm(createEmptyFormData());
        },
      },
    );
  }, [editTarget, editForm, updateMutation]);

  const handleRowClick = useCallback(
    (candidate: Candidate) => {
      // Pass filters so Back returns to the same list
      const back = searchParams.toString();
      router.push(`/candidates/${candidate.id}?from=candidates${back ? `&back=${encodeURIComponent(back)}` : ""}`);
    },
    [router, searchParams],
  );

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setFilters(EMPTY_FILTERS);
  }, [setFilters]);

  return (
    // min-h-0 so the inner area can scroll
    <div className="flex flex-1 flex-col min-h-0 bg-white dark:bg-neutral-950">
      {/* Fixed header — never scrolls away */}
      <div className="flex-shrink-0 px-6 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Manage Candidates
        </h1>
      </div>

      {/* Fixed filters bar — never scrolls away */}
      <div className="flex-shrink-0">
        <CandidateFilters
          search={search}
          onSearchChange={handleSearchChange}
          jobs={jobs}
          value={filters}
          onChange={setFilters}
          hideScoreFilters={isInterviewer}
          onClear={handleClearFilters}
        />
      </div>

      {/* Scrollable table area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <CandidatesTable
          key={selectionScopeKey}
          candidates={candidates}
          isLoading={isLoading || !hydrated}
          onRowClick={handleRowClick}
          onEdit={openEditDialog}
          onDelete={setDeleteTarget}
          pagination={pagination}
          onPageChange={setPage}
          onDeleteSelected={handleDeleteSelected}
          // Delete all only works with one job and simple filters
          onDeleteAllMatching={
            hasScoreFilters || selectedJobId === undefined
              ? undefined
              : handleDeleteAllMatchingCandidates
          }
          isDeletingSelected={
            deleteMutation.isPending || bulkDeleteMutation.isPending
          }
          onRejectSelected={handleRejectSelected}
          isRejectingSelected={bulkRejectMutation.isPending}
        />
      </div>

      <CandidateEditDialog
        candidate={editTarget}
        formData={editForm}
        onFormChange={setEditForm}
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onConfirm={handleConfirmUpdate}
        isPending={updateMutation.isPending}
      />

      <CandidateDeleteDialog
        candidate={deleteTarget}
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
