import type { Template } from "@/types";

/** Settings UI keys; `assessment` maps to API `assessment_invite`. Ordered by typical candidate journey. */
export type TemplateTypeUi =
  | "application_received"
  | "assessment"
  | "assessment_completion"
  | "interview_invite"
  | "offer"
  | "rejection"
  | "general";

/** Funnel order: apply → assess → complete → interview → offer / rejection → ad-hoc. */
export const TEMPLATE_TYPE_ORDER: TemplateTypeUi[] = [
  "application_received",
  "assessment",
  "assessment_completion",
  "interview_invite",
  "offer",
  "rejection",
  "general",
];

export function apiTemplateTypeToUi(type: Template["type"]): TemplateTypeUi {
  if (type === "assessment_invite") return "assessment";
  return type as TemplateTypeUi;
}

export function uiTemplateTypeToApi(ui: TemplateTypeUi): Template["type"] {
  if (ui === "assessment") return "assessment_invite";
  return ui as Template["type"];
}

export const TYPE_META: Record<
  TemplateTypeUi,
  { label: string; badge: string }
> = {
  application_received: {
    label: "Application received",
    badge:
      "bg-violet-50 text-violet-800 border border-violet-200 dark:bg-violet-950/35 dark:text-violet-300 dark:border-violet-800",
  },
  assessment: {
    label: "Assessment Invite",
    badge:
      "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  },
  assessment_completion: {
    label: "Assessment completion",
    badge:
      "bg-cyan-50 text-cyan-800 border border-cyan-200 dark:bg-cyan-950/35 dark:text-cyan-300 dark:border-cyan-800",
  },
  interview_invite: {
    label: "Interview invite",
    badge:
      "bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/35 dark:text-indigo-300 dark:border-indigo-800",
  },
  offer: {
    label: "Offer Letter",
    badge:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  },
  rejection: {
    label: "Rejection",
    badge:
      "bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
  },
  general: {
    label: "General",
    badge:
      "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700",
  },
};

/** One-line helper for the “new template” type picker. */
export const TEMPLATE_TYPE_SHORT_DESC: Record<TemplateTypeUi, string> = {
  application_received: "Confirmation when someone applies to a job",
  assessment: "Send quiz or assessment invitations",
  assessment_completion: "After a candidate submits an assessment",
  interview_invite: "Interview time, location, and video link",
  offer: "Offer letters with salary & start date",
  rejection: "Notify candidates who were not selected",
  general: "Any other candidate communication",
};

export const VARIABLES: Record<TemplateTypeUi, string[]> = {
  application_received: [
    "candidate_name",
    "job_title",
    "company_name",
  ],
  assessment: [
    "candidate_name",
    "job_title",
    "company_name",
    "assessment_title",
    "assessment_link",
    "expiry_date",
  ],
  assessment_completion: [
    "candidate_name",
    "job_title",
    "company_name",
    "assessment_title",
    "score_percentage",
    "score_summary",
    "passed",
    "auto_submit_reason",
  ],
  interview_invite: [
    "candidate_name",
    "job_title",
    "company_name",
    "interview_date",
    "interview_time",
    "interview_location",
    "video_link",
    "interviewer_names",
  ],
  offer: [
    "candidate_name",
    "job_title",
    "salary",
    "currency",
    "pay_frequency",
    "start_date",
    "expiry_date",
    "benefits",
    "company_name",
  ],
  rejection: ["candidate_name", "job_title", "company_name"],
  general: [
    "candidate_name",
    "job_title",
    "salary",
    "currency",
    "start_date",
    "expiry_date",
    "benefits",
    "company_name",
    "assessment_link",
  ],
};
