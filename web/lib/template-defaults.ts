import type { TemplateBodyBlock } from "@/types";
import type { TemplateTypeUi } from "@/lib/template-type-ui";

export type { TemplateTypeUi } from "@/lib/template-type-ui";

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
      content: "Offer of Employment",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Dear {{candidate_name}},\n\n" +
        "We are pleased to extend an offer for the position of {{job_title}} with {{company_name}}. " +
        "This letter summarizes the principal terms of our offer. Additional policies and conditions may be provided during onboarding.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Compensation\n\n" +
        "Base compensation: {{currency}} {{salary}}, {{pay_frequency}} (subject to applicable taxes and payroll practices).\n\n" +
        "Benefits and programs\n\n" +
        "{{benefits}}\n\n" +
        "Anticipated start date: {{start_date}}\n\n" +
        "Please confirm your decision by {{expiry_date}}. If we do not receive your acceptance by that date, this offer may be withdrawn.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Employment relationship\n\n" +
        "Unless a separate written agreement signed by an authorized officer of {{company_name}} states otherwise, employment is at-will: " +
        "either party may end the employment relationship at any time, with or without cause or notice, to the extent permitted by applicable law.\n\n" +
        "This offer is contingent upon satisfactory completion of any background, reference, or eligibility checks and your legal authorization to work in the relevant jurisdiction.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "If you have questions regarding this offer, please reply to this message.\n\n" +
        "Sincerely,\n\n" +
        "{{company_name}}\n" +
        "Human Resources",
    },
    {
      id: uid("button"),
      kind: "button",
      content: "Reply to confirm or ask questions",
    },
  ];
}

export const DEFAULT_OFFER_TEMPLATE_NAME = "Standard offer letter";
export const DEFAULT_OFFER_TEMPLATE_SUBJECT =
  "Offer of Employment — {{job_title}} at {{company_name}}";

/** Rejection — candidate_name, job_title, company_name */
export function createDefaultRejectionBlocks(): DefaultEditorBlock[] {
  return [
    {
      id: uid("heading"),
      kind: "heading",
      content: "Update on your application",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Dear {{candidate_name}},\n\n" +
        "Thank you for your interest in the {{job_title}} role at {{company_name}} and for the time you invested in our process.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "After careful consideration, we will not be moving forward with your application at this time. " +
        "This decision reflects the current needs of the role and the strength of the applicant pool, not a single factor about your background.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "We encourage you to apply for future openings that match your skills. " +
        "If you have questions regarding this message, you may reply to this email.\n\n" +
        "We wish you success in your search.\n\n" +
        "Sincerely,\n\n" +
        "{{company_name}}\n" +
        "Recruiting",
    },
    {
      id: uid("button"),
      kind: "button",
      content: "View open roles",
    },
  ];
}

export const DEFAULT_REJECTION_TEMPLATE_NAME = "Standard polite rejection";
export const DEFAULT_REJECTION_TEMPLATE_SUBJECT =
  "Update on your application — {{job_title}}, {{company_name}}";

/**
 * Assessment invite — uses `{{assessment_link}}`, `{{assessment_title}}`, `{{expiry_date}}`,
 * plus candidate/job/company. Mirrors the former built-in HTML (greeting, CTA, plain link, footer).
 */
export function createDefaultAssessmentBlocks(): DefaultEditorBlock[] {
  return [
    {
      id: uid("heading"),
      kind: "heading",
      content: "You're invited to complete an assessment",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Dear {{candidate_name}},\n\n" +
        "You have been invited to complete an assessment for your application to the {{job_title}} role at {{company_name}}.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Assessment: {{assessment_title}}\n\n" +
        "Please use the button below to start. This link is unique to you and expires on {{expiry_date}}. " +
        "If you need more time or run into technical issues, reply to this email.",
    },
    {
      id: uid("button"),
      kind: "button",
      content: "Start assessment",
      buttonUrl: "{{assessment_link}}",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "If the button doesn't work, copy and paste this link into your browser:\n{{assessment_link}}",
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
        "This is an automated message from OpenATS.\n\n" +
        "Best regards,\n\n" +
        "{{company_name}}",
    },
  ];
}

export const DEFAULT_ASSESSMENT_INVITE_TEMPLATE_NAME =
  "Standard assessment invitation";
export const DEFAULT_ASSESSMENT_INVITE_TEMPLATE_SUBJECT =
  "Assessment invitation: {{assessment_title}} — {{job_title}} at {{company_name}}";

/** General — broad variable set for ad-hoc communications */
export function createDefaultGeneralBlocks(): DefaultEditorBlock[] {
  return [
    {
      id: uid("heading"),
      kind: "heading",
      content: "Message from {{company_name}}",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Dear {{candidate_name}},\n\n" +
        "We are writing regarding the {{job_title}} opportunity at {{company_name}}.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Compensation (if applicable): {{currency}} {{salary}}.\n\n" +
        "Benefits summary: {{benefits}}\n\n" +
        "Anticipated start date: {{start_date}}\n\n" +
        "Please respond by {{expiry_date}}.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "If you have an assessment to complete, use: {{assessment_link}}\n\n" +
        "Please reply to this message with any questions.\n\n" +
        "Best regards,\n\n" +
        "{{company_name}}",
    },
    {
      id: uid("button"),
      kind: "button",
      content: "Reply to this message",
    },
  ];
}

