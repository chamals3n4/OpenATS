import { db } from "../../db";
import { eq } from "drizzle-orm";
import { candidates, company, emailMessages } from "../../db/schema";
import logger from "../../utils/logger";
import { mailService } from "./mail.service";
import { notificationService } from "./notification.service";
import { getSystemEmailContent, type SystemEmailPurpose } from "./system-emails";
import { DEFAULT_TIME_ZONE } from "./time-zone";

/** What an email was for. Shown in the candidate's email history. */
export type CandidateEmailKind =
  | "manual"
  | "application_received"
  | "assessment_invite"
  | "assessment_completed"
  | "assignment_invite"
  | "interview_invite"
  | "interview_slots"
  | "interview_confirmed"
  | "interview_cancelled"
  | "rejection"
  | "offer";

export interface CandidateEmailInput {
  candidateId: number;
  to: string;
  kind: CandidateEmailKind;
  subject: string;
  html: string;
  /** The user who caused it. Left out for emails the system sends by itself. */
  sentBy?: number | null;
  templateId?: number | null;
  replyTo?: string | undefined;
}

export interface CandidateEmailResult {
  sent: boolean;
  /** The row in the email history, when it could be written. */
  messageId: number | null;
  error?: string;
}

/** The name emails are signed with, and the zone their dates and times are written in. */
export async function getCompanyForEmail(): Promise<{ companyName: string; timeZone: string }> {
  const [row] = await db
    .select({ name: company.name, timeZone: company.timeZone })
    .from(company)
    .limit(1);
  return {
    companyName: row?.name?.trim() || "The hiring team",
    timeZone: row?.timeZone || DEFAULT_TIME_ZONE,
  };
}

/** The name emails are signed with. */
export async function getCompanyName(): Promise<string> {
  return (await getCompanyForEmail()).companyName;
}

/** What a built-in email needs before it can be built: who it is from, and its wording. */
export async function emailContext(purpose: SystemEmailPurpose) {
  const [from, content] = await Promise.all([getCompanyForEmail(), getSystemEmailContent(purpose)]);
  return { ...from, content };
}

/**
 * The one way an email reaches a candidate. It sends, then writes the result to the email
 * history whether it worked or not, and never throws: the caller decides whether a failed
 * email should fail what it was doing.
 */
export async function sendCandidateEmail(input: CandidateEmailInput): Promise<CandidateEmailResult> {
  let error: string | undefined;
  try {
    await mailService.sendEmail({
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "The email could not be sent";
    logger.error(`Email "${input.kind}" to candidate ${input.candidateId} failed: ${error}`);
  }

  let messageId: number | null = null;
  try {
    const [saved] = await db
      .insert(emailMessages)
      .values({
        candidateId: input.candidateId,
        sentBy: input.sentBy ?? null,
        templateId: input.templateId ?? null,
        kind: input.kind,
        status: error ? "failed" : "sent",
        errorMessage: error ?? null,
        subject: input.subject.slice(0, 500),
        bodyHtml: input.html,
        recipientEmail: input.to,
      })
      .returning({ id: emailMessages.id });
    messageId = saved?.id ?? null;
  } catch (err) {
    // The email itself may have gone out, so this must not look like a send failure.
    logger.error(
      `Could not record email "${input.kind}" for candidate ${input.candidateId}: ${err instanceof Error ? err.message : err}`,
    );
  }

  if (error) {
    // Someone must find out, or the candidate silently never hears from us: the person who sent
    // it, or for an email the system sent by itself, the job's hiring team.
    if (input.sentBy) {
      void notifyEmailFailed(input.candidateId, input.sentBy);
    } else {
      void notificationService.notifyCandidateTeam({ type: "email_failed", candidateId: input.candidateId });
    }
  }

  return error ? { sent: false, messageId, error } : { sent: true, messageId };
}

async function notifyEmailFailed(candidateId: number, userId: number) {
  try {
    const [row] = await db
      .select({ jobId: candidates.jobId })
      .from(candidates)
      .where(eq(candidates.id, candidateId));
    if (row) {
      await notificationService.notifyPeople({ type: "email_failed", jobId: row.jobId, candidateId, userIds: [userId] });
    }
  } catch (err) {
    logger.error(`Could not record a failed-email notification for candidate ${candidateId}: ${err instanceof Error ? err.message : err}`);
  }
}
