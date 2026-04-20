import type { TemplateBodyBlock, Template } from "@/types";

/** Settings UI keys; `assessment` maps to API `assessment_invite`. Ordered by typical candidate journey. */
export type TemplateTypeUi =
  | "application_received"
  | "assessment"
  | "assessment_completion"
  | "interview_invite"
  | "offer"
  | "offer_withdrawal"
  | "rejection"
  | "general";

/** Funnel order: apply → assess → complete → interview → offer → withdrawal / rejection → ad-hoc. */
export const TEMPLATE_TYPE_ORDER: TemplateTypeUi[] = [
  "application_received",
  "assessment",
  "assessment_completion",
  "interview_invite",
  "offer",
  "offer_withdrawal",
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

export const TYPE_META: Record<TemplateTypeUi, { label: string; badge: string }> = {
  application_received: { label: "Application received", badge: "bg-violet-50 text-violet-800 border border-violet-200 dark:bg-violet-950/35 dark:text-violet-300 dark:border-violet-800" },
  assessment: { label: "Assessment Invite", badge: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800" },
  assessment_completion: { label: "Assessment completion", badge: "bg-cyan-50 text-cyan-800 border border-cyan-200 dark:bg-cyan-950/35 dark:text-cyan-300 dark:border-cyan-800" },
  interview_invite: { label: "Interview invite", badge: "bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/35 dark:text-indigo-300 dark:border-indigo-800" },
  offer: { label: "Offer Letter", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800" },
  offer_withdrawal: { label: "Offer Withdrawal", badge: "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800" },
  rejection: { label: "Rejection", badge: "bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800" },
  general: { label: "General", badge: "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700" },
};

/** One-line helper for the "new template" type picker. */
export const TEMPLATE_TYPE_SHORT_DESC: Record<TemplateTypeUi, string> = {
  application_received: "Confirmation when someone applies to a job",
  assessment: "Send quiz or assessment invitations",
  assessment_completion: "After a candidate submits an assessment",
  interview_invite: "Interview time, location, and video link",
  offer: "Offer letters with salary & start date",
  offer_withdrawal: "Sent to candidates when their offer is withdrawn",
  rejection: "Notify candidates who were not selected",
  general: "Any other candidate communication",
};

export const VARIABLES: Record<TemplateTypeUi, string[]> = {
  application_received: ["candidate_name", "job_title", "company_name"],
  assessment: ["candidate_name", "job_title", "company_name", "assessment_title", "assessment_link", "expiry_date"],
  assessment_completion: ["candidate_name", "job_title", "company_name", "assessment_title"],
  interview_invite: ["candidate_name", "job_title", "company_name", "interview_date", "interview_time", "interview_location", "video_link", "interviewer_names"],
  offer: ["candidate_name", "job_title", "salary", "currency", "pay_frequency", "start_date", "expiry_date", "benefits", "company_name"],
  offer_withdrawal: ["candidate_name", "job_title", "company_name"],
  rejection: ["candidate_name", "job_title", "company_name"],
  general: ["candidate_name", "job_title", "salary", "currency", "start_date", "expiry_date", "benefits", "company_name", "assessment_link"],
};

type BlockKind = TemplateBodyBlock["type"];

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type DefaultEditorBlock = {
  id: string;
  kind: BlockKind;
  content: string;
  buttonUrl?: string;
};

/** Ready-made blocks for a formal offer letter (offer templates only). */
export function createDefaultOfferBlocks(): DefaultEditorBlock[] {
  return [
    {
      id: uid("heading"),
      kind: "heading",
      content: "Formal offer — {{job_title}}",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Dear {{candidate_name}},\n\n" +
        "Following our recent conversations, we are delighted to offer you the position of {{job_title}} with {{company_name}}. " +
        "We were impressed by your experience and believe you will make a strong addition to the team.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Role and compensation\n\n" +
        "The role is structured as outlined in our discussions. Base compensation is {{currency}} {{salary}} ({{pay_frequency}}), subject to payroll withholdings and local regulations.\n\n" +
        "Benefits and programs\n\n" +
        "{{benefits}}\n\n" +
        "Target start date: {{start_date}}\n\n" +
        "Please confirm your acceptance in writing by {{expiry_date}}. If we have not heard from you by that date, we may need to withdraw or revise this offer.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Conditions and next steps\n\n" +
        "This offer remains subject to satisfactory completion of background, reference, and right-to-work checks where applicable. " +
        "Unless a separate agreement signed by an authorized representative of {{company_name}} provides otherwise, employment is at-will to the extent permitted by law.\n\n" +
        "Your hiring manager or HR contact will follow up with onboarding paperwork and orientation details once you have accepted.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "If you would like to discuss any aspect of this offer, please reply to this email and we will be glad to help.\n\n" +
        "Sincerely,\n\n" +
        "{{company_name}}\n" +
        "Talent Acquisition",
    },
  ];
}

export const DEFAULT_OFFER_TEMPLATE_NAME = "Standard offer letter";
export const DEFAULT_OFFER_TEMPLATE_SUBJECT =
  "Offer of employment — {{job_title}}, {{company_name}}";

/** Rejection — candidate_name, job_title, company_name */
export function createDefaultRejectionBlocks(): DefaultEditorBlock[] {
  return [
    {
      id: uid("heading"),
      kind: "heading",
      content: "Thank you for your interest",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Dear {{candidate_name}},\n\n" +
        "Thank you for taking the time to apply for the {{job_title}} position at {{company_name}} and for participating in our hiring process. " +
        "We genuinely appreciate the effort you put into your application.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "After a thorough review, we have decided to move forward with other candidates whose experience more closely aligns with the immediate needs of this role. " +
        "This outcome is specific to this opening and timing; it is not a reflection of your overall qualifications or potential.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "We invite you to consider future roles at {{company_name}} that may be a closer match. " +
        "If you have questions about this decision, you may reply to this message.\n\n" +
        "We wish you every success in your career.\n\n" +
        "Kind regards,\n\n" +
        "{{company_name}}\n" +
        "Recruiting Team",
    },
  ];
}

export const DEFAULT_REJECTION_TEMPLATE_NAME = "Standard application update";
export const DEFAULT_REJECTION_TEMPLATE_SUBJECT =
  "Your application — {{job_title}}, {{company_name}}";

/** Offer withdrawal — candidate_name, job_title, company_name */
export function createDefaultOfferWithdrawalBlocks(): DefaultEditorBlock[] {
  return [
    {
      id: uid("heading"),
      kind: "heading",
      content: "Update regarding your offer of employment",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Dear {{candidate_name}},\n\n" +
        "We are writing with an important update concerning the {{job_title}} opportunity at {{company_name}}. " +
        "Due to internal business circumstances beyond your control, we must withdraw the offer of employment that was extended to you.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "We recognize that this news is disappointing and we sincerely apologize for the inconvenience and uncertainty it may create. " +
        "The decision was not based on your performance or conduct, but on organizational factors we are required to follow at this time.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "If you have questions or require clarification, please reply to this email and a member of our team will respond as soon as possible.\n\n" +
        "Thank you again for your professionalism throughout the process.\n\n" +
        "Sincerely,\n\n" +
        "{{company_name}}\n" +
        "Human Resources",
    },
  ];
}

export const DEFAULT_OFFER_WITHDRAWAL_TEMPLATE_NAME = "Standard offer withdrawal";
export const DEFAULT_OFFER_WITHDRAWAL_TEMPLATE_SUBJECT =
  "Important update — {{job_title}} offer, {{company_name}}";

/**
 * Assessment invite — uses `{{assessment_link}}`, `{{assessment_title}}`, `{{expiry_date}}`,
 * plus candidate/job/company.
 */
export function createDefaultAssessmentBlocks(): DefaultEditorBlock[] {
  return [
    {
      id: uid("heading"),
      kind: "heading",
      content: "Next step: complete your assessment",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Dear {{candidate_name}},\n\n" +
        "Thank you for your interest in the {{job_title}} role at {{company_name}}. " +
        "As part of our selection process, we would like you to complete a short online assessment.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Assessment: {{assessment_title}}\n\n" +
        "Please complete it in one sitting if possible, using a stable internet connection and a modern browser. " +
        "The secure link below is personal to you and should not be forwarded.\n\n" +
        "This link expires on {{expiry_date}}. If you need an extension or experience technical difficulties, reply to this email and we will assist you.",
    },
    {
      id: uid("button"),
      kind: "button",
      content: "Begin assessment",
      buttonUrl: "{{assessment_link}}",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "If the button above does not open correctly, copy and paste this URL into your browser:\n{{assessment_link}}",
    },
    {
      id: uid("divider"),
      kind: "divider",
      content: "",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "We appreciate your time and look forward to reviewing your submission.\n\n" +
        "Best regards,\n\n" +
        "{{company_name}}\n" +
        "Recruiting Team",
    },
  ];
}

export const DEFAULT_ASSESSMENT_INVITE_TEMPLATE_NAME =
  "Standard assessment invitation";
export const DEFAULT_ASSESSMENT_INVITE_TEMPLATE_SUBJECT =
  "Action required: {{assessment_title}} — {{job_title}}, {{company_name}}";

/** General — broad variable set for ad-hoc communications */
export function createDefaultGeneralBlocks(): DefaultEditorBlock[] {
  return [
    {
      id: uid("heading"),
      kind: "heading",
      content: "Update from {{company_name}}",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Dear {{candidate_name}},\n\n" +
        "We are reaching out regarding your interest in the {{job_title}} opportunity at {{company_name}}. " +
        "We would like to share a few details and confirm the best way to stay in touch as we move forward.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Where relevant, please note the following for your records:\n\n" +
        "• Compensation discussed: {{currency}} {{salary}}\n" +
        "• Benefits overview: {{benefits}}\n" +
        "• Indicative start date: {{start_date}}\n" +
        "• Please reply by: {{expiry_date}}\n\n" +
        "If you have been asked to complete an assessment, you may use this link when you are ready:\n{{assessment_link}}",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "If anything in this message needs clarification, simply reply to this email and we will be happy to help.\n\n" +
        "Kind regards,\n\n" +
        "{{company_name}}",
    },
  ];
}

export const DEFAULT_GENERAL_TEMPLATE_NAME = "Standard candidate update";
export const DEFAULT_GENERAL_TEMPLATE_SUBJECT =
  "{{company_name}} — {{job_title}}";

/** After apply — confirmation to the candidate (default for this type is used first; general default is a legacy fallback). */
export function createDefaultApplicationReceivedBlocks(): DefaultEditorBlock[] {
  return [
    {
      id: uid("heading"),
      kind: "heading",
      content: "Thank you for applying",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Dear {{candidate_name}},\n\n" +
        "Thank you for submitting your application for the {{job_title}} position at {{company_name}}. " +
        "Your materials have been received securely and added to our applicant tracking system.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Our recruiting team will review your background against the requirements of the role. " +
        "Because we receive a high volume of applications, we are only able to follow up with candidates whose qualifications most closely match our current needs. " +
        "If there is a fit, you can expect to hear from us within the next few weeks.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "If you need to update your application or have a time-sensitive question, please reply to this email and include the job title in the subject line.\n\n" +
        "We appreciate your interest in joining {{company_name}}.\n\n" +
        "Sincerely,\n\n" +
        "{{company_name}}\n" +
        "Talent Acquisition",
    },
  ];
}

export const DEFAULT_APPLICATION_RECEIVED_TEMPLATE_NAME =
  "Standard application acknowledgment";
export const DEFAULT_APPLICATION_RECEIVED_TEMPLATE_SUBJECT =
  "We received your application — {{job_title}}, {{company_name}}";

/** Sent when a candidate finishes an assessment (if this type has a default with a body). */
export function createDefaultAssessmentCompletionBlocks(): DefaultEditorBlock[] {
  return [
    {
      id: uid("heading"),
      kind: "heading",
      content: "Thank you — we received your assessment",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Dear {{candidate_name}},\n\n" +
        "Thank you for completing {{assessment_title}} as part of your application for the {{job_title}} position at {{company_name}}. " +
        "Your submission has been received securely.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Our team will review your assessment together with the rest of your application. " +
        "There is nothing further you need to do at this stage. If your profile is a strong match for the role, we will be in touch with next steps.\n\n" +
        "If you experienced a technical issue while completing the assessment, reply to this email briefly describing what happened and we will look into it.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Best regards,\n\n" +
        "{{company_name}}\n" +
        "Recruiting Team",
    },
  ];
}

export const DEFAULT_ASSESSMENT_COMPLETION_TEMPLATE_NAME =
  "Standard assessment completion";
export const DEFAULT_ASSESSMENT_COMPLETION_TEMPLATE_SUBJECT =
  "Assessment received — {{assessment_title}}, {{company_name}}";

/** Interview scheduling email (use with pipeline automation later; variables default to TBD in previews). */
export function createDefaultInterviewInviteBlocks(): DefaultEditorBlock[] {
  return [
    {
      id: uid("heading"),
      kind: "heading",
      content: "Invitation to interview",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Dear {{candidate_name}},\n\n" +
        "Following our review of your application for the {{job_title}} position at {{company_name}}, " +
        "we would be pleased to meet you for an interview. We enjoyed learning about your background and believe a conversation would be mutually valuable.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Interview details\n\n" +
        "Date: {{interview_date}}\n" +
        "Time: {{interview_time}}\n" +
        "Format / location: {{interview_location}}\n" +
        "Video conference link (if applicable): {{video_link}}\n" +
        "Who you will meet: {{interviewer_names}}",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Please plan to join the video call a few minutes early to test your audio and camera. " +
        "If you are meeting in person, bring a copy of your resume and a form of identification.\n\n" +
        "Kindly reply to this email to confirm your attendance or to propose an alternative time if you have a conflict. " +
        "We will do our best to accommodate reasonable requests.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "We look forward to speaking with you.\n\n" +
        "Sincerely,\n\n" +
        "{{company_name}}\n" +
        "Recruiting Team",
    },
  ];
}

export const DEFAULT_INTERVIEW_INVITE_TEMPLATE_NAME =
  "Standard interview invitation";
export const DEFAULT_INTERVIEW_INVITE_TEMPLATE_SUBJECT =
  "Interview invitation — {{job_title}}, {{company_name}}";

export const DEFAULT_TEMPLATE_BUTTON_LABEL: Record<TemplateTypeUi, string> = {
  application_received: "Use default application acknowledgment",
  assessment: "Use default assessment invitation",
  assessment_completion: "Use default assessment completion email",
  interview_invite: "Use default interview invitation",
  offer: "Use default offer letter",
  offer_withdrawal: "Use default offer withdrawal notice",
  rejection: "Use default candidate update (not selected)",
  general: "Use default candidate update",
};

export const DEFAULT_TEMPLATE_HINT: Record<TemplateTypeUi, string> = {
  application_received:
    "Loads a standard thank-you and next-steps email. Edit and save.",
  assessment:
    "Loads a standard invite (link, deadline). Set a default to use it from assessments.",
  assessment_completion:
    "Loads a standard acknowledgment (no scores). Edit and save.",
  interview_invite:
    "Loads a standard invitation. Preview uses sample values.",
  offer:
    "Loads standard offer sections. Edit subject and blocks, then save.",
  offer_withdrawal:
    "Loads standard withdrawal wording. Edit before use.",
  rejection:
    "Loads a standard not-selected message. Adjust tone, then save.",
  general:
    "Loads a general update layout. Customize for any message.",
};
