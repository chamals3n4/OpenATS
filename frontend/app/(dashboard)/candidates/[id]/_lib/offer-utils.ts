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
  /** Respond by date as YYYY-MM-DD, empty for none */
  expiresOn: string;
  reportingManager: string;
  benefits: string;
  offerLetterHtml: string;
}

export type OfferFieldKey = keyof OfferFormValues;

/** Everything except the template is required to send */
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
  expiresOn: "Respond by",
  reportingManager: "Reporting manager",
  benefits: "Benefits",
  offerLetterHtml: "Offer letter",
};

/** Date as YYYY-MM-DD */
export function toDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** End of the chosen day in local time */
export function endOfDay(dateInput: string): string | null {
  if (!dateInput) return null;
  const [year, month, day] = dateInput.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 23, 59, 59).toISOString();
}

/** e.g. "Friday, October 16, 2026", or null */
export function formatRespondBy(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  return new Date(expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function offerToFormValues(offer: Offer): OfferFormValues {
  return {
    templateId: offer.templateId ? String(offer.templateId) : "",
    currency: offer.currency ?? "USD",
    salary: offer.salary ? String(Number(offer.salary)) : "",
    employmentType: offer.employmentType ?? "full_time",
    startDate: offer.startDate ?? "",
    expiresOn: offer.expiresAt ? toDateInput(new Date(offer.expiresAt)) : "",
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

/** Status is left out so saving doesn't change it */
export function formValuesToPayload(values: OfferFormValues): Partial<Offer> {
  return {
    templateId: values.templateId ? Number(values.templateId) : null,
    salary: values.salary ? Number(values.salary) : null,
    currency: values.currency || null,
    employmentType: values.employmentType,
    startDate: values.startDate || null,
    expiresAt: endOfDay(values.expiresOn),
    reportingManager: values.reportingManager.trim() || null,
    benefits: values.benefits.trim() || null,
    offerLetterHtml: values.offerLetterHtml.trim() || null,
  };
}

/** Editable until the candidate answers */
export function canEditOffer(status: Offer["status"]) {
  return status === "draft" || status === "sent" || status === "viewed";
}

/** Format money, with a fallback for unknown currencies */
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

/** Offer steps: created, sent, viewed, answered */
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
              // Only one active step
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

  // Answered without opening, so don't show Viewed as pending
  return steps.map((step) =>
    answered && step.key === "viewed" && !step.date
      ? { ...step, state: "upcoming" }
      : step,
  );
}
