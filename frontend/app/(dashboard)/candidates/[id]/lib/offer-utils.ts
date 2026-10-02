import type { Offer } from "@/types";

export type EmploymentType = NonNullable<Offer["employmentType"]>;

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

export interface OfferFormValues {
  templateId: string;
  currency: string;
  salary: string;
  employmentType: EmploymentType;
  startDate: string;
  reportingManager: string;
  benefits: string;
  offerLetterHtml: string;
}

export type OfferFieldKey = keyof OfferFormValues;

/** Everything except the template must be filled in before an offer can be sent. */
export const REQUIRED_TO_SEND: OfferFieldKey[] = [
  "salary",
  "currency",
  "employmentType",
  "startDate",
  "reportingManager",
  "benefits",
  "offerLetterHtml",
];

export const OFFER_FIELD_LABELS: Record<OfferFieldKey, string> = {
  templateId: "Template",
  currency: "Currency",
  salary: "Salary",
  employmentType: "Employment type",
  startDate: "Start date",
  reportingManager: "Reporting manager",
  benefits: "Benefits",
  offerLetterHtml: "Offer letter",
};

export function offerToFormValues(offer: Offer): OfferFormValues {
  return {
    templateId: offer.templateId ? String(offer.templateId) : "",
    currency: offer.currency ?? "USD",
    salary: offer.salary ? String(Number(offer.salary)) : "",
    employmentType: offer.employmentType ?? "full_time",
    startDate: offer.startDate ?? "",
    reportingManager: offer.reportingManager ?? "",
    benefits: offer.benefits ?? "",
    offerLetterHtml: offer.offerLetterHtml ?? "",
  };
}

export function getMissingFields(values: OfferFormValues): OfferFieldKey[] {
  return REQUIRED_TO_SEND.filter((key) => {
    const value = values[key];
    if (key === "salary") return !(Number(value) > 0);
    return !String(value).trim();
  });
}

/** Payload for saving. The status is deliberately left out so saving never changes it. */
export function formValuesToPayload(values: OfferFormValues): Partial<Offer> {
  return {
    templateId: values.templateId ? Number(values.templateId) : null,
    salary: values.salary ? Number(values.salary) : null,
    currency: values.currency || null,
    employmentType: values.employmentType,
    startDate: values.startDate || null,
    reportingManager: values.reportingManager.trim() || null,
    benefits: values.benefits.trim() || null,
    offerLetterHtml: values.offerLetterHtml.trim() || null,
  };
}

/** Terms can change until the candidate has answered (the backend allows it; the UI follows). */
export function canEditOffer(status: Offer["status"]) {
  return status === "draft" || status === "sent" || status === "viewed";
}

/** "$60,000", falling back to "XYZ 60,000" for a currency code Intl does not know. */
export function formatMoney(salary: number | string | null, currency: string | null) {
  if (salary === null || salary === "" || Number.isNaN(Number(salary))) return null;
  const amount = Number(salary);
  const digits = Number.isInteger(amount) ? 0 : 2;
  if (currency) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString("en-US")}`;
    }
  }
  return amount.toLocaleString("en-US");
}

export type StepState = "done" | "current" | "upcoming" | "negative";

export interface OfferStep {
  key: "created" | "sent" | "viewed" | "outcome";
  label: string;
  date: string | null;
  state: StepState;
}

/** The offer's journey as four steps: created, sent, viewed, then the candidate's answer. */
export function getOfferSteps(offer: Offer): OfferStep[] {
  const answered = offer.status === "accepted" || offer.status === "declined" || offer.status === "expired";

  const outcome: OfferStep =
    offer.status === "accepted"
      ? { key: "outcome", label: "Accepted", date: offer.acceptedAt, state: "done" }
      : offer.status === "declined"
        ? { key: "outcome", label: "Declined", date: offer.declinedAt, state: "negative" }
        : offer.status === "expired"
          ? { key: "outcome", label: "Expired", date: null, state: "negative" }
          : {
              key: "outcome",
              label: "Awaiting response",
              date: null,
              // Only one step is ever active: the answer is awaited once the offer has been seen.
              state: offer.status === "viewed" ? "current" : "upcoming",
            };

  const steps: OfferStep[] = [
    { key: "created", label: "Created", date: offer.createdAt, state: "done" },
    {
      key: "sent",
      label: "Sent",
      date: offer.sentAt,
      state: offer.sentAt ? "done" : offer.status === "draft" ? "current" : "upcoming",
    },
    {
      key: "viewed",
      label: "Viewed",
      date: offer.viewedAt,
      state: offer.viewedAt ? "done" : offer.status === "sent" ? "current" : "upcoming",
    },
    outcome,
  ];

  // Answered without ever opening it: don't leave "Viewed" looking like it is still pending.
  return steps.map((step) =>
    answered && step.key === "viewed" && !step.date
      ? { ...step, state: "upcoming" }
      : step,
  );
}
