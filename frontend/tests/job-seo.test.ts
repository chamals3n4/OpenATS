import { afterEach, describe, expect, it, vi } from "vitest";
import {
  careersMetadata,
  jobMetadata,
  jobPostingData,
  serializeJsonLd,
  summarize,
} from "@/app/careers/_lib/job-seo";
import type { Job } from "@/types";

const job = {
  id: 7,
  title: "Backend Engineer",
  employmentType: "full_time",
  location: "Colombo",
  description: "<p>Build &amp; run the <strong>API</strong>.</p>",
  salaryType: null,
  currency: null,
  payFrequency: null,
  salaryFixed: null,
  salaryMin: null,
  salaryMax: null,
  createdAt: "2026-10-01T00:00:00.000Z",
} as Job;

const company = { name: "Acme", logoUrl: "https://cdn.test/logo.png", description: null, website: "https://acme.test" };

afterEach(() => vi.unstubAllEnvs());

describe("summarize", () => {
  it("turns the description into plain text", () => {
    expect(summarize(job.description)).toBe("Build & run the API .");
  });

  it("stops at a word and marks the cut", () => {
    const summary = summarize(`<p>${"word ".repeat(100)}</p>`);

    expect(summary.length).toBeLessThanOrEqual(160);
    expect(summary).toMatch(/word…$/);
  });

  it("copes with no description", () => {
    expect(summarize(null)).toBe("");
  });
});

describe("jobMetadata", () => {
  it("names the job and company and links to the job", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://jobs.acme.test/");

    const meta = jobMetadata(job, company);

    expect(meta.title).toBe("Backend Engineer at Acme");
    expect(meta.openGraph?.url).toBe("https://jobs.acme.test/careers/7");
    expect(meta.alternates?.canonical).toBe("https://jobs.acme.test/careers/7");
  });

  it("falls back to the job alone without a company or description", () => {
    const meta = jobMetadata({ ...job, description: null }, null);

    expect(meta.title).toBe("Backend Engineer");
    expect(meta.description).toBe("Apply for Backend Engineer.");
  });
});

describe("careersMetadata", () => {
  it("names the company", () => {
    expect(careersMetadata(company).title).toBe("Careers at Acme");
  });
});

describe("jobPostingData", () => {
  it("has what Google requires", () => {
    expect(jobPostingData(job, company)).toMatchObject({
      "@type": "JobPosting",
      title: "Backend Engineer",
      datePosted: job.createdAt,
      employmentType: "FULL_TIME",
      hiringOrganization: { name: "Acme", sameAs: "https://acme.test" },
      jobLocation: { address: { addressLocality: "Colombo" } },
    });
  });

  it("gives nothing without an employer", () => {
    expect(jobPostingData(job, null)).toBeNull();
  });

  it("treats only a plainly remote job as remote", () => {
    expect(jobPostingData({ ...job, location: "Remote" }, company)).toMatchObject({ jobLocationType: "TELECOMMUTE" });
    expect(jobPostingData({ ...job, location: "Colombo (Remote)" }, company)).not.toHaveProperty("jobLocationType");
  });

  it("gives a salary range", () => {
    const posting = jobPostingData(
      { ...job, salaryType: "range", currency: "USD", payFrequency: "yearly", salaryMin: "100", salaryMax: "200" },
      company,
    );

    expect(posting?.baseSalary).toMatchObject({
      currency: "USD",
      value: { unitText: "YEAR", minValue: 100, maxValue: 200 },
    });
  });

  it("gives a fixed salary", () => {
    const posting = jobPostingData(
      { ...job, salaryType: "fixed", currency: "LKR", payFrequency: "monthly", salaryFixed: "500" },
      company,
    );

    expect(posting?.baseSalary?.value).toMatchObject({ unitText: "MONTH", value: 500 });
  });
});

describe("serializeJsonLd", () => {
  it("cannot be used to close the script tag", () => {
    const text = serializeJsonLd({ description: "</script><script>alert(1)</script>" });

    expect(text).not.toContain("<");
    expect(JSON.parse(text).description).toContain("</script>");
  });
});
