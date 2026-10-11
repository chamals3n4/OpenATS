import { eq } from "drizzle-orm";
import { db } from "../../db";
import { systemEmailTemplates } from "../../db/schema";
import { escapeHtml } from "./email-layout";

/**
 * The emails the app sends by itself, and the part of each a company can reword: the subject
 * and the message. The heading, the details table and the button are added around the
 * message when it is sent, so a link a candidate needs can never be edited out.
 */

export const SYSTEM_EMAIL_PURPOSES = [
  "application_received",
  "assessment_invite",
  "assessment_completed",
  "interview_slots",
  "interview_confirmed",
  "interview_cancelled",
  "interview_invite",
  "offer",
] as const;

export type SystemEmailPurpose = (typeof SYSTEM_EMAIL_PURPOSES)[number];

export interface SystemEmailVariable {
  name: string;
  /** Shown in the editor's preview in place of the real value. */
  sample: string;
}

export interface SystemEmailDefinition {
  label: string;
  /** When it is sent, in a sentence. */
  description: string;
  /** What the app adds after the message, or null when it adds nothing. */
  appends: string | null;
  variables: SystemEmailVariable[];
  subject: string;
  bodyHtml: string;
}

const CANDIDATE = { name: "candidate_name", sample: "Alex Johnson" };
const JOB = { name: "job_title", sample: "Senior Software Engineer" };
const COMPANY = { name: "company_name", sample: "OpenATS Inc." };
const EVENT = { name: "event_name", sample: "Technical interview" };
const ASSESSMENT = { name: "assessment_title", sample: "Backend skills test" };

const p = (...lines: string[]) => lines.map((line) => `<p>${line}</p>`).join("");

export const SYSTEM_EMAILS: Record<SystemEmailPurpose, SystemEmailDefinition> = {
  application_received: {
    label: "Application received",
    description: "Sent to a candidate as soon as they apply.",
    appends: null,
    variables: [CANDIDATE, JOB, COMPANY],
    subject: "{{job_title}} - Thank you for your application",
    bodyHtml: p(
      "Hello {{candidate_name}},",
      "Thank you for applying for <strong>{{job_title}}</strong>. We have your application and will review it carefully.",
      "If your experience matches what we are looking for, we will contact you about the next steps.",
    ),
  },
  assessment_invite: {
    label: "Assessment invite",
    description: "Sent when a candidate reaches a stage that has an assessment.",
    appends: "The assessment name, the closing date and the “Start the assessment” button.",
    variables: [CANDIDATE, ASSESSMENT, COMPANY],
    subject: "Assessment Invitation: {{assessment_title}}",
    bodyHtml: p(
      "Hello {{candidate_name}},",
      "As the next step in your application, please complete this assessment.",
    ),
  },
  assessment_completed: {
    label: "Assessment completed",
    description:
      "Sent when a candidate hands in an assessment. One submitted automatically, for example when time runs out, gets a fixed message instead.",
    appends: null,
    variables: [CANDIDATE, ASSESSMENT, COMPANY],
    subject: "Assessment Completed: {{assessment_title}}",
    bodyHtml: p(
      "Hello {{candidate_name}},",
      "Your answers for <strong>{{assessment_title}}</strong> were saved. Thank you for completing it.",
      "The hiring team will review your result and contact you about the next steps.",
    ),
  },
  interview_slots: {
    label: "Interview: pick a time",
    description:
      "Sent when you schedule an interview and let the candidate choose a time. A message typed while scheduling replaces this one for that interview.",
    appends: "The position, the interview type, the link or address, and the “Choose a time” button.",
    variables: [CANDIDATE, EVENT, JOB, COMPANY],
    subject: "{{event_name}} — {{job_title}}",
    bodyHtml: p(
      "Hello {{candidate_name}},",
      "We would like to invite you to an interview. Please choose a time that suits you.",
    ),
  },
  interview_confirmed: {
    label: "Interview confirmed",
    description: "Sent when a candidate picks a time.",
    appends: "The date, time, duration and address, and the “Join the meeting” button for a video call.",
    variables: [CANDIDATE, EVENT, COMPANY],
    subject: "Interview Confirmed — {{event_name}}",
    bodyHtml: p(
      "Hello {{candidate_name}},",
      "Your interview <strong>{{event_name}}</strong> is confirmed. Here are the details. If you have any questions, please contact the hiring team.",
    ),
  },
  interview_cancelled: {
    label: "Interview cancelled",
    description: "Sent when you cancel an interview the candidate had confirmed.",
    appends: "The date and time that were cancelled.",
    variables: [CANDIDATE, EVENT, COMPANY],
    subject: "Interview Cancelled — {{event_name}}",
    bodyHtml: p(
      "Hello {{candidate_name}},",
      "Your interview <strong>{{event_name}}</strong> has been cancelled.",
      "The hiring team will contact you if a new time is arranged. We are sorry for the inconvenience.",
    ),
  },
  interview_invite: {
    label: "Interview at a fixed time",
    description: "Sent when you log an interview at a time you have already agreed.",
    appends: "The position, stage, date, time and duration.",
    variables: [CANDIDATE, JOB, COMPANY],
    subject: "Interview Invitation — {{job_title}}",
    bodyHtml: p(
      "Hello {{candidate_name}},",
      "You are invited to an interview. Here are the details. If you have any questions, or the time does not work, please contact the hiring team.",
    ),
  },
  offer: {
    label: "Offer",
    description: "Sent with the link to the offer letter when you send an offer.",
    appends: "The “Review your offer” button.",
    variables: [CANDIDATE, JOB, COMPANY],
    subject: "Offer for {{job_title}}",
    bodyHtml: p(
      "Hello {{candidate_name}},",
      "Congratulations. We are pleased to offer you the position of <strong>{{job_title}}</strong>.",
      "Please read the offer and accept or decline it on the page below.",
    ),
  },
};

