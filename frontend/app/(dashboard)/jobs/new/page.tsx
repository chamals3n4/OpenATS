"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { RoleGuard } from "@/components/guards/role-guard";
import { useCreateJob } from "@/hooks/queries/use-jobs";
import { useDepartments } from "@/hooks/queries/use-company";
import { serverFetch } from "@/lib/server-fetch";
import { buildJobPayload } from "@/lib/jobs-utils";
import { JobForm } from "../_components/job-form/job-form";
import type { ValidJobFormValues } from "../_components/job-form/job-form-values";

export default function CreateNewJobPage() {
  return (
    <RoleGuard allow="manager" redirectTo="/jobs">
      <CreateJob />
    </RoleGuard>
  );
}

function CreateJob() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: deptData } = useDepartments();
  const createJob = useCreateJob();

  const handleSubmit = (values: ValidJobFormValues) => {
    createJob.mutate(buildJobPayload(values), {
      onSuccess: (res) => {
        const jobId = res.data.id;

        // Seed the cache so the job page loads instantly
        queryClient.setQueryData(["jobs", jobId], {
          data: { ...res.data, pipelineStages: [], hiringTeam: [] },
        });
        queryClient.setQueryData(["candidates", jobId, undefined], {
          data: [],
          pagination: undefined,
        });
        queryClient.setQueryData(["jobs", jobId, "team"], { data: [] });
        queryClient.setQueryData(["jobs", jobId, "questions"], { data: [] });
        queryClient.setQueryData(["jobs", jobId, "assessments"], { data: [] });

        // Prefetch the pipeline
        void queryClient.prefetchQuery({
          queryKey: ["jobs", jobId, "pipeline"],
          queryFn: () => serverFetch(`/jobs/${jobId}/pipeline`),
          staleTime: 1000 * 60 * 3,
        });

        // ?setup shows the next steps on the job page
        router.push(`/jobs/${jobId}?setup=1`);
      },
    });
  };

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      <JobForm
        mode="create"
        departments={deptData?.data ?? []}
        isPending={createJob.isPending}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/jobs")}
      />
    </div>
  );
}
