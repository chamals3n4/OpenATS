import { describe, it, expect } from "vitest";
import {
  NO_FILTERS,
  employmentTypesIn,
  filterJobs,
  groupByDepartment,
  hasActiveFilters,
  locationsIn,
  postedLabel,
  type CareerJobRow,
  type JobFilters,
} from "@/app/careers/lib/careers-utils";

const job = (id: number, over: Partial<CareerJobRow> = {}): CareerJobRow => ({
  id,
  slug: `job-${id}`,
  title: `Role ${id}`,
  employmentType: "full_time",
  location: "Colombo",
  departmentName: "Engineering",
  createdAt: "2026-09-01T10:00:00.000Z",
  ...over,
});

describe("postedLabel", () => {
  const now = new Date("2026-09-09T15:00:00").getTime();

  it("speaks in days, then weeks, then a date", () => {
    expect(postedLabel("2026-09-09T08:00:00", now)).toBe("Posted today");
    expect(postedLabel("2026-09-08T22:00:00", now)).toBe("Posted yesterday");
    expect(postedLabel("2026-09-04T10:00:00", now)).toBe("Posted 5 days ago");
    expect(postedLabel("2026-09-02T10:00:00", now)).toBe("Posted 1 week ago");
    expect(postedLabel("2026-08-20T10:00:00", now)).toBe("Posted 2 weeks ago");
    expect(postedLabel("2026-06-01T10:00:00", now)).toBe("Posted Jun 1, 2026");
  });

  it("is null for a date it cannot read, and never says a future date is old", () => {
    expect(postedLabel("garbage", now)).toBeNull();
    expect(postedLabel("2026-09-20T10:00:00", now)).toBe("Posted today");
  });
});

describe("filterJobs", () => {
  const f = (over: Partial<JobFilters>): JobFilters => ({ ...NO_FILTERS, ...over });
  const ids = (jobs: CareerJobRow[]) => jobs.map((j) => j.id);

  const jobs = [
    job(1, { title: "Senior QA Engineer", location: "Colombo" }),
    job(2, { title: "Product Designer", location: "Remote", departmentName: "Design" }),
    job(3, { title: "Software Engineering Intern", employmentType: "internship", location: "Colombo (Hybrid)" }),
  ];

  it("matches the title, the location, the department and the job type, ignoring case", () => {
    expect(ids(filterJobs(jobs, f({ search: "qa" })))).toEqual([1]);
    expect(ids(filterJobs(jobs, f({ search: "REMOTE" })))).toEqual([2]);
    expect(ids(filterJobs(jobs, f({ search: "design" })))).toEqual([2]);
    expect(ids(filterJobs(jobs, f({ search: "internship" })))).toEqual([3]);
  });

  it("narrows by department, job type and location", () => {
    expect(ids(filterJobs(jobs, f({ department: "Design" })))).toEqual([2]);
    expect(ids(filterJobs(jobs, f({ employmentType: "internship" })))).toEqual([3]);
    expect(ids(filterJobs(jobs, f({ location: "Remote" })))).toEqual([2]);
  });

  it("combines every filter, so each one narrows further", () => {
    expect(ids(filterJobs(jobs, f({ search: "engineer", employmentType: "full_time" })))).toEqual([1]);
    expect(filterJobs(jobs, f({ search: "qa", department: "Design" }))).toEqual([]);
    expect(filterJobs(jobs, f({ employmentType: "internship", location: "Remote" }))).toEqual([]);
  });

  it("copes with a role that has no location", () => {
    expect(filterJobs([job(9, { location: null })], f({ search: "colombo" }))).toEqual([]);
    expect(filterJobs([job(9, { location: null })], f({ location: "Colombo" }))).toEqual([]);
  });

  it("knows when any filter is on", () => {
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
    expect(hasActiveFilters(f({ search: "  " }))).toBe(false);
    expect(hasActiveFilters(f({ employmentType: "contract" }))).toBe(true);
    expect(hasActiveFilters(f({ location: "Remote" }))).toBe(true);
  });
});

describe("filter options", () => {
  const jobs = [
    job(1, { employmentType: "internship", location: "Colombo" }),
    job(2, { employmentType: "full_time", location: "Remote" }),
    job(3, { employmentType: "full_time", location: null }),
    job(4, { employmentType: "full_time", location: "Colombo" }),
  ];

  it("lists only the job types that exist, in a familiar order", () => {
    expect(employmentTypesIn(jobs)).toEqual(["full_time", "internship"]);
  });

  it("lists each place once, A to Z, leaving out roles with none", () => {
    expect(locationsIn(jobs)).toEqual(["Colombo", "Remote"]);
  });
});

describe("groupByDepartment", () => {
  it("orders departments A to Z and puts the newest role first inside each", () => {
    const groups = groupByDepartment([
      job(1, { departmentName: "Engineering", createdAt: "2026-09-01T00:00:00Z" }),
      job(2, { departmentName: "Design", createdAt: "2026-09-02T00:00:00Z" }),
      job(3, { departmentName: "Engineering", createdAt: "2026-09-05T00:00:00Z" }),
    ]);
    expect(groups.map((g) => g.department)).toEqual(["Design", "Engineering"]);
    expect(groups[1].jobs.map((j) => j.id)).toEqual([3, 1]);
  });
});
