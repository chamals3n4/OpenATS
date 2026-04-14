import type { Template } from "@/types";

export type EmailTemplateType = Template["type"];

/** Order in the "What type of template is this?" modal */
export const EMAIL_TEMPLATE_TYPE_PICKER_ORDER: EmailTemplateType[] = [
  "application_received",
  "assessment_invite",
  "offer",
  "rejection",
  "general",
];

export const EMAIL_TEMPLATE_TYPE_CONFIG: Record<
  EmailTemplateType,
  { label: string; badge: string; description: string }
> = {
  application_received: {
    label: "Application received",
    badge:
      "bg-violet-600 text-white border border-violet-600 shadow-none dark:bg-violet-600 dark:text-white dark:border-violet-500",
    description: "Confirmation when someone applies to a job",
  },
  assessment_invite: {
    label: "Assessment Invite",
    badge:
      "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800",
    description: "Send quiz or assessment invitations",
  },
  offer: {
    label: "Offer Letter",
    badge:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    description: "Offer letters with salary & start date",
  },
  rejection: {
    label: "Rejection",
    badge:
      "bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
    description: "Notify candidates who weren't selected",
  },
  general: {
    label: "General",
    badge:
      "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700",
    description: "Any other candidate communication",
  },
};

export const EMAIL_TEMPLATE_VARIABLES: Record<EmailTemplateType, string[]> = {
  application_received: ["candidate_name", "job_title", "company_name"],
  assessment_invite: [
    "candidate_name",
    "job_title",
    "assessment_link",
    "expiry_date",
    "interview_date",
    "interview_time",
    "interview_timezone",
    "interview_location",
    "interview_video_link",
    "interview_interviewers",
  ],
  offer: [
    "candidate_name",
    "job_title",
    "salary",
    "currency",
    "start_date",
    "expiry_date",
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
    "company_name",
    "assessment_link",
    "interview_date",
    "interview_time",
    "interview_timezone",
    "interview_location",
    "interview_video_link",
    "interview_interviewers",
  ],
};

const VALID = new Set<string>(Object.keys(EMAIL_TEMPLATE_TYPE_CONFIG));

/** Maps legacy `?type=assessment` URLs to `assessment_invite`. */
export function normalizeEmailTemplateTypeParam(
  raw: string | null,
): EmailTemplateType {
  if (!raw) return "general";
  if (raw === "assessment") return "assessment_invite";
  if (VALID.has(raw)) return raw as EmailTemplateType;
  return "general";
}
