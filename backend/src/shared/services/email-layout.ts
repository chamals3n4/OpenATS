/**
 * The one design every email to a candidate uses. Inline styles only, because email clients
 * strip <style> blocks, and tables for the frame, because Outlook ignores most box CSS.
 */

/** Keep in sync with --theme-color in frontend/app/globals.css. */
export const EMAIL_BRAND_COLOR = "#145962";

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const TEXT = "font-size:15px;line-height:1.6;color:#334155";

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
    `<td style="padding:10px 16px 10px 0;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;white-space:nowrap;vertical-align:top;width:1%">${escapeHtml(label)}</td>`,
    `<td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:15px;color:#0f172a;font-weight:600">${valueHtml}</td>`,
    "</tr>",
  ].join("");
}

export function emailDetails(rows: string[]): string {
  return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:4px 0 20px;border-top:1px solid #e2e8f0">${rows.join("")}</table>`;
}

export function emailButton(href: string, label: string): string {
  return [
    '<div style="margin:24px 0 8px">',
    `<a href="${escapeHtml(href)}" style="display:inline-block;background:${EMAIL_BRAND_COLOR};color:#ffffff;padding:12px 28px;border-radius:4px;font-size:15px;font-weight:600;text-decoration:none">${escapeHtml(label)}</a>`,
    "</div>",
  ].join("");
}

/** The plain link under a button, for clients that block buttons. */
export function emailLinkFallback(href: string): string {
  const safe = escapeHtml(href);
  return `<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#64748b;word-break:break-all">Or open this link: <a href="${safe}" style="color:${EMAIL_BRAND_COLOR}">${safe}</a></p>`;
}

export interface EmailLayoutInput {
  companyName: string;
  /** The large line in the coloured band. Left out for free-form emails. */
  heading?: string | undefined;
  /** A line under the heading, such as the job title. */
  subtitle?: string | undefined;
  /** Already-safe HTML. */
  bodyHtml: string;
}

export function renderEmailLayout({ companyName, heading, subtitle, bodyHtml }: EmailLayoutInput): string {
  const company = escapeHtml(companyName);
  return [
    `<div style="background:#f1f5f9;padding:32px 16px;font-family:${FONT}">`,
    '<table role="presentation" align="center" style="width:100%;max-width:600px;margin:0 auto;border-collapse:collapse;background:#ffffff;border:1px solid #cbd5e1">',
    `<tr><td style="background:${EMAIL_BRAND_COLOR};padding:${heading ? "24px 32px" : "16px 32px"}">`,
    `<div style="font-size:13px;font-weight:600;letter-spacing:0.04em;color:#ffffff;opacity:0.85">${company}</div>`,
    heading
      ? `<h1 style="margin:8px 0 0;font-size:22px;font-weight:700;line-height:1.3;color:#ffffff">${escapeHtml(heading)}</h1>`
      : "",
    subtitle
      ? `<div style="margin-top:4px;font-size:15px;color:#ffffff;opacity:0.85">${escapeHtml(subtitle)}</div>`
      : "",
    "</td></tr>",
    `<tr><td style="padding:28px 32px 12px;${TEXT}">${bodyHtml}</td></tr>`,
    `<tr><td style="padding:16px 32px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.5;color:#64748b">Sent by ${company} using OpenATS.</td></tr>`,
    "</table>",
    "</div>",
  ].join("");
}
