import type { PublicOfferView } from "@/types";

export const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400",
  },
  sent: {
    label: "Awaiting Response",
    className: "bg-(--theme-color)/10 text-[var(--theme-color)]",
  },
  viewed: {
    label: "Awaiting Response",
    className: "bg-(--theme-color)/10 text-[var(--theme-color)]",
  },
  accepted: {
    label: "Accepted",
    className: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
  },
  declined: {
    label: "Declined",
    className: "bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400",
  },
  expired: {
    label: "Expired",
    className: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
  },
};

// Candidate facing wording, so not the dashboard labels
const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

export function fmtCurrency(value: number | string | null): string {
  if (value == null) return "—";
  return Number(value).toLocaleString("en-US");
}

export function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Date and time in the reader's time zone */
export function fmtDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/** Can the candidate still accept or decline */
export function canRespond(offer: PublicOfferView): boolean {
  return offer.status === "sent" || offer.status === "viewed";
}

/** The label and value rows shown in the details box */
export function offerDetails(offer: PublicOfferView): { label: string; value: string }[] {
  return [
    {
      label: "Salary",
      value: offer.currency
        ? `${offer.currency} ${fmtCurrency(offer.salary)}`
        : fmtCurrency(offer.salary),
    },
    {
      label: "Employment type",
      value: offer.employmentType
        ? (EMPLOYMENT_LABELS[offer.employmentType] ?? offer.employmentType)
        : "—",
    },
    { label: "Start date", value: fmtDate(offer.startDate) },
    { label: "Reporting manager", value: offer.reportingManager || "—" },
  ];
}
