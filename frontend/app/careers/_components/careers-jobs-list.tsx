"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  ArrowUpRight01Icon,
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
  shortDescription,
  type CareerJobRow,
  type JobFilters,
} from "../_lib/careers-utils";

// The search is the main control here, so a little taller than the dashboard filters
const fieldCls =
  "h-12! text-base! border border-slate-300 bg-white text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-neutral-900 focus-visible:ring-0 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus-visible:border-neutral-300";

/** The width everything on the page lines up to */
export const pageWidth = "mx-auto w-full max-w-[1200px] px-6 sm:px-8";

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
  const Title = nested ? "h4" : "h3";

  return (
    <li>
      {/* Whole card is the link. Fixed columns, so roles can be compared down the page */}
      <Link
        href={`/careers/${job.id}`}
        className="group grid gap-x-6 rounded-lg border border-slate-200 bg-white px-6 py-5 transition-colors duration-150 hover:border-theme focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 motion-reduce:transition-none sm:grid-cols-[minmax(0,1fr)_16rem_8rem_1.25rem] sm:items-center dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-500 dark:focus-visible:outline-neutral-100"
      >
        <div className="min-w-0">
          <Title className="text-lg font-semibold leading-snug text-slate-900 transition-colors duration-150 group-hover:text-theme motion-reduce:transition-none dark:text-neutral-100 dark:group-hover:text-neutral-100">
            {job.title}
          </Title>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            {postedLabel(job.createdAt, now)}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-0.5 text-base text-slate-700 sm:contents dark:text-neutral-300">
          <span className="min-w-0">{job.location}</span>
          <span>{employmentLabel(job.employmentType)}</span>
        </div>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          aria-hidden
          className="hidden size-5 text-slate-400 transition-colors duration-150 group-hover:text-theme motion-reduce:transition-none sm:block dark:text-neutral-500 dark:group-hover:text-neutral-200"
          strokeWidth={1.75}
        />
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

/** Plain text from Settings, any length; keep the line breaks it was written with. */
function CompanyDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const short = shortDescription(text);

  return (
    <p className="mt-3 max-w-5xl whitespace-pre-line text-[17px] leading-relaxed text-slate-600 dark:text-neutral-400">
      {expanded || !short ? text : short}
      {short && (
        <>
          {" "}
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
            className="cursor-pointer font-medium text-slate-800 underline underline-offset-4 hover:text-slate-950 dark:text-neutral-200 dark:hover:text-white"
          >
            {expanded ? "See less" : "See more"}
          </button>
        </>
      )}
    </p>
  );
}

/** Who the company is and what the page is, edge to edge */
export function CareersHeader({ brand }: { brand: CareersBrand }) {
  const website = safeWebsite(brand?.website);
  return (
    <header className="border-b border-slate-200 bg-linear-to-r from-sky-50 via-sky-50/40 to-sky-50 dark:border-neutral-800 dark:from-sky-950 dark:via-neutral-900 dark:to-sky-950">
      <div className={`${pageWidth} py-8 sm:py-10`}>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 items-center gap-4">
            {brand?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logoUrl}
                alt=""
                className="h-12 w-auto max-w-[180px] shrink-0 object-contain object-left sm:h-14"
              />
            )}
            <h1 className="min-w-0 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[40px] dark:text-neutral-100">
              {brand?.name ? `Careers at ${brand.name}` : "Careers"}
            </h1>
          </div>
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-base font-medium text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              Visit website
              <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-5" strokeWidth={1.75} />
            </a>
          )}
        </div>
        {brand?.description && <CompanyDescription text={brand.description} />}
      </div>
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
      <SelectTrigger aria-label={label} className={`${fieldCls} w-full px-4 sm:w-52`}>
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

      <main className={`${pageWidth} pb-24 pt-8`}>
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100">Open roles</h2>
          <p aria-live="polite" className="text-sm text-slate-500 dark:text-neutral-400">
            {isFiltered ? `${filtered.length} of ${jobs.length}` : jobs.length}
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
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="relative min-w-60 flex-1">
            <HugeiconsIcon
              icon={Search01Icon}
              className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
            />
            <Input
              aria-label="Search roles"
              placeholder="Search for roles"
              value={filters.search}
              onChange={(e) => set("search", e.target.value)}
              className={`${fieldCls} pl-11`}
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

        {filtered.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center text-[15px] text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
            No roles match your search.
          </p>
        ) : (
          <div className="mt-5 space-y-10">
            {groups.map(({ department: name, jobs: deptJobs }) => (
              <section key={name} aria-label={showDepartmentHeadings ? name : "Open roles"}>
                {showDepartmentHeadings && (
                  <h3 className="mb-3 flex items-baseline gap-2 text-base font-semibold text-slate-900 dark:text-neutral-100">
                    {name}
                    <span className="font-normal text-slate-500 dark:text-neutral-400">
                      {deptJobs.length}
                    </span>
                  </h3>
                )}
                <ul className="space-y-2">
                  {deptJobs.map((job) => (
                    <JobRow key={job.id} job={job} now={now} nested={showDepartmentHeadings} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