export function isSystemEmailPurpose(value: string): value is SystemEmailPurpose {
  return (SYSTEM_EMAIL_PURPOSES as readonly string[]).includes(value);
}

const VARIABLE = /\{\{\s*([^{}]+?)\s*\}\}/g;

/** The {{variables}} in the text that this email has no value for. */
export function unknownVariables(purpose: SystemEmailPurpose, ...texts: string[]): string[] {
  const known = new Set(SYSTEM_EMAILS[purpose].variables.map((v) => v.name));
  const unknown = new Set<string>();
  for (const text of texts) {
    for (const match of text.matchAll(VARIABLE)) {
      if (!known.has(match[1]!)) unknown.add(match[1]!);
    }
  }
  return [...unknown];
}

/** Fills a subject. Values go in as they are, because a subject is plain text. */
export function fillSubject(text: string, values: Record<string, string>): string {
  return text
    .replace(VARIABLE, (whole, name: string) => values[name] ?? whole)
    .replace(/[\r\n]+/g, " ")
    .trim();
}

/** Fills a message. Values are escaped, because some were typed by the candidate. */
export function fillBodyHtml(html: string, values: Record<string, string>): string {
  return html.replace(VARIABLE, (whole, name: string) =>
    values[name] === undefined ? whole : escapeHtml(values[name]),
  );
}

export interface SystemEmailContent {
  subject: string;
  bodyHtml: string;
}

/** The wording in use for a purpose: the company's own if they changed it, else the built-in. */
export async function getSystemEmailContent(purpose: SystemEmailPurpose): Promise<SystemEmailContent> {
  const [row] = await db
    .select({ subject: systemEmailTemplates.subject, bodyHtml: systemEmailTemplates.bodyHtml })
    .from(systemEmailTemplates)
    .where(eq(systemEmailTemplates.purpose, purpose));
  return row ?? { subject: SYSTEM_EMAILS[purpose].subject, bodyHtml: SYSTEM_EMAILS[purpose].bodyHtml };
}

export class SystemEmailError extends Error {}

export const systemEmailService = {
  async list() {
    const rows = await db.select().from(systemEmailTemplates);
    const saved = new Map(rows.map((row) => [row.purpose, row]));
    return SYSTEM_EMAIL_PURPOSES.map((purpose) => {
      const definition = SYSTEM_EMAILS[purpose];
      const row = saved.get(purpose);
      return {
        purpose,
        label: definition.label,
        description: definition.description,
        appends: definition.appends,
        variables: definition.variables,
        subject: row?.subject ?? definition.subject,
        bodyHtml: row?.bodyHtml ?? definition.bodyHtml,
        customised: !!row,
        updatedAt: row?.updatedAt ?? null,
      };
    });
  },

  async save(purpose: SystemEmailPurpose, input: SystemEmailContent, updatedBy: number) {
    const unknown = unknownVariables(purpose, input.subject, input.bodyHtml);
    if (unknown.length > 0) {
      const names = unknown.map((name) => `{{${name}}}`).join(", ");
      throw new SystemEmailError(
        `${names} cannot be used in this email. Use one of the variables listed for it.`,
      );
    }
    const values = { ...input, updatedBy, updatedAt: new Date() };
    await db
      .insert(systemEmailTemplates)
      .values({ purpose, ...values })
      .onConflictDoUpdate({ target: systemEmailTemplates.purpose, set: values });
  },

  /** Back to the built-in wording. */
  async reset(purpose: SystemEmailPurpose) {
    await db.delete(systemEmailTemplates).where(eq(systemEmailTemplates.purpose, purpose));
  },
};
