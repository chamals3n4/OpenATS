import { eq } from "drizzle-orm";
import { db } from "../../db";
import { candidates, candidateInterviews, jobs, users } from "../../db/schema";
import type { CandidateInterview } from "../../db/schema";
import { interviewConfirmedEmail } from "../../shared/services/candidate-emails";
import { emailContext, getCompanyForEmail, sendCandidateEmail } from "../../shared/services/candidate-mailer";
import { mailService } from "../../shared/services/mail.service";
import { interviewerBookedEmail } from "../../shared/services/staff-emails";
import { frontendUrl } from "../../utils/frontend-url";
import { notificationService } from "../../shared/services/notification.service";
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
  | "jobId"
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
export async function completeInterviewBooking(
  iv: ConfirmableInterview,
  scheduledAt: Date,
  options: { actorId?: number | null } = {},
) {
  const durationMinutes = iv.durationMinutes ?? DEFAULT_INTERVIEW_MINUTES;

  const [candidate] = await db
    .select({ email: candidates.email, firstName: candidates.firstName, lastName: candidates.lastName })
    .from(candidates)
    .where(eq(candidates.id, iv.candidateId));

  let meetingUrl = iv.meetingUrl;
  let providerMeetingId: string | null = null;
  const wantsVideoLink = !!iv.meetingProvider;

  // The calendar entry goes in the interviewer's own Google Calendar, when they have connected
  // it. An interviewer who has not gets no entry; the emails still go out.
  let accessToken: string | null = null;
  if (iv.interviewerId) {
    try {
      accessToken = await integrationConnectionService.getValidAccessToken(iv.interviewerId);
    } catch (err) {
      logger.error(`Interview ${iv.id}: could not use the interviewer's Google connection: ${getErrorMessage(err)}`);
    }
  }

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
      meetingUrl = meeting.meetingUrl ?? meetingUrl;
      providerMeetingId = meeting.providerMeetingId ?? null;
    } catch (err) {
      // Not fatal: keep whatever link was already on the row.
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

  if (meetingUrl !== iv.meetingUrl || providerMeetingId) {
    try {
      await db
        .update(candidateInterviews)
        .set({
          meetingUrl,
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

  // The team and the interviewer, except whoever set the time themselves.
  void notificationService.notifyJobTeam({
    type: "interview_booked",
    jobId: iv.jobId,
    candidateId: iv.candidateId,
    also: [iv.interviewerId],
    exclude: options.actorId ?? null,
  });
  if (iv.interviewerId) {
    void emailInterviewer({ ...iv, meetingUrl }, scheduledAt);
  }
}

/**
 * Emails the interviewer that an interview with them has its time: when it is booked, and when a
 * booked interview is given to someone else. Never throws.
 */
export async function emailInterviewer(
  iv: Pick<
    CandidateInterview,
    "id" | "candidateId" | "jobId" | "interviewerId" | "eventName" | "eventType" | "meetingUrl" | "location" | "durationMinutes"
  >,
  scheduledAt: Date,
): Promise<void> {
  if (!iv.interviewerId) return;
  try {
    const [[interviewer], [candidate], [job], company] = await Promise.all([
      db
        .select({ email: users.email, firstName: users.firstName, isActive: users.isActive })
        .from(users)
        .where(eq(users.id, iv.interviewerId)),
      db
        .select({ firstName: candidates.firstName, lastName: candidates.lastName })
        .from(candidates)
        .where(eq(candidates.id, iv.candidateId)),
      db.select({ title: jobs.title }).from(jobs).where(eq(jobs.id, iv.jobId)),
      getCompanyForEmail(),
    ]);
    if (!interviewer?.isActive || !candidate) return;

    const email = interviewerBookedEmail({
      ...company,
      interviewerName: interviewer.firstName,
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      jobTitle: job?.title ?? null,
      eventName: iv.eventName ?? "Interview",
      eventType: iv.eventType ?? "virtual",
      scheduledAt,
      durationMinutes: iv.durationMinutes ?? DEFAULT_INTERVIEW_MINUTES,
      meetingUrl: iv.meetingUrl,
      location: iv.location ?? null,
      candidateUrl: frontendUrl(`/candidates/${iv.candidateId}?section=interviews`),
    });
    await mailService.sendEmail({ to: interviewer.email, subject: email.subject, html: email.html });
  } catch (err) {
    logger.error(`Failed to email the interviewer of interview ${iv.id}: ${getErrorMessage(err)}`);
  }
}
