import { describe, it, expect } from "vitest";
import {
  canEditOffer,
  formatMoney,
  formValuesToPayload,
  getMissingFields,
  getOfferSteps,
  offerToFormValues,
  type OfferFormValues,
} from "@/app/(dashboard)/candidates/[id]/lib/offer-utils";
import type { Offer } from "@/types";

const offer = (over: Partial<Offer> = {}): Offer => ({
  id: 1,
  candidateId: 1,
  jobId: 1,
  templateId: null,
  status: "draft",
  salary: "60000.00",
  currency: "USD",
  employmentType: "internship",
  startDate: "2026-09-13",
  reportingManager: "Jane Smith",
  benefits: "Health cover",
  offerLetterHtml: "<p>Hello</p>",
  sentAt: null,
  viewedAt: null,
  acceptedAt: null,
  declinedAt: null,
  createdAt: "2026-09-09T09:00:00.000Z",
  updatedAt: "2026-09-09T09:00:00.000Z",
  ...over,
});

const complete: OfferFormValues = offerToFormValues(offer());

describe("getMissingFields", () => {
  it("finds nothing missing on a complete offer", () => {
    expect(getMissingFields(complete)).toEqual([]);
  });

  it("flags blank and whitespace-only fields", () => {
    expect(
      getMissingFields({ ...complete, reportingManager: "   ", benefits: "", startDate: "" }),
    ).toEqual(["startDate", "reportingManager", "benefits"]);
  });

  it("flags a zero, negative or empty salary", () => {
    expect(getMissingFields({ ...complete, salary: "0" })).toEqual(["salary"]);
    expect(getMissingFields({ ...complete, salary: "-5" })).toEqual(["salary"]);
    expect(getMissingFields({ ...complete, salary: "" })).toEqual(["salary"]);
  });

  it("does not require a template", () => {
    expect(getMissingFields({ ...complete, templateId: "" })).toEqual([]);
  });
});

describe("formValuesToPayload", () => {
  it("never includes a status, so saving cannot change one", () => {
    expect(formValuesToPayload(complete)).not.toHaveProperty("status");
  });

  it("turns blanks into null and trims text", () => {
    const payload = formValuesToPayload({
      ...complete,
      reportingManager: "  Jane  ",
      benefits: "  ",
      templateId: "",
    });
    expect(payload.reportingManager).toBe("Jane");
    expect(payload.benefits).toBeNull();
    expect(payload.templateId).toBeNull();
  });
});

describe("canEditOffer", () => {
  it("allows edits until the candidate has answered", () => {
    expect(["draft", "sent", "viewed"].every((s) => canEditOffer(s as Offer["status"]))).toBe(true);
    expect(["accepted", "declined", "expired"].some((s) => canEditOffer(s as Offer["status"]))).toBe(false);
  });
});

describe("formatMoney", () => {
  it("formats whole amounts without decimals", () => {
    expect(formatMoney("60000.00", "USD")).toBe("$60,000");
    expect(formatMoney(75000, "EUR")).toBe("€75,000");
  });

  it("keeps decimals when there are some", () => {
    expect(formatMoney(1234.5, "USD")).toBe("$1,234.50");
  });

  it("falls back for a code Intl does not know, and returns null for no salary", () => {
    expect(formatMoney(5000, "ZZZZ")).toBe("ZZZZ 5,000");
    expect(formatMoney(null, "USD")).toBeNull();
  });
});

describe("getOfferSteps", () => {
  const states = (o: Offer) => getOfferSteps(o).map((s) => s.state);

  it("a draft is waiting to be sent", () => {
    expect(states(offer())).toEqual(["done", "current", "upcoming", "upcoming"]);
  });

  it("a sent offer is waiting to be viewed", () => {
    expect(states(offer({ status: "sent", sentAt: "2026-09-09T10:00:00Z" }))).toEqual([
      "done", "done", "current", "upcoming",
    ]);
  });

  it("a viewed offer is awaiting the answer", () => {
    const steps = getOfferSteps(
      offer({ status: "viewed", sentAt: "2026-09-09T10:00:00Z", viewedAt: "2026-09-09T10:05:00Z" }),
    );
    expect(steps.map((s) => s.state)).toEqual(["done", "done", "done", "current"]);
    expect(steps[3].label).toBe("Awaiting response");
  });

  it("an accepted offer completes every step", () => {
    const steps = getOfferSteps(
      offer({
        status: "accepted",
        sentAt: "2026-09-09T10:00:00Z",
        viewedAt: "2026-09-09T10:05:00Z",
        acceptedAt: "2026-09-09T10:10:00Z",
      }),
    );
    expect(steps.map((s) => s.state)).toEqual(["done", "done", "done", "done"]);
    expect(steps[3].label).toBe("Accepted");
    expect(steps[3].date).toBe("2026-09-09T10:10:00Z");
  });

  it("a declined offer ends in a negative step", () => {
    const steps = getOfferSteps(
      offer({ status: "declined", sentAt: "2026-09-09T10:00:00Z", declinedAt: "2026-09-09T11:00:00Z" }),
    );
    expect(steps[3]).toMatchObject({ label: "Declined", state: "negative" });
  });

  it("does not leave 'Viewed' looking pending once the candidate has answered without it", () => {
    const steps = getOfferSteps(
      offer({ status: "accepted", sentAt: "2026-09-09T10:00:00Z", acceptedAt: "2026-09-09T10:10:00Z" }),
    );
    expect(steps[2].state).toBe("upcoming");
  });
});
