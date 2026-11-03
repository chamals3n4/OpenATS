import { formatEmailDate, formatEmailTime } from "./time-zone";
import {
  emailButton,
  emailDetailRow,
  emailDetails,
  emailLinkFallback,
  emailParagraph,
  escapeHtml,
  renderEmailLayout,
} from "./email-layout";
import type { BuiltEmail } from "./candidate-emails";

/**
 * Emails to the hiring team rather than to a candidate. Their wording is fixed, unlike the
 * candidate emails, and they are not written to a candidate's email history. Pure, like
 * candidate-emails.ts: every value is escaped here.
 */

/** Tells the interviewer an interview with them now has its time. */
export function interviewerBookedEmail(input: {
  companyName: string;
  timeZone?: string | undefined;
  interviewerName: string;
  candidateName: string;
  jobTitle: string | null;
  eventName: string;
  eventType: string;
  scheduledAt: Date;
  durationMinutes: number;
  meetingUrl: string | null;
  location: string | null;
  candidateUrl: string;
}): BuiltEmail {
  const date = formatEmailDate(input.scheduledAt, input.timeZone);
  const time = formatEmailTime(input.scheduledAt, input.timeZone);
  const zone = input.timeZone ?? "UTC";
  return {
    subject: `Interview booked: ${input.candidateName}, ${date} at ${time}`,
    html: renderEmailLayout({
      companyName: input.companyName,
      heading: "You have an interview",
      subtitle: `${date} · ${time}`,
      bodyHtml: [
        emailParagraph(`Hello ${escapeHtml(input.interviewerName)},`),
        emailParagraph(
          `You are interviewing <strong>${escapeHtml(input.candidateName)}</strong>` +
            (input.jobTitle ? ` for <strong>${escapeHtml(input.jobTitle)}</strong>` : "") +
            ".",
        ),
        emailDetails([
          emailDetailRow("Interview", escapeHtml(input.eventName)),
          emailDetailRow("Date", date),
          emailDetailRow("Time", `${time} (${escapeHtml(zone)})`),
          emailDetailRow("Duration", `${input.durationMinutes} minutes`),
          emailDetailRow("Interview type", input.eventType === "onsite" ? "On-site" : "Virtual"),
          ...(input.location ? [emailDetailRow("Location", escapeHtml(input.location))] : []),
          ...(input.meetingUrl
            ? [
                emailDetailRow(
                  "Meeting link",
                  `<a href="${escapeHtml(input.meetingUrl)}" style="color:#145962;word-break:break-all">${escapeHtml(input.meetingUrl)}</a>`,
                ),
              ]
            : input.eventType === "onsite"
              ? []
              : [emailDetailRow("Meeting link", "None yet. Add one on the candidate's page.")]),
        ]),
        emailButton(input.candidateUrl, "Open the candidate"),
        emailLinkFallback(input.candidateUrl),
      ].join(""),
    }),
  };
}
