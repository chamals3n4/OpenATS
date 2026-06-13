"use client";

import { useState, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Loader2, Save } from "lucide-react";
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
import { useQueryClient } from "@tanstack/react-query";
import { useCreateJob } from "@/hooks/queries/use-jobs";
import { useDepartments } from "@/hooks/queries/use-company";
import { serverFetch } from "@/lib/auth-action";
import { JobDescriptionEditor } from "@/components/dynamic-imports";

export default function CreateNewJobPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: deptData } = useDepartments();
  const createJob = useCreateJob();
  const departments = deptData?.data ?? [];

  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [isSalaryInfoIncluded, setIsSalaryInfoIncluded] = useState(true);
  const [salaryType, setSalaryType] = useState<"range" | "fixed">("range");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [title, setTitle] = useState("");
  const [employmentType, setEmploymentType] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [payFrequency, setPayFrequency] = useState("yearly");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryFixed, setSalaryFixed] = useState("");
  const [isActive, setIsActive] = useState(true);

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
      if (!isSalaryInfoIncluded) return {};
      if (salaryType === "fixed" && salaryFixed) {
        return {
          salaryType: "fixed" as const,
          currency,
          payFrequency,
          salaryFixed: Number(salaryFixed.replace(/,/g, "")),
        };
      }
      if (salaryType === "range" && salaryMin && salaryMax) {
        return {
          salaryType: "range" as const,
          currency,
          payFrequency,
          salaryMin: Number(salaryMin.replace(/,/g, "")),
          salaryMax: Number(salaryMax.replace(/,/g, "")),
        };
      }
      return {};
    })();

    createJob.mutate(
      {
        title: title.trim(),
        departmentId,
        employmentType,
        location: location || undefined,
        description: description || undefined,
        skills: skills.length > 0 ? skills : undefined,
        ...salaryPayload,
        status: isActive ? "published" : "draft",
      },
      {
        onSuccess: (res) => {
          const jobId = res.data.id;

          queryClient.setQueryData(["jobs", jobId], {
            data: { ...res.data, pipelineStages: [], hiringTeam: [] },
          });
          queryClient.setQueryData(["candidates", jobId, undefined], { data: [], pagination: undefined });
          queryClient.setQueryData(["jobs", jobId, "team"], { data: [] });
          queryClient.setQueryData(["jobs", jobId, "questions"], { data: [] });
          queryClient.setQueryData(["jobs", jobId, "assessments"], { data: [] });

          void queryClient.prefetchQuery({
            queryKey: ["jobs", jobId, "pipeline"],
            queryFn: () => serverFetch(`/jobs/${jobId}/pipeline`),
            staleTime: 1000 * 60 * 3,
          });

          router.push(`/jobs/${jobId}`);
        },
      },
    );
  };

  const EMPLOYEMENT_LABELS: Record<string, string> = {
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

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      <div className="px-14 py-10 pb-20 max-w-5xl">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
              Create New Job
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="job-active"
              defaultChecked
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

        <div className="space-y-5">
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
              Job Title
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Senior Software Engineer - Backend"
              className="h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0"
            />
          </div>

          {/* Department and Employment Type */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                Department
              </Label>
              <Select onValueChange={(val) => setDepartmentId(Number(val))}>
                <SelectTrigger className="w-full h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 focus:ring-0 focus:border-slate-300 dark:focus:border-neutral-600">
                  <SelectValue placeholder="Select">
                    {departmentId
                      ? (departments.find((d) => d.id == departmentId)?.name ??
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
              <Select onValueChange={(val) => setEmploymentType(val as string)}>
                <SelectTrigger className="w-full h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 focus:ring-0 focus:border-slate-300 dark:focus:border-neutral-600">
                  <SelectValue placeholder="Select">
                    {employmentType ? EMPLOYEMENT_LABELS[employmentType] : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>{" "}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-2.5">
            <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
              Skills
            </Label>
            <div className="min-h-10 p-1.5 flex flex-wrap gap-2 border border-slate-300 dark:border-neutral-600 rounded-lg bg-gray-100 dark:bg-neutral-800 transition-[border-color] duration-200">
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
                placeholder={
                  skills.length === 0 ? "Type and press enter..." : ""
                }
                className="flex-1 min-w-30 bg-transparent border-none outline-none text-sm px-1 placeholder:text-slate-300 dark:placeholder:text-neutral-600 text-slate-900 dark:text-neutral-100"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2.5">
            <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
              Location
            </Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Search"
              className="h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0"
            />
          </div>

          {/* Job Description */}
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

            <div className="space-y-5">
              <div className="flex items-center gap-10">
                <div className="flex items-center gap-3 shrink-0">
                  <Checkbox
                    id="salary-info"
                    variant="theme"
                    checked={isSalaryInfoIncluded}
                    onCheckedChange={(checked) =>
                      setIsSalaryInfoIncluded(checked as boolean)
                    }
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
                  onValueChange={(val) =>
                    setSalaryType(val as "range" | "fixed")
                  }
                  className="flex items-center gap-10"
                >
                  <div className="flex items-center gap-2.5">
                    <RadioGroupItem variant="theme" value="range" id="range" />
                    <Label
                      htmlFor="range"
                      className="text-sm font-medium text-slate-600 dark:text-neutral-400 cursor-pointer"
                    >
                      Salary Range
                    </Label>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <RadioGroupItem variant="theme" value="fixed" id="fixed" />
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
                <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                        Currency
                      </Label>
                      <Select
                        value={currency}
                        onValueChange={(val) => setCurrency(val || "USD")}
                      >
                        <SelectTrigger className="w-full h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 focus:ring-0 focus:border-slate-300 dark:focus:border-neutral-600">
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
                        onValueChange={(val) =>
                          setPayFrequency(val || "yearly")
                        }
                      >
                        <SelectTrigger className="w-full h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 focus:ring-0 focus:border-slate-300 dark:focus:border-neutral-600">
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
                          className="h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0"
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
                          className="h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0"
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
                        className="h-10! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-lg text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-10 flex items-center gap-2">
            <Button
              onClick={handleSubmit}
              className="h-10! rounded-md border-none bg-theme hover:bg-theme-hover px-4 text-base font-semibold leading-none text-white shadow-none cursor-pointer gap-2 flex items-center"
              disabled={
                !title ||
                !departmentId ||
                !employmentType ||
                createJob.isPending
              }
            >
              {createJob.isPending ? (
                <>
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  <span>Save Job</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              className="h-10! rounded-md border border-slate-300 dark:border-neutral-600 bg-transparent hover:bg-slate-50 dark:hover:bg-neutral-900/50 px-4 text-base font-semibold leading-none text-slate-700 dark:text-neutral-300 shadow-none cursor-pointer gap-2 flex items-center"
              onClick={() => router.push("/jobs")}
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
              <span>Cancel</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
