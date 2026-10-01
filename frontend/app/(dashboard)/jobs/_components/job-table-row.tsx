"use client";

import { useCallback } from "react";
import { RowDeleteButton, RowEditButton } from "@/components/table/row-actions";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { TableRow, TableCell } from "@/components/ui/table";
import { BulkSelectRowCell } from "@/components/table/bulk-selection";
import { serverFetch } from "@/lib/auth-action";
import type {
  Job,
  PipelineStage,
  User,
  Candidate,
  CustomQuestion,
  JobAssessment,
} from "@/types";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/job-labels";
import { formatDate } from "@/lib/utils";
import { useIsManager } from "@/hooks/use-role";

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
  const isManager = useIsManager();

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
      queryFn: () =>
        serverFetch<{ data: JobAssessment[] }>(`/jobs/${jobId}/assessments`),
      staleTime: 1000 * 60 * 5,
    });
  }, [queryClient, job.id]);

  const handleRowClick = () => router.push(`/jobs/${job.id}`);
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
      <TableCell className="h-12 px-6 py-0">
        <span className="text-slate-900 dark:text-neutral-100 font-medium">
          {job.title}
        </span>
      </TableCell>
      <TableCell className="h-12 px-6 py-0 text-slate-800 dark:text-neutral-200 font-medium">
        {EMPLOYMENT_TYPE_LABELS[job.employmentType]}
      </TableCell>
      <TableCell className="h-12 px-6 py-0 text-slate-800 dark:text-neutral-200 font-medium">
        {departmentName}
      </TableCell>
      <TableCell className="h-12 px-6 py-0 text-slate-800 dark:text-neutral-200 font-medium">
        {formatDate(job.createdAt)}
      </TableCell>
      <TableCell
        className="h-12 px-6 py-0"
        onClick={(e) => e.stopPropagation()}
      >
        {isManager && (
          <div className="flex items-center justify-end gap-2">
            <RowEditButton onClick={handleEditClick} />
            <RowDeleteButton onClick={handleDeleteClick} />
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
