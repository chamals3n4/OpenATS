import { eq } from "drizzle-orm";
import { db } from "../../db";
import { candidates, candidateInterviews, users } from "../../db/schema";
import type { CandidateInterview } from "../../db/schema";
import { interviewConfirmedEmail } from "../../shared/services/candidate-emails";
import { emailContext, sendCandidateEmail } from "../../shared/services/candidate-mailer";
import { socketService } from "../../shared/services/socket.service";
import { createCalendarEvent, isSharedCalendarConfigured } from "../../shared/services/google-calendar.service";
import { integrationConnectionService } from "../../shared/integrations/connection.service";
import { getProviderClient } from "../../shared/integrations/registry";
import logger from "../../utils/logger";
import { getErrorMessage } from "../../utils/error.utils";

export const DEFAULT_INTERVIEW_MINUTES = 60;

/**
 * Where an interview's calendar entry goes. Never two places: an interview that is already
 * in the interviewer's own calendar is not copied to the shared one.
 */
export function chooseCalendar(input: {
  onInterviewerCalendar: boolean;
  sharedConfigured: boolean;
}): "interviewer" | "shared" | "none" {
  if (input.onInterviewerCalendar) return "interviewer";
  return input.sharedConfigured ? "shared" : "none";
}

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
  let googleEventId: string | null = null;
  const wantsVideoLink = !!iv.meetingProvider;

  // One calendar entry per interview. The interviewer's own calendar comes first, because
  // that is the one they look at and the only one that can make a Meet link.
  let accessToken: string | null = null;
  if (iv.interviewerId) {
    try {
      accessToken = await integrationConnectionService.getValidAccessToken(iv.interviewerId);
    } catch (err) {
      logger.error(`Interview ${iv.id}: could not use the interviewer's Google connection: ${getErrorMessage(err)}`);
    }
  }

  // True once the event exists there, whether or not Google gave back an id for it.
  let onInterviewerCalendar = false;
  if (accessToken) {
    try {
      const meeting = await getProviderClient(iv.meetingProvider ?? "google_meet").createMeeting(accessToken, {
        eventName: iv.eventName ?? "Interview",
        scheduledAt,
        durationMinutes,
        attendeeEmails: candidate ? [candidate.email] : [],
        withVideoLink: wantsVideoLink,
        location: iv.eventType === "onsite" ? iv.location : iv.meetingUrl,
        description: candidate ? `Interview with ${candidate.firstName} ${candidate.lastName}` : null,
      });
      onInterviewerCalendar = true;
      meetingUrl = meeting.meetingUrl ?? meetingUrl;
      providerMeetingId = meeting.providerMeetingId ?? null;
    } catch (err) {
      // Not fatal: keep whatever link was already on the row, and try the shared calendar.
      logger.error(`Failed to add interview ${iv.id} to the interviewer's calendar: ${getErrorMessage(err)}`);
    }
  } else if (wantsVideoLink) {
    logger.warn(
      `Interview ${iv.id}: interviewer ${iv.interviewerId} has no valid ${iv.meetingProvider} connection — confirmation will go out without an auto-generated link`,
    );
  }
  if ((iv.eventType ?? "virtual") === "virtual" && !meetingUrl) {
    logger.warn(`Interview ${iv.id} confirmed as virtual but has no meeting link — recruiter attention needed`);
  }

  const calendar = chooseCalendar({
    onInterviewerCalendar,
    sharedConfigured: isSharedCalendarConfigured(),
  });
  if (calendar === "shared" && candidate) {
    try {
      googleEventId = await createCalendarEvent({
        interviewId: iv.id,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        jobTitle: iv.eventName ?? "",
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
    try {
      await db
        .update(candidateInterviews)
        .set({
          meetingUrl,
          ...(googleEventId ? { googleEventId } : {}),
          ...(providerMeetingId ? { providerMeetingId } : {}),
          updatedAt: new Date(),
        })
        .where(eq(candidateInterviews.id, iv.id));
    } catch (err) {
      logger.error(
        `Failed to save the meeting link and calendar entry for interview ${iv.id}: ${getErrorMessage(err)}`,
      );
    }
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
