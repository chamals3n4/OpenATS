"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Job } from "@/types";

type CareerJobRow = {
  id: number;
  slug: string;
  title: string;
  employmentType: Job["employmentType"];
  location: string | null;
  departmentName: string;
  createdAt: string;
};

const EMPLOYMENT_LABELS: Record<Job["employmentType"], string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

function JobCard({ job }: { job: CareerJobRow }) {
  return (
    <li>
      <Link
        href={`/careers/${job.id}`}
        className="group flex items-center justify-between gap-4 rounded-lg border border-[var(--theme-color)]/30 bg-slate-100 dark:bg-neutral-900 px-5 py-4 transition-colors hover:border-[var(--theme-color)]/60 hover:bg-slate-200/70 dark:hover:bg-neutral-800"
      >
        <div className="min-w-0">
          <h3 className="text-[14.5px] font-semibold text-slate-900 dark:text-neutral-100">
            {job.title}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
            {EMPLOYMENT_LABELS[job.employmentType] ?? job.employmentType}
            {job.location ? ` · ${job.location}` : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#a9c9c4] dark:bg-[#4d625f] px-4 py-1.5 text-sm font-semibold text-slate-900 dark:text-neutral-50 transition-colors group-hover:bg-[#98bdb7] dark:group-hover:bg-[#5b7370]">
          Apply
        </span>
      </Link>
    </li>
  );
}

export function CareersJobsList({ jobs }: { jobs: CareerJobRow[] }) {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");

  const departments = useMemo(() => {
    const names = new Set(jobs.map((j) => j.departmentName));
    return Array.from(names).sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesSearch =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.location?.toLowerCase().includes(q);
      const matchesDept =
        department === "all" || job.departmentName === department;
      return matchesSearch && matchesDept;
    });
  }, [jobs, search, department]);

  const groupedByDepartment = useMemo(() => {
    const groups = new Map<string, CareerJobRow[]>();
    for (const job of filteredJobs) {
      const list = groups.get(job.departmentName) ?? [];
      list.push(job);
      groups.set(job.departmentName, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredJobs]);

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 dark:text-neutral-500"
          />
          <Input
            placeholder="Search by title or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-slate-100 dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-md focus-visible:ring-0"
          />
        </div>
        <Select value={department} onValueChange={(v) => setDepartment(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-48 h-10! bg-slate-100 dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-md focus:ring-0">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent className="rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-md">
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredJobs.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-neutral-400 py-8 text-center">
          No roles match your search.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {groupedByDepartment.map(([departmentName, deptJobs]) => (
            <div key={departmentName}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-neutral-500">
                {departmentName}
              </h3>
              <ul className="flex flex-col gap-2">
                {deptJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
