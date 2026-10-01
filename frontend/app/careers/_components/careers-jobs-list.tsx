"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon, Search01Icon } from "@hugeicons/core-free-icons";

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
  type CareerJobRow,
  type JobFilters,
} from "../lib/careers-utils";

// One height for the search field and the dropdowns: the 32px the dashboard filter bars use.
// The dark-theme border has to be matched by a dark-theme focus border, or focusing a field
// in dark mode shows nothing.
const fieldCls =
  "h-8! border border-slate-300 bg-slate-100 text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-neutral-900 focus-visible:ring-0 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus-visible:border-neutral-300";

function JobRow({ job, now }: { job: CareerJobRow; now: number }) {
  const meta = [
    employmentLabel(job.employmentType),
    job.location,
    postedLabel(job.createdAt, now),
  ].filter(Boolean);

  return (
    <li>
      {/* The whole card is the link; border, fill and arrow ease in together on hover. */}
      <Link
        href={`/careers/${job.id}`}
        className="group flex items-center justify-between gap-4 rounded-xl border border-slate-300 bg-white px-5 py-4 transition-[border-color,background-color,box-shadow] duration-200 ease-out hover:border-neutral-900 hover:bg-slate-50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 motion-reduce:transition-none dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-300 dark:hover:bg-neutral-800/70 dark:focus-visible:outline-neutral-100"
      >
        <div className="min-w-0">
          <h3 className="text-[17px] font-semibold leading-snug text-slate-900 dark:text-neutral-100">
            {job.title}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            {meta.join(" · ")}
          </p>
        </div>
        <span
          aria-hidden
          className="relative isolate inline-flex h-9 shrink-0 items-center gap-1.5 overflow-hidden rounded-full border border-slate-300 px-4 text-sm font-medium text-slate-800 transition-colors duration-300 ease-out group-hover:border-neutral-900 motion-reduce:transition-none dark:border-neutral-600 dark:text-neutral-200 dark:group-hover:border-neutral-100"
        >
          {/* The dark fill sweeps in from the left behind the label. */}
          <span className="absolute inset-0 -z-10 origin-left scale-x-0 rounded-full bg-neutral-900 transition-transform duration-300 ease-out group-hover:scale-x-100 motion-reduce:transition-none dark:bg-neutral-100" />
          {/* The label turns once the fill has reached it, so it is never grey on grey. */}
          <span className="transition-colors delay-100 duration-150 ease-out group-hover:text-white motion-reduce:transition-none dark:group-hover:text-neutral-900">
            Apply
          </span>
          <HugeiconsIcon
            icon={ArrowRight02Icon}
            className="size-4 transition-[transform,color] delay-100 duration-300 ease-out group-hover:translate-x-0.5 group-hover:text-white motion-reduce:transition-none dark:group-hover:text-neutral-900"
            strokeWidth={1.75}
          />
        </span>
      </Link>
    </li>
  );
}

export type CareersBrand = { name: string; logoUrl: string | null } | null;

/** The company's logo (or name) and "Open roles" side by side on one line. */
export function CareersTitleBar({ brand }: { brand: CareersBrand }) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      {brand?.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brand.logoUrl}
          alt={brand.name}
          className="h-12 w-auto max-w-[200px] object-contain object-left"
        />
      ) : brand?.name ? (
        <p className="text-base font-semibold text-slate-900 dark:text-neutral-100">
          {brand.name}
        </p>
      ) : null}
      {brand && (
        <span
          aria-hidden
          className="h-8 w-px shrink-0 bg-slate-300 dark:bg-neutral-700"
        />
      )}
      <h1 className="text-2xl font-semibold leading-tight text-slate-900 dark:text-neutral-100">
        Open roles
      </h1>
    </div>
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
      <SelectTrigger aria-label={label} className={`${fieldCls} w-full px-3 sm:w-36`}>
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
  // A dropdown with one possible value would filter nothing, so only offer real choices.
  const showDepartment = departments.length > 1;
  const showType = types.length > 1;
  const showLocation = locations.length > 1;
  // A single department's name above every role says nothing.
  const showDepartmentHeadings = departments.length > 1;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <CareersTitleBar brand={brand} />

        <div className="flex w-full flex-wrap items-center gap-2 md:ml-auto md:w-auto">
          <div className="relative min-w-0 flex-1 md:w-52 md:flex-none">
            {/* z-10: the field briefly transforms while pressed, and would paint over the icon. */}
            <HugeiconsIcon
              icon={Search01Icon}
              className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
            />
            <Input
              aria-label="Search roles"
              placeholder="Search roles"
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
      </div>

      {/* Closes the top row; the roles start below it. */}
      <hr className="my-5 border-t border-slate-200 dark:border-neutral-800" />

      <p aria-live="polite" className="mb-4 text-sm text-slate-500 dark:text-neutral-400">
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
        <p className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center text-[15px] text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
          No roles match your search.
        </p>
      ) : (
        <div className="space-y-10">
          {groups.map(({ department: name, jobs: deptJobs }) => (
            <section key={name} aria-label={showDepartmentHeadings ? name : "Open roles"}>
              {showDepartmentHeadings && (
                <h2 className="mb-3 flex items-baseline gap-2 text-sm font-semibold text-slate-900 dark:text-neutral-100">
                  {name}
                  <span className="font-normal text-slate-500 dark:text-neutral-400">
                    {deptJobs.length}
                  </span>
                </h2>
              )}
              <ul className="space-y-3">
                {deptJobs.map((job) => (
                  <JobRow key={job.id} job={job} now={now} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
