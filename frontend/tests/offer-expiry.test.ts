import { describe, it, expect } from "vitest";
import {
  endOfDay,
  formValuesToPayload,
  offerToFormValues,
  toDateInput,
} from "@/app/(dashboard)/candidates/[id]/_lib/offer-utils";
import type { Offer } from "@/types";

const offer = (expiresAt: string | null): Offer =>
  ({
    id: 1,
    candidateId: 1,
    jobId: 1,
    templateId: null,
    status: "draft",
    salary: "1000",
    currency: "USD",
    employmentType: "full_time",
    startDate: "2026-12-01",
    expiresAt,
    reportingManager: "Jane",
    benefits: "Leave",
    offerLetterHtml: "<p>Offer</p>",
  }) as Offer;

describe("the respond-by date of an offer", () => {
  it("keeps the offer open for the whole of the chosen day", () => {
    const end = new Date(endOfDay("2026-11-20")!);
    expect(toDateInput(end)).toBe("2026-11-20");
    expect([end.getHours(), end.getMinutes(), end.getSeconds()]).toEqual([23, 59, 59]);
  });

  it("is no date when the field is empty", () => {
    expect(endOfDay("")).toBeNull();
    expect(formValuesToPayload(offerToFormValues(offer(null))).expiresAt).toBeNull();
  });

  it("comes back from a saved offer as the same day", () => {
    const saved = endOfDay("2026-11-20")!;
    const values = offerToFormValues(offer(saved));

    expect(values.expiresOn).toBe("2026-11-20");
    expect(formValuesToPayload(values).expiresAt).toBe(saved);
  });
});
