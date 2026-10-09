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
} from "../lib/candidate-filter-storage";
import {
  EMPTY_FILTERS,
  hasFilterParams,
  parseFilterState,
  resolveFilterState,
  toFilterParams,
  type CandidateFilterState,
} from "../lib/candidate-filter-state";
import { useCurrentUser } from "@/hooks/queries/use-user";
import { CandidatesTable } from "./candidates-table";
import { CandidateEditDialog } from "./candidate-edit-dialog";
import { CandidateDeleteDialog } from "./candidate-delete-dialog";
import {
  createEmptyFormData,
  candidateToFormData,
  buildUpdateFormData,
} from "../lib/candidate-types";

const PAGE_LIMIT = 15;

export default function CandidatesPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Filter State ───────────────────────────────────────────
  // The position and the other filters live in the address, and are also saved in the browser. So
  // they are still there after opening a candidate, after a reload, after visiting another page
  // and coming back, and in a link you share. Only search is local.
  const stored = useSyncExternalStore(subscribeStoredFilters, readStoredFilters, () => null);
  // False while the page is first drawn on the server and hydrated, so nothing is fetched until
  // the saved filters have been read, rather than fetching the whole list and then the filtered one.
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

  // Filters that arrive in the address (a shared link) become the saved ones too.
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
  // Interviewers cannot use the score filters, so a stale value in the address is ignored for them.
  const scoreFilter = isInterviewer ? undefined : filters.minScore;
  const onlyFullyScored = isInterviewer ? false : filters.fullyScored;
  const hasScoreFilters = scoreFilter !== undefined || onlyFullyScored || filters.flag !== "any";

  // ── Data ───────────────────────────────────────────────────
  const { data: candidatesData, isLoading } = useCandidates(selectedJobId, {
    search: debouncedSearch || undefined,
    status: selectedStatus === "all" ? undefined : selectedStatus,
    sort: filters.sort === "score" ? "score" : undefined,
    minScore: scoreFilter,
    flag: filters.flag === "any" ? undefined : filters.flag,
    fullyScored: onlyFullyScored || undefined,
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
      await Promise.all(ids.map((id) => deleteMutation.mutateAsync(id)));
    },
    [deleteMutation],
  );

  const bulkRejectMutation = useBulkRejectCandidates();
  const handleRejectSelected = useCallback(
    async (ids: number[], reason: string) => {
      try {
        const { data } = await bulkRejectMutation.mutateAsync({ candidateIds: ids, reason });
        if (data.failed.length > 0) {
          toast.error(`Rejected ${data.rejected.length}, but ${data.failed.length} could not be rejected`);
          // Only the ones that failed stay selected, so a retry cannot hit the rest again.
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
    if (total === 0) return false;
    await bulkDeleteMutation.mutateAsync({
      jobId: selectedJobId,
      search: debouncedSearch || undefined,
      status: selectedStatus === "all" ? undefined : selectedStatus,
    });
  }, [
    bulkDeleteMutation,
    debouncedSearch,
    pagination?.total,
    selectedJobId,
    selectedStatus,
  ]);

  const selectionScopeKey = useMemo(
    () =>
      `${selectedJobId ?? "all"}|${selectedStatus}|${debouncedSearch}|${filters.sort}|${scoreFilter ?? ""}|${filters.flag}|${onlyFullyScored}`,
    [debouncedSearch, selectedJobId, selectedStatus, filters.sort, scoreFilter, filters.flag, onlyFullyScored],
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
      // The filters ride along, so closing the candidate returns to the same filtered list.
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
    // min-h-0 lets this flex child shrink below its content size so the
    // parent dashboard layout (which is already h-screen / overflow-hidden)
    // can contain it properly and the inner scroll area works.
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
          // "Delete all matching" only knows job, search and status, so with a score or flag filter
          // on it would delete people the list is not showing. Picking rows still works.
          onDeleteAllMatching={hasScoreFilters ? undefined : handleDeleteAllMatchingCandidates}
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
