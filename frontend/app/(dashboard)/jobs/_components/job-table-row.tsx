"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { PencilEdit01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BulkSelectRowCell } from "@/components/table/bulk-selection";
import { serverFetch } from "@/lib/auth-action";
import type {
  Job,
  PipelineStage,
  User,
  Candidate,
  CustomQuestion,
} from "@/types";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/job-labels";
import { formatDate } from "@/lib/utils"; // move to shared utils

interface JobTableRowProps {
  job: Job;
  departmentName: string;
  onDelete: (job: Job) => void;
  isSelected: boolean;
  onSelectedChange: (checked: boolean) => void;
}

export function JobTableRow({
  job,
  departmentName,
  onDelete,
  isSelected,
  onSelectedChange,
}: JobTableRowProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const prefetchJob = useCallback(() => {
    const jobId = job.id;

    void queryClient.prefetchQuery({
      queryKey: ["jobs", jobId, "pipeline"],
      queryFn: () =>
        serverFetch<{ data: PipelineStage[] }>(`/jobs/${jobId}/pipeline`),
      staleTime: 1000 * 60 * 3,
    });
    void queryClient.prefetchQuery({
      queryKey: ["jobs", jobId, "team"],
      queryFn: () => serverFetch<{ data: User[] }>(`/jobs/${jobId}/team`),
      staleTime: 1000 * 60 * 5,
    });
    void queryClient.prefetchQuery({
      queryKey: ["candidates", jobId, undefined],
      queryFn: () =>
        serverFetch<{ data: Candidate[] }>(`/candidates/jobs/${jobId}`),
      staleTime: 1000 * 30,
    });
    void queryClient.prefetchQuery({
      queryKey: ["jobs", jobId, "questions"],
      queryFn: () =>
        serverFetch<{ data: CustomQuestion[] }>(`/jobs/${jobId}/questions`),
      staleTime: 1000 * 60 * 5,
    });
    void queryClient.prefetchQuery({
      queryKey: ["jobs", jobId, "assessments"],
      queryFn: () => serverFetch<{ data: any[] }>(`/jobs/${jobId}/assessments`),
      staleTime: 1000 * 60 * 5,
    });
  }, [queryClient, job.id]);

  const handleRowClick = () => router.push(`jobs/${job.id}`);
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/jobs/${job.id}/edit`);
  };
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(job);
  };

  return (
    <TableRow
      onClick={handleRowClick}
      onMouseEnter={prefetchJob}
      data-state={isSelected ? "selected" : undefined}
      className="border-b border-slate-300 dark:border-neutral-700 last:border-0 font-medium cursor-pointer"
    >
      <BulkSelectRowCell
        checked={isSelected}
        onCheckedChange={onSelectedChange}
      />
      <TableCell className="h-10 px-6 py-0">
        <span className="text-slate-700 dark:text-neutral-300 font-medium">
          {job.title}
        </span>
      </TableCell>
      <TableCell className="h-10 px-6 py-0 text-slate-600 dark:text-neutral-400 font-normal">
        {EMPLOYMENT_TYPE_LABELS[job.employmentType]}
      </TableCell>
      <TableCell className="h-10 px-6 py-0 text-slate-600 dark:text-neutral-400 font-normal">
        {departmentName}
      </TableCell>
      <TableCell className="h-10 px-6 py-0 text-slate-600 dark:text-neutral-400 font-normal">
        {formatDate(job.createdAt)}
      </TableCell>
      <TableCell
        className="h-10 px-6 py-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            className="h-8 rounded-md border border-slate-300 dark:border-neutral-600 bg-transparent hover:bg-slate-50 dark:hover:bg-neutral-900/50 px-4 text-sm font-semibold leading-none text-slate-700 dark:text-neutral-300 shadow-none cursor-pointer"
            onClick={handleEditClick}
          >
            <HugeiconsIcon icon={PencilEdit01Icon} className="size-3.5" />
            Edit
          </Button>
          <Button
            size="sm"
            className="h-8 rounded-md border-none bg-red-500 px-4 text-sm font-semibold leading-none text-white shadow-none hover:bg-red-500 cursor-pointer"
            onClick={handleDeleteClick}
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-3.5 mr-1" />
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
