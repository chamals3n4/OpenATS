"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useCandidates,
  useDeleteCandidate,
  useUpdateCandidateBasicDetails,
} from "@/hooks/queries/use-candidates";
import { useJobs } from "@/hooks/queries/use-jobs";
import type { Candidate } from "@/types";
import { CandidateFilters } from "./candidate-filters";
import { CandidatesTable } from "./candidates-table";
import { CandidateEditDialog } from "./candidate-edit-dialog";
import { CandidateDeleteDialog } from "./candidate-delete-dialog";
import {
  createEmptyFormData,
  candidateToFormData,
  buildUpdateFormData,
} from "../libs/candidate-types";
import { CandidateStatusFilter } from "../libs/candidate-utils";

const PAGE_LIMIT = 15;

export default function CandidatesPageClient() {
  const router = useRouter();

  // ── Filter State ───────────────────────────────────────────
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>();
  const [selectedStatus, setSelectedStatus] =
    useState<CandidateStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedJobId, selectedStatus]);

  // ── Data ───────────────────────────────────────────────────
  const { data: candidatesData, isLoading } = useCandidates(selectedJobId, {
    search: debouncedSearch || undefined,
    status: selectedStatus === "all" ? undefined : selectedStatus,
    page,
    limit: PAGE_LIMIT,
  });
  const { data: jobsData } = useJobs();

  const candidates = candidatesData?.data ?? [];
  const pagination = candidatesData?.pagination;
  const jobs = jobsData?.data ?? [];

  // ── Delete ─────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null);
  const deleteMutation = useDeleteCandidate();

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
      router.push(`/candidates/${candidate.id}?from=candidates`);
    },
    [router],
  );

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setSelectedJobId(undefined);
    setSelectedStatus("all");
    setPage(1);
  }, []);

  return (
    // min-h-0 lets this flex child shrink below its content size so the
    // parent dashboard layout (which is already h-screen / overflow-hidden)
    // can contain it properly and the inner scroll area works.
    <div className="flex flex-1 flex-col min-h-0 bg-white dark:bg-neutral-950">
      {/* Fixed header — never scrolls away */}
      <div className="flex-shrink-0 px-8 py-4 flex items-center justify-between">
        <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Manage Candidates
        </h1>
      </div>

      {/* Fixed filters bar — never scrolls away */}
      <div className="flex-shrink-0">
        <CandidateFilters
          search={search}
          onSearchChange={setSearch}
          selectedJobId={selectedJobId}
          onJobChange={setSelectedJobId}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          jobs={jobs}
          onClear={handleClearFilters}
        />
      </div>

      {/* Scrollable table area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <CandidatesTable
          candidates={candidates}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          onEdit={openEditDialog}
          onDelete={setDeleteTarget}
          pagination={pagination}
          onPageChange={setPage}
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
