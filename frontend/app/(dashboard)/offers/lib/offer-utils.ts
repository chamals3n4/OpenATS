import type { Offer } from "@/types";

export const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  draft: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-600 dark:text-amber-400",
  },
  sent: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-600 dark:text-blue-400",
  },
  viewed: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-600 dark:text-purple-400",
  },
  accepted: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  declined: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-500 dark:text-red-400",
  },
  expired: {
    bg: "bg-slate-100 dark:bg-neutral-800",
    text: "text-slate-500 dark:text-neutral-400",
  },
};

export function getStatusStyle(status: string) {
  return STATUS_BADGE[status] ?? STATUS_BADGE.draft;
}

export function fmtSalary(offer: Offer): string {
  if (!offer.salary) return "—";
  return `${offer.currency ?? ""} ${Number(offer.salary).toLocaleString()}`.trim();
}

export function fmtDate(val: string | null): string {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function capitalizeStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Note: These types depend on your API response shape.
// If your API returns nested candidate/job objects, update the Offer type
// or use these helper types:
export interface OfferWithRelations extends Offer {
  candidate?: {
    firstName: string;
    lastName: string;
  } | null;
  job?: {
    id: number;
    title: string;
  } | null;
}

export function getCandidateName(offer: OfferWithRelations): string {
  const c = offer.candidate;
  if (!c) return "—";
  return `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
}

export function getJobTitle(offer: OfferWithRelations): string {
  return offer.job?.title ?? "—";
}
