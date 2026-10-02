"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/queries/use-user";
import { useDepartments } from "@/hooks/queries/use-company";
import { useJob, useUpdateJob } from "@/hooks/queries/use-jobs";
import { buildUpdateJobPayload } from "@/lib/jobs-utils";
import { JobForm } from "../../_components/job-form/job-form";
import {
  jobToFormValues,
  type ValidJobFormValues,
} from "../../_components/job-form/job-form-values";

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobId = Number(params.id);

  const { data: currentUserRes } = useCurrentUser();
  const role = currentUserRes?.data?.role;
  const isManager = role === "super_admin" || role === "hiring_manager";

  useEffect(() => {
    if (role && !isManager) router.replace(`/jobs/${jobId}`);
  }, [role, isManager, router, jobId]);

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
    // The switch only toggles published; any other status is preserved.
    const status = values.isActive
      ? "published"
      : job.status === "published"
        ? "draft"
        : job.status;

    updateJob.mutate(buildUpdateJobPayload({ ...values, status }), {
      onSuccess: () => router.push(`/jobs/${jobId}`),
    });
  };

  if (!role || !isManager) return null;

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
        <div className="space-y-4 px-14 py-10">
          <p className="text-sm text-slate-500">Job not found.</p>
          <Link
            href="/jobs"
            className="inline-flex h-9 items-center justify-center rounded-md bg-neutral-700 px-4 text-sm font-semibold text-white hover:bg-neutral-600 transition-colors"
          >
            Back to Jobs
          </Link>
        </div>
      )}
    </div>
  );
}
