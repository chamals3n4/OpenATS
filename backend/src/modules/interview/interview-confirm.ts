import { eq } from "drizzle-orm";
import { db } from "../../db";
import { candidates, candidateInterviews, users } from "../../db/schema";
import type { CandidateInterview } from "../../db/schema";
import { interviewConfirmedEmail } from "../../shared/services/candidate-emails";
import { emailContext, sendCandidateEmail } from "../../shared/services/candidate-mailer";
import { socketService } from "../../shared/services/socket.service";
import { integrationConnectionService } from "../../shared/integrations/connection.service";
import { getProviderClient } from "../../shared/integrations/registry";
import logger from "../../utils/logger";
import { getErrorMessage } from "../../utils/error.utils";

export const DEFAULT_INTERVIEW_MINUTES = 60;

type ConfirmableInterview = Pick<
  CandidateInterview,
  | "id"
  | "candidateId"
  | "interviewerId"
  | "eventName"
  | "eventType"
  | "meetingUrl"
  | "meetingProvider"
  | "location"
  | "bodyText"
  | "durationMinutes"
>;

/**
 * Everything that follows an interview getting its time, whether the candidate picked it or
 * the hiring team set it: the meeting link, the calendar entry, and the confirmation email.
 * The interview row must already hold the time. Nothing here throws, because the time is
 * agreed either way; each part that fails is logged.
 */
export async function completeInterviewBooking(iv: ConfirmableInterview, scheduledAt: Date) {
  const durationMinutes = iv.durationMinutes ?? DEFAULT_INTERVIEW_MINUTES;

  const [candidate] = await db
    .select({ email: candidates.email, firstName: candidates.firstName, lastName: candidates.lastName })
    .from(candidates)
    .where(eq(candidates.id, iv.candidateId));

  const interviewer = iv.interviewerId
    ? (await db.select({ email: users.email }).from(users).where(eq(users.id, iv.interviewerId)))[0]
    : undefined;

  let meetingUrl = iv.meetingUrl;
  let providerMeetingId: string | null = null;
  if (iv.meetingProvider && iv.interviewerId) {
    try {
      const accessToken = await integrationConnectionService.getValidAccessToken(iv.interviewerId);
      if (accessToken) {
        const meeting = await getProviderClient(iv.meetingProvider).createMeeting(accessToken, {
          eventName: iv.eventName ?? "Interview",
          scheduledAt,
          durationMinutes,
          attendeeEmails: candidate ? [candidate.email] : [],
        });
        meetingUrl = meeting.meetingUrl;
        providerMeetingId = meeting.providerMeetingId ?? null;
      } else {
        logger.warn(
          `Interview ${iv.id}: interviewer ${iv.interviewerId} no longer has a valid ${iv.meetingProvider} connection — confirmation will go out without an auto-generated link`,
        );
      }
    } catch (err) {
      // Not fatal: keep whatever link was already on the row.
      logger.error(`Failed to auto-generate meeting link for interview ${iv.id}: ${getErrorMessage(err)}`);
    }
  }
  if ((iv.eventType ?? "virtual") === "virtual" && !meetingUrl) {
    logger.warn(`Interview ${iv.id} confirmed as virtual but has no meeting link — recruiter attention needed`);
  }

  let googleEventId: string | null = null;
  if (candidate && iv.eventName) {
    try {
      const gcal = await import("../../shared/services/google-calendar.service");
      googleEventId = await gcal.createCalendarEvent({
        interviewId: iv.id,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        jobTitle: "",
        stageName: "",
        scheduledAt,
        durationMinutes,
        notes: iv.bodyText ?? null,
        attendeeEmails: [candidate.email, ...(interviewer ? [interviewer.email] : [])],
        meetingUrl,
      });
    } catch (err) {
      logger.error(`Failed to create calendar event for interview ${iv.id}: ${getErrorMessage(err)}`);
    }
  }

  if (meetingUrl !== iv.meetingUrl || googleEventId || providerMeetingId) {
    await db
      .update(candidateInterviews)
      .set({
        meetingUrl,
        ...(googleEventId ? { googleEventId } : {}),
        ...(providerMeetingId ? { providerMeetingId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(candidateInterviews.id, iv.id));
  }

  if (candidate && iv.eventName) {
    const eventName = iv.eventName;
    void emailContext("interview_confirmed")
      .then((context) =>
        sendCandidateEmail({
          candidateId: iv.candidateId,
          to: candidate.email,
          kind: "interview_confirmed",
          ...interviewConfirmedEmail({
            ...context,
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            eventName,
            eventType: iv.eventType ?? "virtual",
            scheduledAt,
            durationMinutes,
            meetingUrl,
            location: iv.location ?? null,
          }),
        }),
      )
      .catch((err: unknown) => {
        logger.error(`Failed to send confirmation email for interview ${iv.id}: ${getErrorMessage(err)}`);
      });
  }

  socketService.notifyInterviewChanged({ interviewId: iv.id, candidateId: iv.candidateId });
}
