import type { Template } from "@/types";

export type EmailTemplateType = Template["type"];

/** Order in the "What type of template is this?" modal */
export const EMAIL_TEMPLATE_TYPE_PICKER_ORDER: EmailTemplateType[] = [
  "application_received",
  "assessment_invite",
  "assessment_completion",
  "interview_invite",
  "offer",
  "offer_withdrawal",
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
      "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
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
  offer_withdrawal: {
    label: "Offer Withdrawal",
    badge:
      "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
    description: "Sent to candidates when their offer is withdrawn",
  },
  rejection: {
    label: "Rejection",
    badge:
      "bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
    description: "Notify candidates who weren't selected",
  },
  assessment_completion: {
    label: "Assessment completion",
    badge:
      "bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
    description: "After a candidate submits an assessment",
  },
  interview_invite: {
    label: "Interview invite",
    badge:
      "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    description: "Interview time, location, and video link",
  },
  general: {
    label: "General",
    badge:
      "bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-700",
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
    "benefits",
    "start_date",
    "expiry_date",
    "company_name",
  ],
  offer_withdrawal: [
    "candidate_name",
    "job_title",
    "salary",
    "currency",
    "start_date",
    "expiry_date",
    "company_name",
  ],
  rejection: ["candidate_name", "job_title", "company_name"],
  assessment_completion: [
    "candidate_name",
    "job_title",
    "company_name",
    "assessment_link",
    "expiry_date",
  ],
  interview_invite: [
    "candidate_name",
    "job_title",
    "interview_date",
    "interview_time",
    "interview_timezone",
    "interview_location",
    "interview_video_link",
    "interview_interviewers",
    "company_name",
  ],
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
  if (raw === "interview") return "interview_invite";
  if (VALID.has(raw)) return raw as EmailTemplateType;
  return "general";
}
