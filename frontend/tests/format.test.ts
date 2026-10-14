import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDate, formatDateTime, formatSalary, formatTime, timeAgo } from "@/lib/format";
import type { JobDetail } from "@/types";

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("reads as minutes, hours, then days", () => {
    expect(timeAgo("2026-10-14T11:59:40Z")).toBe("just now");
    expect(timeAgo("2026-10-14T11:55:00Z")).toBe("5m ago");
    expect(timeAgo("2026-10-14T09:00:00Z")).toBe("3h ago");
    expect(timeAgo("2026-10-12T12:00:00Z")).toBe("2d ago");
  });
});

describe("dates and times", () => {
  it("formats a date the same way everywhere", () => {
    expect(formatDate("2026-10-14T12:00:00")).toBe("Oct 14, 2026");
  });

  it("shows a dash when there is no date", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });

  it("formats a date and time", () => {
    expect(formatDateTime("2026-10-14T14:30:00")).toBe("Oct 14, 2026, 2:30 PM");
  });

  it("formats a time, empty when missing", () => {
    expect(formatTime("2026-10-14T09:05:00")).toBe("9:05 AM");
    expect(formatTime(null)).toBe("");
  });
});

describe("formatSalary", () => {
  const job = (overrides: Partial<JobDetail>) =>
    ({ currency: "LKR", payFrequency: "monthly", ...overrides }) as JobDetail;

  it("shows a range", () => {
    expect(
      formatSalary(job({ salaryType: "range", salaryMin: "100000", salaryMax: "150000" })),
    ).toBe("LKR 100,000 – 150,000/monthly");
  });

  it("shows a fixed amount", () => {
    expect(formatSalary(job({ salaryType: "fixed", salaryFixed: "120000" }))).toBe(
      "LKR 120,000/monthly",
    );
  });

  it("leaves out the frequency when there is none", () => {
    expect(
      formatSalary(job({ salaryType: "fixed", salaryFixed: "120000", payFrequency: null })),
    ).toBe("LKR 120,000");
  });

  it("is null for a job with no salary", () => {
    expect(formatSalary(job({ salaryType: null }))).toBeNull();
  });
});
