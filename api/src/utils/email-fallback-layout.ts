import { getEmailButtonAnchorStyleString } from "../services/template-engine.service";

/** Outer wrapper for DB-compiled template HTML (no system footer — template owns copy). */
export function wrapCompiledTemplateEmail(html: string): string {
  return `<div style="font-family: sans-serif; line-height: 1.5; color: #333;">${html}</div>`;
}

const FOOTER_BLOCK = `<hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;"><p style="font-size: 14px; color: #666;">This is an automated message from OpenATS.</p>`;

/** System fallback emails: same outer shell + divider + footer as other fallbacks. */
export function wrapFallbackEmail(innerHtml: string): string {
  return `<div style="font-family: sans-serif; line-height: 1.5; color: #333;">${innerHtml}${FOOTER_BLOCK}</div>`;
}

export function escapeHtmlEmail(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Matches template-engine heading block. */
export function fallbackHeading(text: string): string {
  const esc = escapeHtmlEmail(text).replace(/\n/g, "<br>");
  return `<p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; line-height: 1.5;">${esc}</p>`;
}

/** Matches template-engine text block. */
export function fallbackText(text: string): string {
  const esc = escapeHtmlEmail(text).replace(/\n/g, "<br>");
  return `<p style="margin-bottom: 16px; line-height: 1.5;">${esc}</p>`;
}

export function fallbackNoticeBox(innerEscapedHtml: string): string {
  return `<p style="margin-bottom: 16px; line-height: 1.5; background: #fff7ed; border: 1px solid #fdba74; border-radius: 8px; padding: 10px 12px; color: #9a3412;">${innerEscapedHtml}</p>`;
}

export function fallbackButtonLink(href: string, label: string): string {
  const h = escapeHtmlEmail(href);
  const l = escapeHtmlEmail(label);
  const style = getEmailButtonAnchorStyleString();
  return `<div style="margin-bottom: 16px;"><a href="${h}" style="${style}">${l}</a></div>`;
}

export function buildAssessmentInviteFallbackInner(params: {
  firstName: string;
  assessmentTitle: string;
  inviteUrl: string;
  expiresLabel: string;
}): string {
  const { firstName, assessmentTitle, inviteUrl, expiresLabel } = params;
  return (
    fallbackHeading(`Hello ${firstName},`) +
    fallbackText(
      "You have been invited to complete an assessment for your application.",
    ) +
    fallbackText(`Assessment: ${assessmentTitle}`) +
    fallbackText(
      `Please use the button below to start. This link expires on ${expiresLabel}.`,
    ) +
    fallbackButtonLink(inviteUrl, "Start assessment") +
    fallbackText(
      "If the button does not work, copy and paste this link into your browser:",
    ) +
    fallbackText(inviteUrl)
  );
}

export function buildAssessmentCompletionFallbackInner(params: {
  firstName: string;
  assessmentTitle: string;
  autoSubmitReason?: string;
}): string {
  const { firstName, assessmentTitle, autoSubmitReason } = params;
  if (autoSubmitReason) {
    return (
      fallbackHeading(`Hello ${firstName},`) +
      fallbackText(
        `Your responses for ${assessmentTitle} were saved. Your assessment was automatically submitted for the following reason:`,
      ) +
      fallbackNoticeBox(escapeHtmlEmail(autoSubmitReason)) +
      fallbackText(
        "If you believe this is a mistake, please contact the hiring team.",
      )
    );
  }
  return (
    fallbackHeading(`Hello ${firstName},`) +
    fallbackText(
      `Your responses for ${assessmentTitle} are saved successfully. Thank you for completing the assessment.`,
    )
  );
}

export function buildApplicationReceivedFallbackInner(params: {
  candidateName: string;
  jobTitle: string;
  companyName: string;
}): string {
  const { candidateName, jobTitle, companyName } = params;
  return (
    fallbackHeading(`Dear ${candidateName},`) +
    fallbackText(
      `Thank you for applying for ${jobTitle} at ${companyName}. We have received your application.`,
    ) +
    fallbackText(
      "We will review it and contact you if your profile matches what we are looking for.",
    ) +
    fallbackText(`Best regards,\n${companyName}`)
  );
}

export function buildRejectionFallbackInner(params: {
  candidateName: string;
  jobTitle: string;
  companyName: string;
}): string {
  const { candidateName, jobTitle, companyName } = params;
  return (
    fallbackHeading(`Dear ${candidateName},`) +
    fallbackText(
      `Thank you for your interest in ${jobTitle} at ${companyName}. After careful review, we will not be moving forward with your application at this time.`,
    ) +
    fallbackText(
      "We appreciate the time you invested and wish you success in your search.",
    ) +
    fallbackText(`Best regards,\n${companyName}`)
  );
}

export function buildOfferFallbackInner(params: {
  candidateName: string;
  jobTitle: string;
  companyName: string;
}): string {
  const { candidateName, jobTitle, companyName } = params;
  return (
    fallbackHeading(`Hello ${candidateName},`) +
    fallbackText(
      `There is an update regarding your application for ${jobTitle} at ${companyName}.`,
    ) +
    fallbackText(
      "The hiring team will follow up with details. If you have questions, please reply to this email or contact the team directly.",
    ) +
    fallbackText(`Best regards,\n${companyName}`)
  );
}

/** Plain-text body → template-style paragraphs + fallback wrapper (for ad-hoc mail). */
export function plainTextToFallbackEmailHtml(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return wrapFallbackEmail("");
  const blocks = trimmed.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const inner = blocks.map((p) => fallbackText(p)).join("");
  return wrapFallbackEmail(inner);
}
