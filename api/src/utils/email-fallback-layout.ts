import {
  getEmailButtonAnchorStyleString,
  getEmailOutlineNeutralButtonStyleString,
  getEmailSolidPrimaryButtonStyleString,
} from "../services/template-engine.service";

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
        `We have received your responses for ${assessmentTitle}. Your session was closed and submitted automatically for the following reason:`,
      ) +
      fallbackNoticeBox(escapeHtmlEmail(autoSubmitReason)) +
      fallbackText(
        "If this does not sound right, reply to this email and the hiring team will review it.",
      )
    );
  }
  return (
    fallbackHeading(`Hello ${firstName},`) +
    fallbackText(
      `Thank you for completing ${assessmentTitle}. Your submission has been received securely.`,
    ) +
    fallbackText(
      "Our team will review it with the rest of your application. You do not need to do anything further unless we contact you.",
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
  salary?: string | number | null;
  currency?: string | null;
  payFrequency?: string | null;
  startDate?: string | null;
  expiryDate?: string | null;
  benefits?: string | null;
}): string {
  const { candidateName, jobTitle, companyName } = params;

  const salaryStr =
    params.salary != null && params.salary !== "" && params.salary !== "TBD"
      ? `${params.currency ? `${params.currency} ` : ""}${
          typeof params.salary === "number"
            ? params.salary.toLocaleString()
            : params.salary
        }${params.payFrequency && params.payFrequency !== "—" ? ` / ${params.payFrequency}` : ""}`
      : null;

  const fmt = (d: string | null | undefined) => {
    if (!d || d === "TBD") return null;
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return d;
    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const detailRows = [
    salaryStr ? `<tr><td style="padding:3px 16px 3px 0;color:#64748b;font-size:14px;white-space:nowrap;vertical-align:top">Salary</td><td style="padding:3px 0;font-size:14px">${escapeHtmlEmail(salaryStr)}</td></tr>` : "",
    fmt(params.startDate) ? `<tr><td style="padding:3px 16px 3px 0;color:#64748b;font-size:14px;white-space:nowrap;vertical-align:top">Start Date</td><td style="padding:3px 0;font-size:14px">${escapeHtmlEmail(fmt(params.startDate)!)}</td></tr>` : "",
    fmt(params.expiryDate) ? `<tr><td style="padding:3px 16px 3px 0;color:#64748b;font-size:14px;white-space:nowrap;vertical-align:top">Offer Expires</td><td style="padding:3px 0;font-size:14px">${escapeHtmlEmail(fmt(params.expiryDate)!)}</td></tr>` : "",
    params.benefits && params.benefits !== "—" ? `<tr><td style="padding:3px 16px 3px 0;color:#64748b;font-size:14px;white-space:nowrap;vertical-align:top">Benefits</td><td style="padding:3px 0;font-size:14px">${escapeHtmlEmail(params.benefits)}</td></tr>` : "",
  ].filter(Boolean).join("");

  const detailsBlock = detailRows
    ? `<table style="border-collapse:collapse;margin-bottom:16px">${detailRows}</table>`
    : "";

  return (
    fallbackHeading(`Dear ${candidateName},`) +
    fallbackText(
      `We are pleased to offer you the position of ${jobTitle} at ${companyName}. Please review your offer details below.`,
    ) +
    detailsBlock +
    fallbackText(
      "If you have any questions, please reply to this email or contact the hiring team directly.",
    ) +
    fallbackText(`Best regards,\n${companyName}`)
  );
}

/** Accept / Decline buttons appended to the bottom of every sent offer email. */
export function buildOfferResponseButtons(
  acceptUrl: string,
  declineUrl: string,
): string {
  const aEsc = escapeHtmlEmail(acceptUrl);
  const dEsc = escapeHtmlEmail(declineUrl);
  const acceptStyle = getEmailSolidPrimaryButtonStyleString();
  const declineStyle = getEmailOutlineNeutralButtonStyleString();
  return (
    `<hr style="border:0;border-top:1px solid #e2e8f0;margin:28px 0 20px">` +
    `<p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.55">Please use the buttons below to formally respond to this offer:</p>` +
    `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse">` +
    `<tr>` +
    `<td style="padding:0 10px 10px 0;vertical-align:middle"><a href="${aEsc}" style="${acceptStyle}">Accept offer</a></td>` +
    `<td style="padding:0 0 10px 0;vertical-align:middle"><a href="${dEsc}" style="${declineStyle}">Decline offer</a></td>` +
    `</tr>` +
    `</table>` +
    `<p style="margin:8px 0 0;font-size:11px;color:#94a3b8;line-height:1.45">These links are unique to you. Each can only be used once.</p>`
  );
}

/** Withdrawal notice sent to the candidate. */
export function buildOfferWithdrawalInner(params: {
  candidateName: string;
  jobTitle: string;
  companyName: string;
}): string {
  const { candidateName, jobTitle, companyName } = params;
  return (
    fallbackHeading(`Dear ${candidateName},`) +
    fallbackText(
      `We are writing to inform you that the offer for the position of ${jobTitle} at ${companyName} has been withdrawn.`,
    ) +
    fallbackText(
      "We sincerely appreciate the time you invested in our process and apologise for any inconvenience this may cause.",
    ) +
    fallbackText(
      "If you have any questions, please do not hesitate to reach out to us directly.",
    ) +
    fallbackText(`Best regards,\n${companyName}`)
  );
}

/** Lets the hiring manager know the candidate responded. */
export function buildOfferResponseNotificationInner(params: {
  candidateName: string;
  jobTitle: string;
  action: "accepted" | "declined";
}): string {
  const { candidateName, jobTitle, action } = params;
  const verb = action === "accepted" ? "accepted" : "declined";
  const emoji = action === "accepted" ? "✅" : "❌";
  return (
    fallbackHeading(`${emoji} Offer ${verb}`) +
    fallbackText(
      `${candidateName} has ${verb} the offer for the ${jobTitle} position.`,
    ) +
    fallbackText(
      "Log in to OpenATS to view the full offer details and take any next steps.",
    )
  );
}

/** Shared inner HTML for plain-text bodies (paragraph blocks, no outer wrapper). */
function plainTextToFallbackInner(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  const blocks = trimmed.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return blocks.map((p) => fallbackText(p)).join("");
}

/** Plain-text body → template-style paragraphs + fallback wrapper (system / automated mail). */
export function plainTextToFallbackEmailHtml(body: string): string {
  return wrapFallbackEmail(plainTextToFallbackInner(body));
}

/**
 * Plain-text body → HTML for recruiter-composed mail (no “automated message” footer).
 * Same paragraph styling as fallbacks; outer shell matches compiled templates.
 */
export function plainTextToComposedEmailHtml(body: string): string {
  return wrapCompiledTemplateEmail(plainTextToFallbackInner(body));
}
