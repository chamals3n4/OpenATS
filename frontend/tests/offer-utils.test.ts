import { describe, it, expect } from "vitest";
import {
  capitalizeStatus,
  fmtDate,
  fmtSalary,
  getCandidateName,
  getJobTitle,
  getStatusStyle,
} from "@/app/(dashboard)/offers/lib/offer-utils";
import type { Offer, OfferWithRelations } from "@/types";

const offer = (over: Partial<OfferWithRelations> = {}): OfferWithRelations =>
  ({
    id: 1,
    candidateId: 1,
    jobId: 1,
    templateId: null,
    status: "draft",
    salary: null,
    currency: null,
    employmentType: null,
    startDate: null,
    reportingManager: null,
    benefits: null,
    offerLetterHtml: null,
    sentAt: null,
    viewedAt: null,
    acceptedAt: null,
    declinedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  }) as OfferWithRelations;

describe("fmtSalary", () => {
  it("shows a dash when there is no salary", () => {
    expect(fmtSalary(offer() as Offer)).toBe("—");
  });

  it("groups thousands and keeps the currency", () => {
    expect(fmtSalary(offer({ salary: 120000, currency: "USD" }) as Offer)).toBe(
      "USD 120,000",
    );
  });

  it("handles a salary the API returned as a string", () => {
    expect(fmtSalary(offer({ salary: "95000", currency: "EUR" }) as Offer)).toBe(
      "EUR 95,000",
    );
  });

  it("omits a missing currency without leaving a leading space", () => {
    expect(fmtSalary(offer({ salary: 5000 }) as Offer)).toBe("5,000");
  });
});

describe("fmtDate", () => {
  it("shows a dash for null", () => {
    expect(fmtDate(null)).toBe("—");
  });

  it("formats an ISO date", () => {
    expect(fmtDate("2026-03-09T00:00:00.000Z")).toMatch(/Mar/);
  });
});

describe("getStatusStyle", () => {
  it("returns the style for a known status", () => {
    expect(getStatusStyle("accepted")).toBe(getStatusStyle("accepted"));
    expect(getStatusStyle("accepted").text).toContain("emerald");
  });

  it("falls back to the draft style for anything unknown", () => {
    expect(getStatusStyle("no-such-status")).toEqual(getStatusStyle("draft"));
  });
});

describe("capitalizeStatus", () => {
  it("capitalizes the first letter only", () => {
    expect(capitalizeStatus("declined")).toBe("Declined");
  });
});

describe("candidate and job names", () => {
  it("joins the candidate name", () => {
    const withCandidate = offer({
      candidate: { firstName: "Ada", lastName: "Lovelace" },
    });
    expect(getCandidateName(withCandidate)).toBe("Ada Lovelace");
  });

  it("shows a dash when the relation is missing", () => {
    expect(getCandidateName(offer())).toBe("—");
    expect(getJobTitle(offer())).toBe("—");
  });

  it("reads the job title from the relation", () => {
    expect(getJobTitle(offer({ job: { id: 2, title: "Engineer" } }))).toBe(
      "Engineer",
    );
  });
});