export const DEFAULT_GENERAL_TEMPLATE_NAME = "Standard general message";
export const DEFAULT_GENERAL_TEMPLATE_SUBJECT =
  "{{job_title}} — {{company_name}}";

/** After apply — confirmation to the candidate (default for this type is used first; general default is a legacy fallback). */
export function createDefaultApplicationReceivedBlocks(): DefaultEditorBlock[] {
  return [
    {
      id: uid("heading"),
      kind: "heading",
      content: "We received your application",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Dear {{candidate_name}},\n\n" +
        "Thank you for applying for the {{job_title}} role at {{company_name}}. " +
        "We have received your application and our team will review it shortly.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "You will hear from us if your profile is a strong match for this position. " +
        "If you have questions, reply to this email.\n\n" +
        "Best regards,\n\n" +
        "{{company_name}}",
    },
  ];
}

export const DEFAULT_APPLICATION_RECEIVED_TEMPLATE_NAME =
  "Standard application confirmation";
export const DEFAULT_APPLICATION_RECEIVED_TEMPLATE_SUBJECT =
  "Application received — {{job_title}} at {{company_name}}";

/** Sent when a candidate finishes an assessment (if this type has a default with a body). */
export function createDefaultAssessmentCompletionBlocks(): DefaultEditorBlock[] {
  return [
    {
      id: uid("heading"),
      kind: "heading",
      content: "Assessment submitted",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Dear {{candidate_name}},\n\n" +
        "Thank you for completing {{assessment_title}} for the {{job_title}} position at {{company_name}}.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Your score: {{score_summary}} ({{score_percentage}}%).\n\n" +
        "Outcome: {{passed}}.{{auto_submit_reason}}",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "If you have questions, reply to this message.\n\n" +
        "Best regards,\n\n" +
        "{{company_name}}",
    },
  ];
}

export const DEFAULT_ASSESSMENT_COMPLETION_TEMPLATE_NAME =
  "Standard assessment completion";
export const DEFAULT_ASSESSMENT_COMPLETION_TEMPLATE_SUBJECT =
  "{{assessment_title}} — submitted";

/** Interview scheduling email (use with pipeline automation later; variables default to TBD in previews). */
export function createDefaultInterviewInviteBlocks(): DefaultEditorBlock[] {
  return [
    {
      id: uid("heading"),
      kind: "heading",
      content: "Interview invitation",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Dear {{candidate_name}},\n\n" +
        "We would like to invite you to interview for the {{job_title}} role at {{company_name}}.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Date: {{interview_date}}\n" +
        "Time: {{interview_time}}\n" +
        "Location: {{interview_location}}\n" +
        "Video link (if remote): {{video_link}}\n" +
        "Interviewers: {{interviewer_names}}",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Please reply to confirm or suggest another time.\n\n" +
        "Best regards,\n\n" +
        "{{company_name}}",
    },
    {
      id: uid("button"),
      kind: "button",
      content: "Reply to this message",
    },
  ];
}

export const DEFAULT_INTERVIEW_INVITE_TEMPLATE_NAME =
  "Standard interview invitation";
export const DEFAULT_INTERVIEW_INVITE_TEMPLATE_SUBJECT =
  "Interview — {{job_title}} at {{company_name}}";

export const DEFAULT_TEMPLATE_BUTTON_LABEL: Record<TemplateTypeUi, string> = {
  application_received: "Use default application confirmation",
  assessment: "Use default assessment invite",
  assessment_completion: "Use default assessment completion email",
  interview_invite: "Use default interview invite",
  offer: "Use default offer letter",
  rejection: "Use default rejection letter",
  general: "Use default general message",
};

export const DEFAULT_TEMPLATE_HINT: Record<TemplateTypeUi, string> = {
  application_received:
    "Sent automatically when a candidate applies (if you set a default for this type). If none, the system falls back to a default General template, then a short built-in message.",
  assessment:
    "Inserts the standard invite layout (assessment link button, {{assessment_title}}, {{expiry_date}}). Mark this template as default under Templates to send it for assessment invites.",
  assessment_completion:
    "Sent when a candidate submits an assessment (if you set a default for this type). Uses score and outcome variables; otherwise a built-in completion email is used.",
  interview_invite:
    "For interview invitations (e.g. when wired to interview stages). Preview fills scheduling variables with sample/TBD text until real data exists.",
  offer:
    "Inserts a starter name, subject, and blocks (with placeholders such as {{benefits}}). Name, subject, and every block below stay editable until you save.",
  rejection:
    "Inserts a starter name, subject, and blocks for a professional rejection. Edit anything below, then save.",
  general:
    "Inserts a flexible starter (salary, benefits, dates, links). If you mark this type as default, it is also sent to candidates when they submit a job application (otherwise they get a short built-in confirmation).",
};
