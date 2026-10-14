import type { CandidateRejection, Template } from "@/types";

/** "Other" needs a note */
export const NOTE_REQUIRED_REASON = "Other";
export const INTERNAL_NOTE_MAX = 2000;

export interface RejectionFormInput {
  reason: string;
  note: string;
  sendEmail: boolean;
  templateId: string;
}

export interface RejectionFormErrors {
  reason?: string;
  note?: string;
  template?: string;
}

export function validateRejection(input: RejectionFormInput): RejectionFormErrors {
  const errors: RejectionFormErrors = {};
  if (!input.reason) errors.reason = "Choose a reason.";
  if (input.reason === NOTE_REQUIRED_REASON && !input.note.trim()) {
    errors.note = "Add a note so your team knows what happened.";
  }
  if (input.sendEmail && !input.templateId) {
    errors.template = "Choose the email to send.";
  }
  return errors;
}

/** Pick the rejection template by default */
export function pickRejectionTemplate(templates: Template[]): Template | null {
  return (
    templates.find((t) => /reject|regret|unsuccessful|not moving forward|decline/i.test(t.name)) ??
    null
  );
}

/** Newest first. */
export function sortRejections(rejections: CandidateRejection[]): CandidateRejection[] {
  return [...rejections].sort(
    (a, b) =>
      new Date(b.rejectedAt).getTime() - new Date(a.rejectedAt).getTime() || b.id - a.id,
  );
}

export type EmailTone = "sent" | "none" | "draft";

export function describeRejectionEmail(
  rejection: Pick<CandidateRejection, "emailStatus" | "sentAt">,
  templateName: string | null,
): { tone: EmailTone; label: string } {
  if (rejection.emailStatus === "sent") {
    return {
      tone: "sent",
      label: templateName ? `Sent using “${templateName}”` : "Sent to the candidate",
    };
  }
  if (rejection.emailStatus === "draft") {
    return { tone: "draft", label: "Saved as a draft, not sent" };
  }
  return { tone: "none", label: "No email was sent" };
}
