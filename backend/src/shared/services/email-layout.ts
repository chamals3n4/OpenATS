/**
 * The one design every email to a candidate uses. Inline styles only, because email clients
 * strip <style> blocks, and tables for the frame, because Outlook ignores most box CSS.
 *
 * It is a plain business letter: a white sheet on a pale background, the company's name at the
 * top under a thin line in its colour, a dark heading, and a quiet footer. The colour is kept for
 * that line, links and the one button, so the button is the thing that stands out. Corners are
 * square or nearly so, and there are no shadows or gradients, which email clients drop anyway.
 */

/** Keep in sync with --theme-color in frontend/app/globals.css. */
export const EMAIL_BRAND_COLOR = "#145962";

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const TEXT = "font-size:15px;line-height:1.65;color:#334155";
const INK = "#0f172a";
const MUTED = "#64748b";
const RULE = "#e2e8f0";
/** Space at the sides of the sheet. */
const GUTTER = "40px";

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
    `<td style="padding:11px 16px;border-top:1px solid ${RULE};font-size:13px;line-height:1.5;color:${MUTED};white-space:nowrap;vertical-align:top;width:1%">${escapeHtml(label)}</td>`,
    `<td style="padding:11px 16px 11px 4px;border-top:1px solid ${RULE};font-size:14px;line-height:1.5;color:${INK};font-weight:600">${valueHtml}</td>`,
    "</tr>",
  ].join("");
}

/** The facts of the matter (date, time, place), set apart from the message in a ruled panel. */
export function emailDetails(rows: string[]): string {
  // Each row draws the line above itself and the panel draws the one below the last, so there
  // is exactly one line between rows whatever their number.
  return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:8px 0 24px;background:#f8fafc;border:1px solid ${RULE};border-top:0">${rows.join("")}</table>`;
}

export function emailButton(href: string, label: string): string {
  return [
    '<div style="margin:24px 0 12px">',
    `<a href="${escapeHtml(href)}" style="display:inline-block;background:${EMAIL_BRAND_COLOR};color:#ffffff;padding:13px 26px;border-radius:3px;font-size:15px;font-weight:600;line-height:1.2;text-decoration:none">${escapeHtml(label)}</a>`,
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
    `<div style="background:#f3f4f6;padding:40px 16px;font-family:${FONT}">`,
    `<table role="presentation" align="center" style="width:100%;max-width:600px;margin:0 auto;border-collapse:collapse;background:#ffffff;border:1px solid #d7dce3">`,
    // The company's colour, as a thin line across the top of the sheet.
    `<tr><td style="background:${EMAIL_BRAND_COLOR};height:4px;font-size:0;line-height:0">&nbsp;</td></tr>`,
    `<tr><td style="padding:24px ${GUTTER};border-bottom:1px solid ${RULE};font-size:15px;font-weight:700;letter-spacing:0.01em;line-height:1.3;color:${INK}">${company}</td></tr>`,
    heading
      ? [
          `<tr><td style="padding:32px ${GUTTER} 0">`,
          `<h1 style="margin:0;font-size:24px;font-weight:700;line-height:1.25;letter-spacing:-0.01em;color:${INK}">${escapeHtml(heading)}</h1>`,
          subtitle
            ? `<div style="margin-top:6px;font-size:15px;line-height:1.5;color:${MUTED}">${escapeHtml(subtitle)}</div>`
            : "",
          "</td></tr>",
        ].join("")
      : "",
    `<tr><td style="padding:${heading ? "24px" : "32px"} ${GUTTER} 20px;${TEXT}">${bodyHtml}</td></tr>`,
    `<tr><td style="padding:18px ${GUTTER};background:#f9fafb;border-top:1px solid ${RULE};font-size:12px;line-height:1.5;color:${MUTED}">Sent by ${company} using OpenATS.</td></tr>`,
    "</table>",
    "</div>",
  ].join("");
}
