"use client";

import { useState, useMemo } from "react";
import { useJobs, useDeleteJob } from "@/hooks/queries/use-jobs";
import { useDepartments } from "@/hooks/queries/use-company";
import type { Job } from "@/types";
import { JobFilters } from "./job-filters";
import { JobsTable } from "./jobs-table";
import { JobDeleteDialog } from "./job-delete-dialog";
import { ListSectionSpinner } from "@/components/dashboard-main-loading";

export function JobsPageClient() {
  const { data, isLoading } = useJobs();
  const { data: deptData } = useDepartments();
  const deleteMutation = useDeleteJob();

  const jobs = data?.data ?? [];
  const departments = deptData?.data ?? [];

  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);

  const departmentNameById = useMemo(() => {
    const map = new Map<number, string>();
    departments.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [departments]);

  const filteredJobs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesDept =
        filterDept === "all" || String(job.departmentId) === filterDept;
      const matchesType =
        filterType === "all" || job.employmentType === filterType;
      const matchesStatus =
        filterStatus === "all" || job.status === filterStatus;

      if (!q) return matchesDept && matchesType && matchesStatus;

      const deptName =
        departmentNameById.get(job.departmentId)?.toLowerCase() ?? "";

      const matchesSearch =
        job.title.toLowerCase().includes(q) ||
        (job.location ?? "").toLowerCase().includes(q) ||
        deptName.includes(q);

      return matchesDept && matchesType && matchesStatus && matchesSearch;
    });
  }, [
    jobs,
    searchTerm,
    filterDept,
    filterType,
    filterStatus,
    departmentNameById,
  ]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterDept("all");
    setFilterType("all");
    setFilterStatus("all");
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
        <div className="px-6 py-3">
          <h1 className="text-xl font-medium text-slate-900 dark:text-neutral-100">
            Manage Jobs
          </h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <ListSectionSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      {/* Header */}
      <div className="px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Manage Jobs
        </h1>
        {/* Create button stays here or move to JobFilters — your call */}
      </div>

      <JobFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterDept={filterDept}
        onDeptChange={setFilterDept}
        filterType={filterType}
        onTypeChange={setFilterType}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
        departments={departments}
        departmentNameById={departmentNameById}
        onClear={handleClearFilters}
      />

      <JobsTable
        jobs={filteredJobs}
        departmentNameById={departmentNameById}
        onDelete={setDeleteTarget}
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
