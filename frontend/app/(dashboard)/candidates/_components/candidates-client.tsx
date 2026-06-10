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

export default function CandidatesPageClient() {
  const router = useRouter();

  // ── Filter State ───────────────────────────────────────────
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>();
  const [selectedStatus, setSelectedStatus] =
    useState<CandidateStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ── Data ───────────────────────────────────────────────────
  const { data: candidatesData, isLoading } = useCandidates(selectedJobId, {
    search: debouncedSearch || undefined,
    status: selectedStatus === "all" ? undefined : selectedStatus,
  });
  const { data: jobsData } = useJobs();

  const candidates = candidatesData?.data ?? [];
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
      {
        id: editTarget.id,
        formData: buildUpdateFormData(editForm),
      },
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
  }, []);

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      <div className="px-8 py-4 flex items-center justify-between">
        <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Manage Candidates
        </h1>
      </div>

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

      <CandidatesTable
        candidates={candidates}
        isLoading={isLoading}
        onRowClick={handleRowClick}
        onEdit={openEditDialog}
        onDelete={setDeleteTarget}
      />

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
