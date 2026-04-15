"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import type { User, PipelineStage, Candidate, CustomQuestion } from "@/types";
import {
  Search01Icon,
  PlusSignIcon,
  PencilEdit01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ThemeButton } from "@/components/theme-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCurrentUser, useDeleteJob, useDepartments, useJobs } from "@/hooks/use-api";
import type { Job } from "@/types";
import { ListSectionSpinner } from "@/components/dashboard-main-loading";

const EMPLOYMENT_TYPE_LABELS: Record<Job["employmentType"], string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

const STATUS_LABELS: Record<Job["status"], string> = {
  draft: "Draft",
  inactive: "Inactive",
  published: "Published",
  closed: "Closed",
  archived: "Archived",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB");
}

export default function ManageJobsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useJobs();
  const { data: meData } = useCurrentUser();
  const me = meData?.data;
  const canCreateJob = !!me && (me.role === "super_admin" || me.role === "hiring_manager");

  // Prefetch all per-job data when hovering a row so every tab on the
  // job detail page renders instantly by the time the user clicks.
  const prefetchJob = useCallback(
    (jobId: number) => {
      void queryClient.prefetchQuery({
        queryKey: ["jobs", jobId, "pipeline"],
        queryFn: () =>
          serverFetch<{ data: PipelineStage[] }>(`/jobs/${jobId}/pipeline`),
      });
      void queryClient.prefetchQuery({
        queryKey: ["jobs", jobId, "team"],
        queryFn: () => serverFetch<{ data: User[] }>(`/jobs/${jobId}/team`),
      });
      void queryClient.prefetchQuery({
        queryKey: ["candidates", jobId, undefined],
        queryFn: () =>
          serverFetch<{ data: Candidate[] }>(`/candidates/jobs/${jobId}`),
        staleTime: 0,
      });
      void queryClient.prefetchQuery({
        queryKey: ["jobs", jobId, "questions"],
        queryFn: () =>
          serverFetch<{ data: CustomQuestion[] }>(`/jobs/${jobId}/questions`),
      });
      void queryClient.prefetchQuery({
        queryKey: ["jobs", jobId, "assessments"],
        queryFn: () =>
          serverFetch<{ data: any[] }>(`/jobs/${jobId}/assessments`),
      });
    },
    [queryClient],
  );
  const { data: deptData } = useDepartments();
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
  const deleteMutation = useDeleteJob();

  const jobs = data?.data ?? [];
  const departments = deptData?.data ?? [];
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const departmentNameById = useMemo(() => {
    const map = new Map<number, string>();
    departments.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [departments]);

  const filteredJobs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesDepartment =
        filterDept === "all" || String(job.departmentId) === filterDept;

      const matchesType =
        filterType === "all" || job.employmentType === filterType;

      const matchesStatus =
        filterStatus === "all" || job.status === filterStatus;

      if (!q) return matchesDepartment && matchesType && matchesStatus;

      const departmentName =
        departmentNameById.get(job.departmentId)?.toLowerCase() ?? "";

      const matchesSearch =
        job.title.toLowerCase().includes(q) ||
        (job.location ?? "").toLowerCase().includes(q) ||
        departmentName.includes(q);

      return matchesDepartment && matchesType && matchesStatus && matchesSearch;
    });
  }, [
    jobs,
    searchTerm,
    filterDept,
    filterType,
    filterStatus,
    departmentNameById,
  ]);

  const confirmDelete = () => {
    if (!deleteTarget) return;

    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
      },
    });
  };

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      <div className="px-8 py-4 flex items-center justify-between">
        <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Manage Jobs
        </h1>
        {canCreateJob && (
          <Button
            render={<Link href="/jobs/new" prefetch />}
            className="bg-theme hover:bg-theme-hover text-white rounded-lg h-10 px-4 flex items-center gap-2 border-none shadow-none text-sm font-medium cursor-pointer"
          >
            <HugeiconsIcon
              icon={PlusSignIcon}
              className="size-4"
              strokeWidth={2.5}
            />
            <span>Create New Job</span>
          </Button>
        )}
      </div>

      <div className="border-y border-slate-300 dark:border-neutral-700 px-8 py-3.5 flex items-center gap-4">
        <div className="relative w-80">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
          />
          <Input
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-10! bg-white dark:bg-neutral-900 border-slate-300 dark:border-neutral-700 shadow-none rounded-lg text-sm placeholder:text-slate-300 dark:placeholder:text-neutral-600"
          />
        </div>
        <Select
          value={filterDept}
          onValueChange={(v) => setFilterDept(v ?? "all")}
        >
          <SelectTrigger className="w-52 h-10! bg-white cursor-pointer dark:bg-neutral-900 border-slate-300 dark:border-neutral-700 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 px-3">
            <SelectValue placeholder="Departments">
              {filterDept === "all"
                ? "All Departments"
                : (departmentNameById.get(Number(filterDept)) ?? "Department")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            align="start"
            alignOffset={0}
            className="-ml-1 w-53 rounded-lg shadow-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
          >
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={String(dept.id)}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterType}
          onValueChange={(v) => setFilterType(v ?? "all")}
        >
          <SelectTrigger className="w-44 h-10! cursor-pointer bg-white dark:bg-neutral-900 border-slate-300 dark:border-neutral-700 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 px-3">
            <SelectValue placeholder="Job Types">
              {filterType === "all"
                ? "All Types"
                : (EMPLOYMENT_TYPE_LABELS[
                    filterType as Job["employmentType"]
                  ] ?? filterType)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            align="start"
            alignOffset={0}
            className="-ml-2  w-45 rounded-lg shadow-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
          >
            <SelectItem value="all">All Types</SelectItem>
            {(
              Object.keys(EMPLOYMENT_TYPE_LABELS) as Job["employmentType"][]
            ).map((type) => (
              <SelectItem key={type} value={type}>
                {EMPLOYMENT_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v ?? "all")}
        >
          <SelectTrigger className="w-44 h-10! bg-white cursor-pointer dark:bg-neutral-900 border-slate-300 dark:border-neutral-700 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 px-3">
            <SelectValue placeholder="Status">
              {filterStatus === "all"
                ? "All Status"
                : (STATUS_LABELS[filterStatus as Job["status"]] ??
                  filterStatus)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            align="start"
            alignOffset={0}
            className="-ml-2 w-45 rounded-lg shadow-lg border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
          >
            <SelectItem value="all">All Status</SelectItem>
            {(Object.keys(STATUS_LABELS) as Job["status"][]).map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          onClick={() => {
            setSearchTerm("");
            setFilterDept("all");
            setFilterType("all");
            setFilterStatus("all");
          }}
          className="text-slate-600 cursor-pointer dark:text-neutral-400 font-medium text-sm h-10 px-4 hover:bg-transparent hover:text-slate-900 dark:hover:text-neutral-100 border-none ml-4"
        >
          Clear All
        </Button>
      </div>

      <div className="px-8 py-6">
        <div className="border border-slate-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 shadow-none overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-transparent">
                <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Job Name
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Job Type
                </TableHead>
                <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Department Name
                </TableHead>
                {/* <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Location
                </TableHead> */}
                <TableHead className="h-13 px-8 font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Created At
                </TableHead>
                <TableHead className="h-13 px-4 w-44 text-right font-semibold text-slate-900 dark:text-neutral-100 text-sm">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <ListSectionSpinner />
                  </TableCell>
                </TableRow>
              ) : filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-slate-400 text-sm"
                  >
                    No jobs found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job) => (
                  <TableRow
                    key={job.id}
                    onClick={() => router.push(`jobs/${job.id}`)}
                    onMouseEnter={() => prefetchJob(job.id)}
                    className="border-b border-slate-300 dark:border-neutral-700 last:border-0 font-medium cursor-pointer"
                  >
                    <TableCell className="h-13 px-8 py-0">
                      <span className="text-slate-700 dark:text-neutral-300 font-medium">
                        {job.title}
                      </span>
                    </TableCell>
                    <TableCell className="h-13 px-8 py-0 text-slate-600 dark:text-neutral-400 font-normal">
                      {EMPLOYMENT_TYPE_LABELS[job.employmentType]}
                    </TableCell>
                    <TableCell className="h-13 px-8 py-0 text-slate-600 dark:text-neutral-400 font-normal">
                      {departmentNameById.get(job.departmentId) ??
                        `Department #${job.departmentId}`}
                    </TableCell>
                    {/* <TableCell className="h-13 px-8 py-0 text-slate-600 dark:text-neutral-400 font-normal">
                      {job.location ?? "—"}
                    </TableCell> */}
                    <TableCell className="h-13 px-8 py-0 text-slate-600 dark:text-neutral-400 font-normal">
                      {formatDate(job.createdAt)}
                    </TableCell>
                    <TableCell
                      className="h-13 px-4 py-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {(me?.role === "super_admin" || (me?.role === "hiring_manager" && me.id === job.createdBy)) && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 rounded-md border-slate-300 cursor-pointer dark:border-neutral-700 text-slate-700 dark:text-neutral-300"
                              onClick={() => router.push(`/jobs/${job.id}/edit`)}
                            >
                              <HugeiconsIcon
                                icon={PencilEdit01Icon}
                                className="size-3.5 mr-1"
                              />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 rounded-md border-red-200 cursor-pointer dark:border-red-900/40 text-red-600 dark:text-red-400"
                              onClick={() => setDeleteTarget(job)}
                            >
                              <HugeiconsIcon
                                icon={Delete02Icon}
                                className="size-3.5 mr-1"
                              />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between px-8 py-3.5 border-t border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            <span className="text-sm font-medium text-slate-400">
              {isLoading
                ? "Loading..."
                : filteredJobs.length === 0
                  ? "Showing 0 of 0 results"
                  : `Showing 1-${filteredJobs.length} of ${filteredJobs.length} results`}
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="h-10 px-6 rounded-lg bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-neutral-100 shadow-none gap-2"
              >
                Previous
              </Button>
              <Button
                className="h-10 px-8 rounded-lg text-white font-semibold text-sm shadow-none transition-all active:scale-[0.98] border-none"
                style={{ backgroundColor: "var(--theme-color)" }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="max-w-sm rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[19px] font-semibold text-slate-900 dark:text-neutral-100">
              Delete this job?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-slate-500 dark:text-neutral-400 leading-relaxed">
              <strong className="text-slate-700 dark:text-neutral-200">
                {deleteTarget?.title}
              </strong>{" "}
              will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-10 px-6 rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 text-[14px] font-medium shadow-none cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="h-10 px-6 rounded-md bg-red-500 hover:bg-red-600 text-white text-[14px] font-medium shadow-none border-none cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {deleteMutation.isPending && <Spinner className="size-3.5" />}
              {deleteMutation.isPending ? "Deleting" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
