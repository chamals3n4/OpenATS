/**
 * The one design every email to a candidate uses. Inline styles only, because email clients
 * strip <style> blocks, and tables for the frame, because Outlook ignores most box CSS.
 *
 * It follows the transactional emails people already trust: the company's logo (or name) above a
 * white card on a light grey page, the job as a small coloured line over a clear heading, the
 * message, and a quiet footer outside the card. Colour is kept for that small line, links and the
 * one button, so the button is what stands out. Corners are softly rounded; Outlook squares them,
 * which still looks right.
 */

/** Keep in sync with --theme-color in frontend/app/globals.css. */
export const EMAIL_BRAND_COLOR = "#145962";

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const TEXT = "font-size:15px;line-height:1.65;color:#374151";
const INK = "#111827";
const MUTED = "#6b7280";
const RULE = "#e5e7eb";
const PAGE = "#f4f5f7";

/** For any value that came from a person or the database before it goes into email HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** A paragraph of already-safe HTML. */
export function emailParagraph(html: string): string {
  return `<p style="margin:0 0 16px;${TEXT}">${html}</p>`;
}

/** One labelled line in a details table. `valueHtml` must already be safe. */
export function emailDetailRow(label: string, valueHtml: string): string {
  return [
    "<tr>",
    `<td style="padding:10px 16px;border-top:1px solid ${RULE};font-size:13px;line-height:1.5;color:${MUTED};white-space:nowrap;vertical-align:top;width:1%">${escapeHtml(label)}</td>`,
    `<td style="padding:10px 16px 10px 4px;border-top:1px solid ${RULE};font-size:14px;line-height:1.5;color:${INK};font-weight:500">${valueHtml}</td>`,
    "</tr>",
  ].join("");
}

/** The facts of the matter (date, time, place), set apart from the message in a ruled panel. */
export function emailDetails(rows: string[]): string {
  // Each row draws the line above itself, and the first row's line is hidden by the panel's own
  // border, so there is exactly one line between rows whatever their number.
  return `<table role="presentation" style="width:100%;border-collapse:separate;border-spacing:0;margin:8px 0 24px;background:#f9fafb;border:1px solid ${RULE};border-radius:8px;overflow:hidden">${rows
    .join("")
    .replace("border-top:1px solid", "border-top:0 solid")
    .replace("border-top:1px solid", "border-top:0 solid")}</table>`;
}

export function emailButton(href: string, label: string): string {
  return [
    '<div style="margin:24px 0 12px">',
    `<a href="${escapeHtml(href)}" style="display:inline-block;background:${EMAIL_BRAND_COLOR};color:#ffffff;padding:12px 22px;border-radius:6px;font-size:15px;font-weight:600;line-height:1.2;text-decoration:none">${escapeHtml(label)}</a>`,
    "</div>",
  ].join("");
}

/** The plain link under a button, for clients that block buttons. */
export function emailLinkFallback(href: string): string {
  const safe = escapeHtml(href);
  return `<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:${MUTED};word-break:break-all">Or open this link: <a href="${safe}" style="color:${EMAIL_BRAND_COLOR}">${safe}</a></p>`;
}

export interface EmailLayoutInput {
  companyName: string;
  /** The company's logo, shown above the card in place of its name. Only a web address is used. */
  logoUrl?: string | null | undefined;
  /** The main line of the email. Left out for free-form emails. */
  heading?: string | undefined;
  /** A short line over the heading, such as the job title. */
  subtitle?: string | undefined;
  /** Already-safe HTML. */
  bodyHtml: string;
}

export function renderEmailLayout({ companyName, logoUrl, heading, subtitle, bodyHtml }: EmailLayoutInput): string {
  const company = escapeHtml(companyName);
  const logo = logoUrl && /^https?:\/\//i.test(logoUrl) ? escapeHtml(logoUrl) : null;
  return [
    `<div style="background:${PAGE};padding:40px 16px 32px;font-family:${FONT}">`,
    `<table role="presentation" align="center" style="width:100%;max-width:580px;margin:0 auto;border-collapse:collapse">`,
    // Who it is from, above the card
    `<tr><td style="padding:0 4px 20px">`,
    logo
      ? `<img src="${logo}" alt="${company}" height="32" style="display:block;height:32px;max-width:200px;width:auto;border:0">`
      : `<span style="font-size:17px;font-weight:700;letter-spacing:-0.01em;color:${INK}">${company}</span>`,
    "</td></tr>",
    `<tr><td style="background:#ffffff;border:1px solid ${RULE};border-radius:12px;padding:36px 40px 28px">`,
    heading
      ? [
          subtitle
            ? `<div style="margin:0 0 8px;font-size:13px;font-weight:600;line-height:1.4;color:${EMAIL_BRAND_COLOR}">${escapeHtml(subtitle)}</div>`
            : "",
          `<h1 style="margin:0 0 24px;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.01em;color:${INK}">${escapeHtml(heading)}</h1>`,
        ].join("")
      : "",
    `<div style="${TEXT}">${bodyHtml}</div>`,
    "</td></tr>",
    `<tr><td style="padding:20px 4px 0;font-size:12px;line-height:1.6;color:${MUTED}">`,
    `This email was sent by ${company} about your application.<br>`,
    `<span style="color:#9ca3af">Sent with OpenATS</span>`,
    "</td></tr>",
    "</table>",
    "</div>",
  ].join("");
}
