"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useJobsList, useBulkDeleteJobs, useDeleteJob } from "@/hooks/queries/use-jobs";
import { useDepartments } from "@/hooks/queries/use-company";
import type { Job } from "@/types";
import { JobFilters } from "./job-filters";
import { JobsTable } from "./jobs-table";
import { JobDeleteDialog } from "./job-delete-dialog";

const PAGE_LIMIT = 15;

export function JobsPageClient() {
  const { data: deptData } = useDepartments();
  const departments = deptData?.data ?? [];

  // ── Filter State ───────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { data, isLoading } = useJobsList({
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch || undefined,
    status: filterStatus === "all" ? undefined : filterStatus,
    departmentId: filterDept === "all" ? undefined : parseInt(filterDept),
  });

  const jobs = data?.data ?? [];
  const pagination = data?.pagination;

  // Client-side filter for employment type (not a DB column we search — applied on top of server results)
  const filteredJobs = useMemo(() => {
    if (filterType === "all") return jobs;
    return jobs.filter((j) => j.employmentType === filterType);
  }, [jobs, filterType]);

  const departmentNameById = useMemo(() => {
    const map = new Map<number, string>();
    departments.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [departments]);

  // ── Delete ─────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
  const deleteMutation = useDeleteJob();
  const bulkDeleteMutation = useBulkDeleteJobs();

  const handleDeleteSelected = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return false;
      await bulkDeleteMutation.mutateAsync(ids);
    },
    [bulkDeleteMutation],
  );

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const resetPage = () => setPage(1);

  const handleSearchChange = useCallback((v: string) => { setSearchTerm(v); resetPage(); }, []);
  const handleDeptChange = useCallback((v: string) => { setFilterDept(v); resetPage(); }, []);
  const handleTypeChange = useCallback((v: string) => { setFilterType(v); resetPage(); }, []);
  const handleStatusChange = useCallback((v: string) => { setFilterStatus(v); resetPage(); }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setFilterDept("all");
    setFilterType("all");
    setFilterStatus("all");
    setPage(1);
  }, []);

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      <div className="px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Manage Jobs
        </h1>
      </div>

      <JobFilters
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        filterDept={filterDept}
        onDeptChange={handleDeptChange}
        filterType={filterType}
        onTypeChange={handleTypeChange}
        filterStatus={filterStatus}
        onStatusChange={handleStatusChange}
        departments={departments}
        departmentNameById={departmentNameById}
        onClear={handleClearFilters}
      />

      <JobsTable
        jobs={filteredJobs}
        departmentNameById={departmentNameById}
        isLoading={isLoading}
        onDelete={setDeleteTarget}
        onDeleteSelected={handleDeleteSelected}
        isDeletingSelected={bulkDeleteMutation.isPending}
        pagination={pagination}
        onPageChange={setPage}
      />

      <JobDeleteDialog
        job={deleteTarget}
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
