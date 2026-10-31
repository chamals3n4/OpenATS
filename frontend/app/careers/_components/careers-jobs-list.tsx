"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUpRight01Icon,
  Briefcase01Icon,
  Clock01Icon,
  Location01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ALL,
  NO_FILTERS,
  departmentNames,
  employmentLabel,
  employmentTypesIn,
  filterJobs,
  groupByDepartment,
  hasActiveFilters,
  locationsIn,
  postedLabel,
  safeWebsite,
  type CareerJobRow,
  type JobFilters,
} from "../_lib/careers-utils";

// The search is the main control here, so a little taller than the dashboard filters
const fieldCls =
  "h-10! border border-slate-300 bg-white text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-neutral-900 focus-visible:ring-0 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus-visible:border-neutral-300";

function Meta({ icon, children }: { icon: typeof Briefcase01Icon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <HugeiconsIcon icon={icon} className="size-4 shrink-0 text-slate-400 dark:text-neutral-500" strokeWidth={1.75} />
      {children}
    </span>
  );
}

function JobRow({
  job,
  now,
  nested,
}: {
  job: CareerJobRow;
  now: number;
  // Under a department heading, so one level lower
  nested: boolean;
}) {
  const Title = nested ? "h3" : "h2";

  return (
    <li>
      {/* Whole card is the link */}
      <Link
        href={`/careers/${job.id}`}
        className="group flex items-center justify-between gap-4 rounded-xl border border-slate-300 bg-white px-5 py-4 transition-colors duration-150 hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 motion-reduce:transition-none dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-500 dark:hover:bg-neutral-800/60 dark:focus-visible:outline-neutral-100"
      >
        <div className="min-w-0">
          <Title className="text-base font-semibold leading-snug text-slate-900 dark:text-neutral-100">
            {job.title}
          </Title>
          <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-500 dark:text-neutral-400">
            <Meta icon={Briefcase01Icon}>{employmentLabel(job.employmentType)}</Meta>
            {job.location && <Meta icon={Location01Icon}>{job.location}</Meta>}
            <Meta icon={Clock01Icon}>{postedLabel(job.createdAt, now)}</Meta>
          </p>
        </div>
        <span
          aria-hidden
          className="inline-flex h-9 shrink-0 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition-colors duration-150 group-hover:border-slate-500 motion-reduce:transition-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:group-hover:border-neutral-500"
        >
          Apply
        </span>
      </Link>
    </li>
  );
}

export type CareersBrand = {
  name: string;
  logoUrl: string | null;
  description: string | null;
  website: string | null;
} | null;

/** Logo, "Careers at", description and website, above the roles */
export function CareersHeader({ brand }: { brand: CareersBrand }) {
  const website = safeWebsite(brand?.website);
  return (
    <header>
      {brand?.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brand.logoUrl}
          alt={brand.name}
          className="mb-4 h-16 w-auto max-w-[200px] object-contain object-left"
        />
      )}
      <h1 className="text-2xl font-semibold leading-tight text-slate-900 dark:text-neutral-100">
        {brand?.name ? `Careers at ${brand.name}` : "Careers"}
      </h1>
      {/* Plain text from Settings, any length; keep the line breaks it was written with. */}
      {brand?.description && (
        <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-slate-600 dark:text-neutral-400">
          {brand.description}
        </p>
      )}
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-900 underline underline-offset-4 hover:text-slate-600 dark:text-neutral-100 dark:hover:text-neutral-300"
        >
          Visit website
          <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4" strokeWidth={1.75} />
        </a>
      )}
    </header>
  );
}

function FilterSelect({
  label,
  allLabel,
  options,
  value,
  onChange,
}: {
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const items = [{ value: ALL, label: allLabel }, ...options];
  return (
    <Select items={items} value={value} onValueChange={(v) => onChange(v ?? ALL)}>
      <SelectTrigger aria-label={label} className={`${fieldCls} w-full px-3 sm:w-44`}>
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CareersJobsList({
  jobs,
  brand,
}: {
  jobs: CareerJobRow[];
  brand: CareersBrand;
}) {
  const [filters, setFilters] = useState<JobFilters>(NO_FILTERS);
  const [now] = useState(() => Date.now());
  const set = <K extends keyof JobFilters>(key: K, value: JobFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const departments = useMemo(() => departmentNames(jobs), [jobs]);
  const types = useMemo(() => employmentTypesIn(jobs), [jobs]);
  const locations = useMemo(() => locationsIn(jobs), [jobs]);

  const filtered = useMemo(() => filterJobs(jobs, filters), [jobs, filters]);
  const groups = useMemo(() => groupByDepartment(filtered), [filtered]);

  const isFiltered = hasActiveFilters(filters);
  // Only show dropdowns with real choices
  const showDepartment = departments.length > 1;
  const showType = types.length > 1;
  const showLocation = locations.length > 1;
  // Hide the department if there is only one
  const showDepartmentHeadings = departments.length > 1;

  return (
    <div>
      <CareersHeader brand={brand} />

      <div className="mt-10 flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
          />
          <Input
            aria-label="Search roles"
            placeholder="Search for roles"
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            className={`${fieldCls} pl-9`}
          />
        </div>

        {showDepartment && (
          <FilterSelect
            label="Department"
            allLabel="All departments"
            options={departments.map((d) => ({ value: d, label: d }))}
            value={filters.department}
            onChange={(v) => set("department", v)}
          />
        )}
        {showType && (
          <FilterSelect
            label="Job type"
            allLabel="All job types"
            options={types.map((t) => ({ value: t, label: employmentLabel(t) }))}
            value={filters.employmentType}
            onChange={(v) => set("employmentType", v)}
          />
        )}
        {showLocation && (
          <FilterSelect
            label="Location"
            allLabel="All locations"
            options={locations.map((l) => ({ value: l, label: l }))}
            value={filters.location}
            onChange={(v) => set("location", v)}
          />
        )}
      </div>

      <p aria-live="polite" className="mt-3 text-sm text-slate-500 dark:text-neutral-400">
        {isFiltered
          ? `Showing ${filtered.length} of ${jobs.length} ${jobs.length === 1 ? "role" : "roles"}`
          : `${jobs.length} open ${jobs.length === 1 ? "role" : "roles"}`}
        {isFiltered && (
          <>
            {" · "}
            <button
              type="button"
              onClick={() => setFilters(NO_FILTERS)}
              className="cursor-pointer font-medium text-slate-800 underline underline-offset-4 hover:text-slate-950 dark:text-neutral-200 dark:hover:text-white"
            >
              Clear filters
            </button>
          </>
        )}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center text-[15px] text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
          No roles match your search.
        </p>
      ) : (
        <div className="mt-8 space-y-10">
          {groups.map(({ department: name, jobs: deptJobs }) => (
            <section key={name} aria-label={showDepartmentHeadings ? name : "Open roles"}>
              {showDepartmentHeadings && (
                <h2 className="mb-3 flex items-baseline gap-2 text-lg font-medium text-slate-500 dark:text-neutral-400">
                  {name}
                  <span className="text-sm text-slate-400 dark:text-neutral-500">
                    {deptJobs.length}
                  </span>
                </h2>
              )}
              <ul className="space-y-3">
                {deptJobs.map((job) => (
                  <JobRow key={job.id} job={job} now={now} nested={showDepartmentHeadings} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
