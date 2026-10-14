export const SUBJECT_MAX = 200;
export const BODY_MAX = 10000;

export interface EmailDraft {
  subject: string;
  body: string;
  /** Where replies should go instead of the sender's own address; blank means the default. */
  replyTo?: string;
}

export interface EmailErrors {
  subject?: string;
  body?: string;
  replyTo?: string;
}

/** One plain address: no spaces, commas, names or angle brackets, which the server also refuses. */
const SINGLE_ADDRESS = /^[^\s@,<>"]+@[^\s@,<>"]+\.[^\s@,<>"]+$/;

export function isValidReplyAddress(value: string) {
  return SINGLE_ADDRESS.test(value.trim());
}

/** The address to send as the reply-to, or undefined when the sender's own address is fine. */
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

/** The {{variables}} still in the text. Sent as they are, the candidate would see the braces. */
export function unfilledVariables(text: string): string[] {
  return [...new Set([...text.matchAll(VARIABLE)].map((match) => `{{${match[1]}}}`))];
}

function unfilledMessage(names: string[]) {
  return `Replace ${names.join(", ")} with real text before sending.`;
}

/** Puts this candidate's details into a template's text. Variables with no value are left in place. */
export function fillTemplateText(text: string, values: Record<string, string | null | undefined>): string {
  return text.replace(VARIABLE, (whole, name: string) => values[name] || whole);
}

/**
 * A template's HTML as the plain text the message box holds: paragraphs become blank-line
 * separated, list items get a dash, and a button becomes its label and link. Parsed, never
 * executed or injected.
 */
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

/**
 * The same shape the server builds the email in: blank lines separate paragraphs, and a
 * single line break stays a line break. Used to preview what the candidate will see.
 */
export function splitParagraphs(text: string): string[][] {
  const trimmed = text.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return [];
  return trimmed.split(/\n{2,}/).map((paragraph) => paragraph.split("\n"));
}

/** The readable text of a sent email, for a short preview. Parsed, never executed or injected. */
export function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style").forEach((node) => node.remove());
  // textContent glues blocks together ("Hello" + "Bye" = "HelloBye"), so add a space after each.
  doc.querySelectorAll("p, div, br, li").forEach((node) => node.after(" "));
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}
