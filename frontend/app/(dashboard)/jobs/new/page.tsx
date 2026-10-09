"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/queries/use-user";
import { useCreateJob } from "@/hooks/queries/use-jobs";
import { useDepartments } from "@/hooks/queries/use-company";
import { serverFetch } from "@/lib/auth-action";
import { buildJobPayload } from "@/lib/jobs-utils";
import { JobForm } from "../_components/job-form/job-form";
import type { ValidJobFormValues } from "../_components/job-form/job-form-values";

export default function CreateNewJobPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: currentUserRes } = useCurrentUser();
  const role = currentUserRes?.data?.role;
  const isManager = role === "super_admin" || role === "hiring_manager";

  useEffect(() => {
    if (role && !isManager) router.replace("/jobs");
  }, [role, isManager, router]);

  const { data: deptData } = useDepartments();
  const createJob = useCreateJob();

  const handleSubmit = (values: ValidJobFormValues) => {
    createJob.mutate(buildJobPayload(values), {
      onSuccess: (res) => {
        const jobId = res.data.id;

        // Seed the cache so the job detail page renders instantly with no loading states
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

        // Background-fetch pipeline immediately (has default stages from seed)
        void queryClient.prefetchQuery({
          queryKey: ["jobs", jobId, "pipeline"],
          queryFn: () => serverFetch(`/jobs/${jobId}/pipeline`),
          staleTime: 1000 * 60 * 3,
        });

        // `setup` makes the job page offer the next steps (questions, scoring).
        router.push(`/jobs/${jobId}?setup=1`);
      },
    });
  };

  if (!role || !isManager) return null;

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
