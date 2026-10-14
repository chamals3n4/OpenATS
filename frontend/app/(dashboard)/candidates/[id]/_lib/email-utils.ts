export const SUBJECT_MAX = 200;
export const BODY_MAX = 10000;

export interface EmailDraft {
  subject: string;
  body: string;
  replyTo?: string;
}

export interface EmailErrors {
  subject?: string;
  body?: string;
  replyTo?: string;
}

/** One plain email address */
const SINGLE_ADDRESS = /^[^\s@,<>"]+@[^\s@,<>"]+\.[^\s@,<>"]+$/;

export function isValidReplyAddress(value: string) {
  return SINGLE_ADDRESS.test(value.trim());
}

export function chosenReplyTo(replyTo: string, ownEmail: string | undefined) {
  const value = replyTo.trim();
  if (!value || value.toLowerCase() === ownEmail?.toLowerCase()) return undefined;
  return value;
}

export function validateEmail({ subject, body, replyTo = "" }: EmailDraft): EmailErrors {
  const errors: EmailErrors = {};
  if (replyTo.trim() && !isValidReplyAddress(replyTo)) {
    errors.replyTo = "Enter a single email address, like hr@yourcompany.com.";
  }
  if (!subject.trim()) errors.subject = "Add a subject.";
  else if (subject.trim().length > SUBJECT_MAX) {
    errors.subject = `Keep the subject under ${SUBJECT_MAX} characters.`;
  } else if (unfilledVariables(subject).length > 0) {
    errors.subject = unfilledMessage(unfilledVariables(subject));
  }
  if (!body.trim()) errors.body = "Write a message.";
  else if (body.trim().length > BODY_MAX) {
    errors.body = `Keep the message under ${BODY_MAX.toLocaleString("en-US")} characters.`;
  } else if (unfilledVariables(body).length > 0) {
    errors.body = unfilledMessage(unfilledVariables(body));
  }
  return errors;
}

const VARIABLE = /\{\{\s*([^{}]+?)\s*\}\}/g;

/** {{variables}} still left in the text */
export function unfilledVariables(text: string): string[] {
  return [...new Set([...text.matchAll(VARIABLE)].map((match) => `{{${match[1]}}}`))];
}

function unfilledMessage(names: string[]) {
  return `Replace ${names.join(", ")} with real text before sending.`;
}

/** Fill template variables for this candidate */
export function fillTemplateText(text: string, values: Record<string, string | null | undefined>): string {
  return text.replace(VARIABLE, (whole, name: string) => values[name] || whole);
}

/** Convert template HTML to plain text */
export function templateHtmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style").forEach((node) => node.remove());
  doc.querySelectorAll("a[data-email-button]").forEach((node) => {
    const href = node.getAttribute("href") ?? "";
    if (/^https?:\/\//.test(href)) node.append(`: ${href}`);
  });
  doc.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
  doc.querySelectorAll("li").forEach((node) => node.prepend("- "));
  doc.querySelectorAll("li").forEach((node) => node.after("\n"));
  doc.querySelectorAll("p, h1, h2, h3, ul, ol, div, hr").forEach((node) => node.after("\n\n"));
  return (doc.body.textContent ?? "")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Build preview HTML the same way the server does */
export function splitParagraphs(text: string): string[][] {
  const trimmed = text.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return [];
  return trimmed.split(/\n{2,}/).map((paragraph) => paragraph.split("\n"));
}

/** Plain text of a sent email for the preview */
export function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style").forEach((node) => node.remove());
  // Add spaces so blocks don't join together
  doc.querySelectorAll("p, div, br, li").forEach((node) => node.after(" "));
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}
