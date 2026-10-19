import {
  applicationReceivedEmail,
  assessmentCompletedEmail,
  assessmentInviteEmail,
  assignmentInviteEmail,
  interviewCancelledEmail,
  interviewConfirmedEmail,
  interviewSlotsEmail,
  offerEmail,
  type BuiltEmail,
} from "./candidate-emails";
import { SYSTEM_EMAILS, type SystemEmailContent, type SystemEmailPurpose } from "./system-emails";

/**
 * An automatic email exactly as a candidate would receive it, for the editor's preview.
 *
 * It is built by the same functions that build the real email, with made-up details in place of
 * a candidate's, so the preview cannot drift from what is sent: the heading, the details table,
 * the button and the footer are the real ones. Nothing is sent and nothing is saved.
 */
export function previewSystemEmail(
  purpose: SystemEmailPurpose,
  content: SystemEmailContent,
  from: { companyName: string; timeZone: string },
  now: Date = new Date(),
): BuiltEmail {
  const sample = Object.fromEntries(
    SYSTEM_EMAILS[purpose].variables.map((variable) => [variable.name, variable.sample]),
  );
  const candidateName = sample.candidate_name ?? "Alex Johnson";
  const firstName = candidateName.split(" ")[0] ?? candidateName;
  const jobTitle = sample.job_title ?? "Senior Software Engineer";
  const eventName = sample.event_name ?? "Technical interview";
  const assessmentTitle = sample.assessment_title ?? "Backend skills test";

  const site = (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "");
  // Next week at 10:00 UTC, so the date and time rows show how they are really written.
  const interviewAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7, 10, 0, 0));
  const common = { ...from, content };

  switch (purpose) {
    case "application_received":
      return applicationReceivedEmail({ ...common, candidateName, jobTitle });
    case "assessment_invite":
      return assessmentInviteEmail({
        ...common,
        firstName,
        assessmentTitle,
        inviteUrl: `${site}/assessment/example-link`,
        expiresAt: interviewAt,
      });
    case "assignment_invite":
      return assignmentInviteEmail({
        ...common,
        firstName,
        assignmentTitle: sample.assignment_title ?? "Build a job board",
        assignmentUrl: `${site}/assignment/example-link`,
        dueAt: interviewAt,
      });
    case "assessment_completed":
      return assessmentCompletedEmail({ ...common, firstName, assessmentTitle });
    case "interview_slots":
      return interviewSlotsEmail({
        ...common,
        candidateName,
        eventName,
        jobTitle,
        eventType: "virtual",
        meetingUrl: "https://meet.google.com/abc-defg-hij",
        location: null,
        bodyText: null,
        publicUrl: `${site}/interview/example-link`,
      });
    case "interview_confirmed":
      return interviewConfirmedEmail({
        ...common,
        candidateName,
        eventName,
        eventType: "virtual",
        scheduledAt: interviewAt,
        durationMinutes: 60,
        meetingUrl: "https://meet.google.com/abc-defg-hij",
        location: null,
      });
    case "interview_cancelled":
      return interviewCancelledEmail({ ...common, candidateName, eventName, scheduledAt: interviewAt });
    case "offer":
      return offerEmail({ ...common, candidateName, jobTitle, reviewUrl: `${site}/offer/example-link` });
  }
}
