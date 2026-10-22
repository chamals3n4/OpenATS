// Same look as the email button on the backend (shared/services/email-layout.ts)
export const BUTTON_STYLE =
  "display:inline-block;background:#145962;color:#ffffff;padding:12px 22px;border-radius:6px;font-size:15px;font-weight:600;line-height:1.2;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

/** A link a button can go to: a web or mail address, or a variable such as {{offer_review_url}}. */
export function isUsableButtonLink(href: string): boolean {
  return /^(https?:\/\/\S+|mailto:\S+|\{\{\s*\w+\s*\}\})$/i.test(href.trim());
}
