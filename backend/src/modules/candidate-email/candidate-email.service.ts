import { desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { candidates, emailMessages, users } from "../../db/schema";
import { mailService } from "../../shared/services/mail.service";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Turns what a person typed into a simple email. Everything is escaped, so nothing the
 * sender (or text pasted in) contains can become markup. Blank lines separate paragraphs;
 * single line breaks are kept.
 */
export function plainTextToEmailHtml(text: string): string {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;line-height:1.6">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#0f172a;max-width:600px">${paragraphs}</div>`;
}

/** A subject is one line; a pasted line break must not turn into extra headers. */
export function cleanSubject(subject: string): string {
  return subject.replace(/[\r\n]+/g, " ").trim();
}

/**
 * "Name <address>" for a Reply-To header. Characters that could end the name early or start
 * a new header are removed, so a display name can never alter the header.
 */
export function formatReplyTo(name: string | null | undefined, email: string): string {
  const safeName = (name ?? "").replace(/[<>",\r\n]/g, "").replace(/\s+/g, " ").trim();
  return safeName ? `${safeName} <${email}>` : email;
}

/**
 * Where replies should go: the sender's own address by default, or a different address the
 * sender chose (for example a shared HR mailbox). A chosen address is used as given, without
 * the sender's name, since it may not be theirs.
 */
export function resolveReplyTo(
  sender: { firstName: string; lastName: string; email: string } | undefined,
  chosen?: string | null,
): string | undefined {
  const custom = chosen?.trim();
  if (custom && custom.toLowerCase() !== sender?.email.toLowerCase()) return custom;
  return sender
    ? formatReplyTo(`${sender.firstName} ${sender.lastName}`, sender.email)
    : undefined;
}

export class CandidateNotFoundError extends Error {
  constructor() {
    super("Candidate not found");
  }
}

const sentEmailColumns = {
  id: emailMessages.id,
  candidateId: emailMessages.candidateId,
  subject: emailMessages.subject,
  bodyHtml: emailMessages.bodyHtml,
  recipientEmail: emailMessages.recipientEmail,
  sentAt: emailMessages.sentAt,
  sentByName: users.firstName,
  sentByLastName: users.lastName,
};

function withSenderName<
  T extends { sentByName: string | null; sentByLastName: string | null },
>({ sentByName, sentByLastName, ...rest }: T) {
  const name = [sentByName, sentByLastName].filter(Boolean).join(" ").trim();
  return { ...rest, sentByName: name || null };
}

export const candidateEmailService = {
  /**
   * Sends first and records afterwards, so the history only ever lists emails that were
   * actually handed to the mail provider.
   */
  async send(input: {
    candidateId: number;
    subject: string;
    body: string;
    sentBy: number;
    /** Overrides the default of replying to the sender. */
    replyTo?: string | null;
  }) {
    const [candidate] = await db
      .select({ email: candidates.email })
      .from(candidates)
      .where(eq(candidates.id, input.candidateId));
    if (!candidate) throw new CandidateNotFoundError();

    // Replies go to the person who sent the email, not to the app's From address.
    const [sender] = await db
      .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, input.sentBy));

    const subject = cleanSubject(input.subject);
    const bodyHtml = plainTextToEmailHtml(input.body);

    const replyTo = resolveReplyTo(sender, input.replyTo);
    await mailService.sendEmail({
      to: candidate.email,
      subject,
      html: bodyHtml,
      ...(replyTo ? { replyTo } : {}),
    });

    const [saved] = await db
      .insert(emailMessages)
      .values({
        candidateId: input.candidateId,
        sentBy: input.sentBy,
        subject,
        bodyHtml,
        recipientEmail: candidate.email,
      })
      .returning({ id: emailMessages.id });

    const [row] = await db
      .select(sentEmailColumns)
      .from(emailMessages)
      .leftJoin(users, eq(emailMessages.sentBy, users.id))
      .where(eq(emailMessages.id, saved!.id));

    return withSenderName(row!);
  },

  async listByCandidate(candidateId: number) {
    const rows = await db
      .select(sentEmailColumns)
      .from(emailMessages)
      .leftJoin(users, eq(emailMessages.sentBy, users.id))
      .where(eq(emailMessages.candidateId, candidateId))
      .orderBy(desc(emailMessages.sentAt), desc(emailMessages.id));

    return rows.map(withSenderName);
  },
};
