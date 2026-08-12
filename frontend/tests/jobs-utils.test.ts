import { describe, it, expect } from "vitest";
import { buildJobPayload } from "@/lib/jobs-utils";

const base = {
  title: "  Senior Engineer  ",
  departmentId: 3,
  employmentType: "full_time" as const,
  location: "",
  description: "",
  skills: [] as string[],
  isSalaryInfoIncluded: false,
  salaryType: "fixed" as const,
  currency: "USD",
  payFrequency: "yearly",
  salaryMin: "",
  salaryMax: "",
  salaryFixed: "",
};

describe("buildJobPayload", () => {
  it("trims the title and always starts a job as a draft", () => {
    const payload = buildJobPayload(base);

    expect(payload.title).toBe("Senior Engineer");
    expect(payload.status).toBe("draft");
  });

  it("sends undefined rather than empty strings for optional text", () => {
    const payload = buildJobPayload(base);

    expect(payload.location).toBeUndefined();
    expect(payload.description).toBeUndefined();
  });

  it("clears every salary field when salary info is switched off", () => {
    const payload = buildJobPayload({
      ...base,
      isSalaryInfoIncluded: false,
      salaryFixed: "120000",
      salaryMin: "100000",
      salaryMax: "150000",
    });

    expect(payload.salaryType).toBeNull();
    expect(payload.currency).toBeNull();
    expect(payload.salaryFixed).toBeNull();
    expect(payload.salaryMin).toBeNull();
    expect(payload.salaryMax).toBeNull();
  });

  it("strips thousands separators from a fixed salary", () => {
    const payload = buildJobPayload({
      ...base,
      isSalaryInfoIncluded: true,
      salaryType: "fixed",
      salaryFixed: "120,000",
    });

    expect(payload.salaryFixed).toBe(120000);
    expect(payload.salaryMin).toBeNull();
  });

  it("keeps min and max for a salary range", () => {
    const payload = buildJobPayload({
      ...base,
      isSalaryInfoIncluded: true,
      salaryType: "range",
      salaryMin: "100,000",
      salaryMax: "150,000",
    });

    expect(payload.salaryType).toBe("range");
    expect(payload.salaryMin).toBe(100000);
    expect(payload.salaryMax).toBe(150000);
    expect(payload.salaryFixed).toBeNull();
  });

  it("falls back to no salary when a range is only half filled", () => {
    const payload = buildJobPayload({
      ...base,
      isSalaryInfoIncluded: true,
      salaryType: "range",
      salaryMin: "100000",
      salaryMax: "",
    });

    expect(payload.salaryType).toBeNull();
    expect(payload.salaryMin).toBeNull();
  });

  it("treats an unparseable salary as absent instead of NaN", () => {
    const payload = buildJobPayload({
      ...base,
      isSalaryInfoIncluded: true,
      salaryType: "fixed",
      salaryFixed: "not a number",
    });

    expect(payload.salaryFixed).toBeNull();
  });
});
