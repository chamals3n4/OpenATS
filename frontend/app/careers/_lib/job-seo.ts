import type { Metadata } from "next";
import { appUrl } from "@/lib/app-url";
import type { Job } from "@/types";
import type { CompanyInfo } from "./careers-api";

const DESCRIPTION_LENGTH = 160;

const EMPLOYMENT_TYPES: Record<Job["employmentType"], string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  internship: "INTERN",
  freelance: "CONTRACTOR",
};

const PAY_UNITS: Record<string, string> = {
  hourly: "HOUR",
  daily: "DAY",
  weekly: "WEEK",
  monthly: "MONTH",
  yearly: "YEAR",
};

/** The job's description as one short line of text */
export function summarize(html: string | null): string {
  const text = (html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= DESCRIPTION_LENGTH) return text;
  return `${text.slice(0, DESCRIPTION_LENGTH - 1).replace(/\s+\S*$/, "")}…`;
}

export function jobMetadata(job: Job, company: CompanyInfo | null): Metadata {
  const title = company ? `${job.title} at ${company.name}` : job.title;
  const description = summarize(job.description) || `Apply for ${title}.`;
  const url = `${appUrl()}/careers/${job.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      ...(company ? { siteName: company.name } : {}),
      ...(company?.logoUrl ? { images: [company.logoUrl] } : {}),
    },
    twitter: { card: "summary", title, description },
  };
}

export function careersMetadata(company: CompanyInfo | null): Metadata {
  const title = company ? `Careers at ${company.name}` : "Careers";
  const description = company?.description
    ? summarize(company.description)
    : `Open roles${company ? ` at ${company.name}` : ""}.`;
  const url = `${appUrl()}/careers`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
  };
}

function baseSalary(job: Job) {
  const unitText = job.payFrequency ? PAY_UNITS[job.payFrequency] : undefined;
  if (!job.salaryType || !job.currency || !unitText) return undefined;

  const value =
    job.salaryType === "fixed"
      ? { value: Number(job.salaryFixed) }
      : { minValue: Number(job.salaryMin), maxValue: Number(job.salaryMax) };

  return {
    "@type": "MonetaryAmount",
    currency: job.currency,
    value: { "@type": "QuantitativeValue", unitText, ...value },
  };
}

function place(location: string | null) {
  if (!location) return {};
  // Only a job that says plainly it is remote: "Colombo (Remote)" still has a place
  if (/^remote$/i.test(location.trim())) return { jobLocationType: "TELECOMMUTE" };
  return {
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: location },
    },
  };
}

/** The data Google reads to list a job. Google needs the employer, so null without one */
export function jobPostingData(job: Job, company: CompanyInfo | null) {
  if (!company) return null;

  const salary = baseSalary(job);
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description || job.title,
    datePosted: job.createdAt,
    employmentType: EMPLOYMENT_TYPES[job.employmentType],
    directApply: true,
    url: `${appUrl()}/careers/${job.id}`,
    hiringOrganization: {
      "@type": "Organization",
      name: company.name,
      ...(company.website ? { sameAs: company.website } : {}),
      ...(company.logoUrl ? { logo: company.logoUrl } : {}),
    },
    ...place(job.location),
    ...(salary ? { baseSalary: salary } : {}),
  };
}

/** For a script tag: a job description must not be able to close it */
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
