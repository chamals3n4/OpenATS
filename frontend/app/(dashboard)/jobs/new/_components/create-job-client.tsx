"use client";

import { useState, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateJob } from "@/hooks/queries/use-jobs";
import { useDepartments } from "@/hooks/queries/use-company";
import { serverFetch } from "@/lib/auth-action";
import type { Job } from "@/types";
import { JobHeader } from "./job-header";
import { JobBasicInfo } from "./job-basic-info";
import { SkillsInput } from "./skills-input";
import { LocationInput } from "./location-input";
import { JobDescriptionSection } from "./job-description";
import { SalarySection } from "./salary";
import { FormActions } from "./form-actions";
import { buildJobPayload } from "@/lib/jobs-utils";

export default function CreateJobPageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createJob = useCreateJob();
  const { data: deptData } = useDepartments();
  const departments = deptData?.data ?? [];

  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [employmentType, setEmploymentType] = useState<
    Job["employmentType"] | null
  >(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const [isSalaryInfoIncluded, setIsSalaryInfoIncluded] = useState(true);
  const [salaryType, setSalaryType] = useState<"range" | "fixed">("range");
  const [currency, setCurrency] = useState("USD");
  const [payFrequency, setPayFrequency] = useState("yearly");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryFixed, setSalaryFixed] = useState("");

  const handleAddSkill = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      if (!skills.includes(skillInput.trim())) {
        setSkills((prev) => [...prev, skillInput.trim()]);
      }
      setSkillInput("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = () => {
    if (!title.trim() || !departmentId || !employmentType) return;

    const payload = buildJobPayload({
      title,
      departmentId,
      employmentType,
      location,
      description,
      skills,
      isSalaryInfoIncluded,
      salaryType,
      currency,
      payFrequency,
      salaryMin,
      salaryMax,
      salaryFixed,
    });

    createJob.mutate(payload, {
      onSuccess: (res) => {
        const jobId = res.data.id;

        // Seed the cache so the job detail page renders instantly with no loading states
        queryClient.setQueryData(["jobs", jobId], {
          data: { ...res.data, pipelineStages: [], hiringTeam: [] },
        });
        queryClient.setQueryData(["candidates", jobId, undefined], { data: [], pagination: undefined });
        queryClient.setQueryData(["jobs", jobId, "team"], { data: [] });
        queryClient.setQueryData(["jobs", jobId, "questions"], { data: [] });
        queryClient.setQueryData(["jobs", jobId, "assessments"], { data: [] });

        // Background-fetch pipeline immediately (has default stages from seed)
        void queryClient.prefetchQuery({
          queryKey: ["jobs", jobId, "pipeline"],
          queryFn: () => serverFetch(`/jobs/${jobId}/pipeline`),
          staleTime: 1000 * 60 * 3,
        });

        router.push(`/jobs/${jobId}`);
      },
    });
  };

  const isSubmitDisabled =
    !title.trim() || !departmentId || !employmentType || createJob.isPending;

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      <div className="px-14 py-10 pb-20 max-w-5xl">
        <JobHeader />

        <div className="space-y-5">
          <JobBasicInfo
            title={title}
            onTitleChange={setTitle}
            departmentId={departmentId}
            onDepartmentChange={setDepartmentId}
            employmentType={employmentType}
            onEmploymentTypeChange={setEmploymentType}
            departments={departments}
          />

          <SkillsInput
            skills={skills}
            skillInput={skillInput}
            onSkillInputChange={setSkillInput}
            onAddSkill={handleAddSkill}
            onRemoveSkill={removeSkill}
          />

          <LocationInput value={location} onChange={setLocation} />

          <JobDescriptionSection
            value={description}
            onChange={setDescription}
          />

          <SalarySection
            isIncluded={isSalaryInfoIncluded}
            onIncludedChange={setIsSalaryInfoIncluded}
            salaryType={salaryType}
            onSalaryTypeChange={setSalaryType}
            currency={currency}
            onCurrencyChange={setCurrency}
            payFrequency={payFrequency}
            onPayFrequencyChange={setPayFrequency}
            salaryMin={salaryMin}
            onSalaryMinChange={setSalaryMin}
            salaryMax={salaryMax}
            onSalaryMaxChange={setSalaryMax}
            salaryFixed={salaryFixed}
            onSalaryFixedChange={setSalaryFixed}
          />

          <FormActions
            onSubmit={handleSubmit}
            onCancel={() => router.push("/jobs")}
            isSubmitDisabled={isSubmitDisabled}
            isPending={createJob.isPending}
          />
        </div>
      </div>
    </div>
  );
}
