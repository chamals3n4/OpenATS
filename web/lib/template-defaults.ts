import type { TemplateBodyBlock } from "@/types";

type BlockKind = TemplateBodyBlock["type"];

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type DefaultEditorBlock = {
  id: string;
  kind: BlockKind;
  content: string;
};

/** Ready-made blocks for a formal offer letter (offer templates only). */
export function createDefaultOfferBlocks(): DefaultEditorBlock[] {
  return [
    {
      id: uid("heading"),
      kind: "heading",
      content: "Formal Offer of Employment",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Dear {{candidate_name}},\n\n" +
        "We are pleased to extend a formal offer for the position of {{job_title}} with {{company_name}}. " +
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

export const DEFAULT_OFFER_TEMPLATE_NAME = "Standard formal offer letter";
export const DEFAULT_OFFER_TEMPLATE_SUBJECT =
  "Formal offer of employment — {{job_title}}, {{company_name}}";

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

/** Assessment invite — candidate_name, job_title, assessment_link, expiry_date */
export function createDefaultAssessmentBlocks(): DefaultEditorBlock[] {
  return [
    {
      id: uid("heading"),
      kind: "heading",
      content: "Complete your assessment",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Dear {{candidate_name}},\n\n" +
        "Thank you for your interest in the {{job_title}} position. As the next step, we invite you to complete a short assessment.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Please use the link below to begin. The link is unique to you.\n\n" +
        "Assessment link: {{assessment_link}}\n\n" +
        "Please complete by {{expiry_date}}. If you need more time or run into technical issues, reply to this email.",
    },
    {
      id: uid("text"),
      kind: "text",
      content:
        "Best regards,\n\n" +
        "{{company_name}}\n" +
        "Recruiting",
    },
    {
      id: uid("button"),
      kind: "button",
      content: "Open assessment",
    },
  ];
}

export const DEFAULT_ASSESSMENT_INVITE_TEMPLATE_NAME =
  "Standard assessment invitation";
export const DEFAULT_ASSESSMENT_INVITE_TEMPLATE_SUBJECT =
  "Next step: assessment for {{job_title}} — {{company_name}}";

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

/** UI copy for “Start from a polished layout” on new/edit template screens */
export type TemplateTypeUi =
  | "offer"
  | "rejection"
  | "assessment"
  | "general";

export const DEFAULT_TEMPLATE_BUTTON_LABEL: Record<TemplateTypeUi, string> = {
  offer: "Use default offer letter",
  rejection: "Use default rejection letter",
  assessment: "Use default assessment invite",
  general: "Use default general message",
};

export const DEFAULT_TEMPLATE_HINT: Record<TemplateTypeUi, string> = {
  offer:
    "Fills in name, subject, and blocks (including {{benefits}}). You can edit everything afterward.",
  rejection:
    "Fills in name, subject, and blocks for a polite, professional rejection. You can edit everything afterward.",
  assessment:
    "Fills in name, subject, and blocks (including {{assessment_link}} and {{expiry_date}}). You can edit everything afterward.",
  general:
    "Fills in name, subject, and blocks for a flexible message (salary, benefits, assessment link, and dates). You can edit everything afterward.",
};
