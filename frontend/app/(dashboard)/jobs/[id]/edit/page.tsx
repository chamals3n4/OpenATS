"use client";

import { toast } from "sonner";
import { useMemo } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { RoleGuard } from "@/components/guards/role-guard";
import { NotFoundState } from "@/components/not-found-state";
import { Button } from "@/components/ui/button";
import { useDepartments } from "@/hooks/queries/use-company";
import { useJob, useUpdateJob } from "@/hooks/queries/use-jobs";
import { buildUpdateJobPayload } from "@/lib/jobs-utils";
import { JobForm } from "../../_components/job-form/job-form";
import {
  jobToFormValues,
  type ValidJobFormValues,
} from "../../_components/job-form/job-form-values";

export default function EditJobPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <RoleGuard allow="manager" redirectTo={`/jobs/${id}`}>
      <EditJob />
    </RoleGuard>
  );
}

function EditJob() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobId = Number(params.id);

  const { data: deptData } = useDepartments();
  const { data: jobData, isLoading: isJobLoading } = useJob(jobId);
  const updateJob = useUpdateJob(jobId);

  const job = jobData?.data;
  const initialValues = useMemo(
    () => (job ? jobToFormValues(job) : undefined),
    [job],
  );

  const handleSubmit = (values: ValidJobFormValues) => {
    if (!job) return;
    // Only toggle published, keep other statuses
    const status = values.isActive
      ? "published"
      : job.status === "published"
        ? "draft"
        : job.status;

    updateJob.mutate(buildUpdateJobPayload({ ...values, status }), {
      onSuccess: () => {
        toast.success("Job updated");
        router.push(`/jobs/${jobId}`);
      },
      onError: (error) => toast.error(error.message || "Failed to update the job"),
    });
  };

  if (!Number.isFinite(jobId)) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500">
        Invalid job ID.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      {isJobLoading ? (
        <div className="flex items-center gap-2 px-14 py-10 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading job details...
        </div>
      ) : job && initialValues ? (
        <JobForm
          key={job.id}
          mode="edit"
          initialValues={initialValues}
          departments={deptData?.data ?? []}
          isPending={updateJob.isPending}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/jobs/${jobId}`)}
        />
      ) : (
        <NotFoundState title="Job not found" description="It may have been deleted, or the link may be wrong.">
          <Button size="lg" render={<Link href="/jobs" />}>
            Back to jobs
          </Button>
        </NotFoundState>
      )}
    </div>
  );
}
