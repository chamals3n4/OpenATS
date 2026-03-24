"use client";

import { useState, KeyboardEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDepartments, useJob, useUpdateJob } from "@/hooks/use-api";
import type { Department, Job, JobDetail } from "@/types";
import { JobDescriptionEditor } from "@/components/job-description-editor";

const EMPLOYEMENT_LABELS: Record<Job["employmentType"], string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

const PAY_FREQUENCY_LABELS: Record<string, string> = {
  hourly: "Hourly",
  monthly: "Monthly",
  yearly: "Yearly",
};

function EditJobForm({
  job,
  departments,
  isPending,
  onSubmit,
}: {
  job: JobDetail;
  departments: Department[];
  isPending: boolean;
  onSubmit: (payload: {
    title: string;
    departmentId: number;
    employmentType: Job["employmentType"];
    location: string | null;
    description: string | null;
    skills: string[];
    salaryType: "fixed" | "range" | null;
    currency: string | null;
    payFrequency: string | null;
    salaryFixed: number | null;
    salaryMin: number | null;
    salaryMax: number | null;
    status: "draft" | "inactive" | "published" | "closed" | "archived";
  }) => void;
}) {
  const [departmentId, setDepartmentId] = useState<number | null>(
    job.departmentId ?? null,
  );
  const [skills, setSkills] = useState<string[]>(job.skills ?? []);
  const [skillInput, setSkillInput] = useState("");
  const [title, setTitle] = useState(job.title ?? "");
  const [employmentType, setEmploymentType] = useState<
    Job["employmentType"] | null
  >(job.employmentType ?? null);
  const [location, setLocation] = useState(job.location ?? "");
  const [description, setDescription] = useState(job.description ?? "");
  const [isSalaryInfoIncluded, setIsSalaryInfoIncluded] = useState(
    Boolean(job.salaryType),
  );
  const [salaryType, setSalaryType] = useState<"range" | "fixed">(
    job.salaryType === "fixed" ? "fixed" : "range",
  );
  const [currency, setCurrency] = useState(job.currency ?? "USD");
  const [payFrequency, setPayFrequency] = useState(
    job.payFrequency ?? "yearly",
  );
  const [salaryMin, setSalaryMin] = useState(
    job.salaryMin ? String(job.salaryMin) : "",
  );
  const [salaryMax, setSalaryMax] = useState(
    job.salaryMax ? String(job.salaryMax) : "",
  );
  const [salaryFixed, setSalaryFixed] = useState(
    job.salaryFixed ? String(job.salaryFixed) : "",
  );
  const [isActive, setIsActive] = useState(job.status === "published");

  const handleAddSkill = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      if (!skills.includes(skillInput.trim())) {
        setSkills([...skills, skillInput.trim()]);
      }
      setSkillInput("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = () => {
    if (!title.trim() || !departmentId || !employmentType) return;

    const salaryPayload = (() => {
      if (!isSalaryInfoIncluded) {
        return {
          salaryType: null,
          currency: null,
          payFrequency: null,
          salaryFixed: null,
          salaryMin: null,
          salaryMax: null,
        } as const;
      }

      if (salaryType === "fixed") {
        return {
          salaryType: "fixed",
          currency,
          payFrequency,
          salaryFixed: salaryFixed ? Number(salaryFixed) : null,
          salaryMin: null,
          salaryMax: null,
        } as const;
      }

      return {
        salaryType: "range",
        currency,
        payFrequency,
        salaryFixed: null,
        salaryMin: salaryMin ? Number(salaryMin) : null,
        salaryMax: salaryMax ? Number(salaryMax) : null,
      } as const;
    })();

    onSubmit({
      title: title.trim(),
      departmentId,
      employmentType,
      location: location || null,
      description: description || null,
      skills,
      ...salaryPayload,
      status: isActive
        ? "published"
        : job.status === "published"
          ? "draft"
          : job.status,
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
            Edit Job
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id="job-active"
            checked={isActive}
            onCheckedChange={setIsActive}
            className="data-checked:bg-theme scale-110"
          />
          <Label
            htmlFor="job-active"
            className="text-sm font-medium text-slate-600 dark:text-neutral-400 cursor-pointer pl-1"
          >
            Make This Job Active
          </Label>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
          Job Title
        </Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Senior Software Engineer - Backend"
          className="h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg placeholder:text-slate-300 dark:placeholder:text-neutral-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
            Department
          </Label>
          <Select
            value={departmentId ? String(departmentId) : undefined}
            onValueChange={(val) => setDepartmentId(Number(val))}
          >
            <SelectTrigger className="w-full h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 focus:ring-0">
              <SelectValue placeholder="Select">
                {departmentId
                  ? (departments.find((d) => d.id === departmentId)?.name ??
                    null)
                  : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={String(dept.id)}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2.5">
          <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
            Employement Type
          </Label>
          <Select
            value={employmentType ?? undefined}
            onValueChange={(val) =>
              setEmploymentType(val as Job["employmentType"])
            }
          >
            <SelectTrigger className="w-full h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 focus:ring-0">
              <SelectValue placeholder="Select">
                {employmentType ? EMPLOYEMENT_LABELS[employmentType] : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <SelectItem value="full_time">Full Time</SelectItem>
              <SelectItem value="part_time">Part Time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
              <SelectItem value="freelance">Freelance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2.5">
        <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
          Skills
        </Label>
        <div className="min-h-10 p-1.5 flex flex-wrap gap-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 focus-within:border-theme transition-[border-color] duration-200">
          {skills.map((skill) => (
            <div
              key={skill}
              className="inline-flex items-center bg-[#F1F5F9] dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium px-2.5 py-1 gap-2 rounded-md transition-all hover:bg-slate-200 dark:hover:bg-neutral-700"
            >
              <span className="text-[13px] leading-none">{skill}</span>
              <button
                onClick={() => removeSkill(skill)}
                className="flex items-center justify-center size-4.5 -mr-1 rounded-md text-slate-400 dark:text-neutral-500 hover:text-slate-600 dark:hover:text-neutral-300 hover:bg-slate-300/50 dark:hover:bg-neutral-700/50 transition-all"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
              </button>
            </div>
          ))}
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleAddSkill}
            placeholder={skills.length === 0 ? "Type and press enter..." : ""}
            className="flex-1 min-w-30 bg-transparent border-none outline-none text-sm px-1 placeholder:text-slate-300 dark:placeholder:text-neutral-600 text-slate-900 dark:text-neutral-100"
          />
        </div>
      </div>

      <div className="space-y-2.5">
        <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
          Location
        </Label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Search"
          className="h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg placeholder:text-slate-300 dark:placeholder:text-neutral-600"
        />
      </div>

      <div className="space-y-2.5">
        <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
          Job Description
        </Label>
        <JobDescriptionEditor
          value={description}
          onChange={setDescription}
          placeholder="Type here..."
          minHeightClassName="min-h-[260px]"
        />
      </div>

      <div className="border-t border-slate-100 dark:border-neutral-800 pt-10 space-y-5 mt-4">
        <h3 className="text-[17px] font-semibold text-slate-800 dark:text-neutral-100">
          Salary Information
        </h3>

        <div className="space-y-7">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3 shrink-0">
              <Checkbox
                id="salary-info"
                checked={isSalaryInfoIncluded}
                onCheckedChange={(checked) =>
                  setIsSalaryInfoIncluded(checked as boolean)
                }
                className="data-checked:bg-theme data-checked:border-theme size-4.5"
              />
              <Label
                htmlFor="salary-info"
                className="text-sm font-medium text-slate-600 dark:text-neutral-400 cursor-pointer whitespace-nowrap"
              >
                Include Salary Information
              </Label>
            </div>

            <RadioGroup
              value={salaryType}
              onValueChange={(val) => setSalaryType(val as "range" | "fixed")}
              className="flex items-center gap-10"
            >
              <div className="flex items-center gap-2.5">
                <RadioGroupItem
                  value="range"
                  id="range"
                  className="text-theme border-slate-300 data-checked:bg-theme data-checked:border-theme size-4.5"
                />
                <Label
                  htmlFor="range"
                  className="text-sm font-medium text-slate-600 dark:text-neutral-400 cursor-pointer"
                >
                  Salary Range
                </Label>
              </div>
              <div className="flex items-center gap-2.5">
                <RadioGroupItem
                  value="fixed"
                  id="fixed"
                  className="text-theme border-slate-300 data-checked:bg-theme data-checked:border-theme size-4.5"
                />
                <Label
                  htmlFor="fixed"
                  className="text-sm font-medium text-slate-600 dark:text-neutral-400 cursor-pointer"
                >
                  Fixed Salary
                </Label>
              </div>
            </RadioGroup>
          </div>

          {isSalaryInfoIncluded && (
            <div className="space-y-7 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                    Currency
                  </Label>
                  <Select
                    value={currency}
                    onValueChange={(val) => setCurrency(val || "USD")}
                  >
                    <SelectTrigger className="w-full h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 focus:ring-0">
                      <SelectValue placeholder="USD" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="LKR">LKR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                    Paid Every
                  </Label>
                  <Select
                    value={payFrequency}
                    onValueChange={(val) => setPayFrequency(val || "yearly")}
                  >
                    <SelectTrigger className="w-full h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 focus:ring-0">
                      <SelectValue placeholder="Month">
                        {PAY_FREQUENCY_LABELS[payFrequency] ?? null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {salaryType === "range" ? (
                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2.5">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                      Minimum Salary
                    </Label>
                    <Input
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(e.target.value)}
                      placeholder="e.g. 50,000"
                      className="h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-slate-900 dark:text-neutral-100 placeholder:text-slate-300 dark:placeholder:text-neutral-600"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                      Maximum Salary
                    </Label>
                    <Input
                      value={salaryMax}
                      onChange={(e) => setSalaryMax(e.target.value)}
                      placeholder="e.g. 80,000"
                      className="h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-slate-900 dark:text-neutral-100 placeholder:text-slate-300 dark:placeholder:text-neutral-600"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 pt-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                    Enter Fixed Salary
                  </Label>
                  <Input
                    value={salaryFixed}
                    onChange={(e) => setSalaryFixed(e.target.value)}
                    placeholder="e.g. 75,000"
                    className="h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-slate-900 dark:text-neutral-100 placeholder:text-slate-300 dark:placeholder:text-neutral-600"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="pt-10 flex items-center gap-4">
        <Button
          onClick={handleSubmit}
          className="text-white cursor-pointer rounded-lg h-10 px-10 min-w-35 font-medium shadow-none border-none"
          style={{ backgroundColor: "var(--theme-color)" }}
          disabled={!title || !departmentId || !employmentType || isPending}
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
          {isPending ? "Saving…" : "Update Job"}
        </Button>
        <Link
          href="/jobs"
          className="flex items-center justify-center border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 rounded-lg h-10 px-6 font-medium bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobId = Number(params.id);

  const { data: deptData } = useDepartments();
  const { data: jobData, isLoading: isJobLoading } = useJob(jobId);
  const updateJob = useUpdateJob(jobId);

  const departments = deptData?.data ?? [];
  const job = jobData?.data;

  if (!Number.isFinite(jobId)) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500">
        Invalid job ID.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      <div className="px-14 py-10 pb-20 max-w-5xl">
        {isJobLoading ? (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading job details...
          </div>
        ) : job ? (
          <EditJobForm
            key={job.id}
            job={job}
            departments={departments}
            isPending={updateJob.isPending}
            onSubmit={(payload) =>
              updateJob.mutate(payload, {
                onSuccess: () => router.push(`/jobs/${jobId}`),
              })
            }
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Job not found.</p>
            <Link
              href="/jobs"
              className="inline-flex items-center justify-center border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 rounded-lg h-10 px-6 font-medium bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Back to Jobs
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
