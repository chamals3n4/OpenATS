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
import {
  SYSTEM_EMAILS,
  fillBodyHtml,
  fillSubject,
  type SystemEmailContent,
  type SystemEmailPurpose,
} from "./system-emails";

/**
 * Every built-in email to a candidate. The subject and the message come from `content` (the
 * company's own wording, or the built-in one when left out); the heading, details and buttons
 * are added here. Each function only builds text, so it can be tested without sending
 * anything. All values are escaped here.
 */

export interface BuiltEmail {
  subject: string;
  html: string;
}

const typeLabel = (eventType: string) => (eventType === "onsite" ? "On-site" : "Virtual");

const hello = (name: string) => emailParagraph(`Hello ${escapeHtml(name)},`);

/** What every builder takes besides its own details. */
interface Common {
  companyName: string;
  /** The company's time zone, for any date or time in the email. Left out, UTC. */
  timeZone?: string | undefined;
  /** The wording to use. Left out, the built-in wording is used. */
  content?: SystemEmailContent | undefined;
}

/** The editor writes bare <p> tags; email clients need the spacing spelled out. */
const styleMessage = (html: string) =>
  html.replace(/<p>/g, '<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155">');

function compose(
  purpose: SystemEmailPurpose,
  common: Common,
  values: Record<string, string>,
  frame: { heading: string; subtitle?: string | undefined; after?: string[] },
): BuiltEmail {
  const content = common.content ?? SYSTEM_EMAILS[purpose];
  const all = { ...values, company_name: common.companyName };
  return {
    subject: fillSubject(content.subject, all),
    html: renderEmailLayout({
      companyName: common.companyName,
      heading: frame.heading,
      subtitle: frame.subtitle,
      bodyHtml: styleMessage(fillBodyHtml(content.bodyHtml, all)) + (frame.after ?? []).join(""),
    }),
  };
}
const link = (url: string) =>
  `<a href="${escapeHtml(url)}" style="color:#145962;word-break:break-all">${escapeHtml(url)}</a>`;

export function applicationReceivedEmail(input: Common & { candidateName: string; jobTitle: string }): BuiltEmail {
  return compose(
    "application_received",
    input,
    { candidate_name: input.candidateName, job_title: input.jobTitle },
    { heading: "We received your application", subtitle: input.jobTitle },
  );
}

export function assessmentInviteEmail(
  input: Common & { firstName: string; assessmentTitle: string; inviteUrl: string; expiresAt: Date },
): BuiltEmail {
  return compose(
    "assessment_invite",
    input,
    { candidate_name: input.firstName, assessment_title: input.assessmentTitle },
    {
      heading: "You are invited to an assessment",
      subtitle: input.assessmentTitle,
      after: [
        emailDetails([
          emailDetailRow("Assessment", escapeHtml(input.assessmentTitle)),
          emailDetailRow("Open until", formatEmailDate(input.expiresAt, input.timeZone)),
        ]),
        emailButton(input.inviteUrl, "Start the assessment"),
        emailLinkFallback(input.inviteUrl),
      ],
    },
  );
}

export function assignmentInviteEmail(
  input: Common & { firstName: string; assignmentTitle: string; assignmentUrl: string; dueAt: Date },
): BuiltEmail {
  return compose(
    "assignment_invite",
    input,
    { candidate_name: input.firstName, assignment_title: input.assignmentTitle },
    {
      heading: "You have a take-home assignment",
      subtitle: input.assignmentTitle,
      after: [
        emailDetails([
          emailDetailRow("Assignment", escapeHtml(input.assignmentTitle)),
          emailDetailRow("Hand in by", `${formatEmailDate(input.dueAt, input.timeZone)} ${formatEmailTime(input.dueAt, input.timeZone)}`),
        ]),
        emailButton(input.assignmentUrl, "Open the assignment"),
        emailLinkFallback(input.assignmentUrl),
      ],
    },
  );
}

export function assessmentCompletedEmail(
  input: Common & {
    firstName: string;
    assessmentTitle: string;
    /** Set when the assessment was handed in for the candidate, for example when time ran out. */
    autoSubmitReason?: string | undefined;
  },
): BuiltEmail {
  if (!input.autoSubmitReason) {
    return compose(
      "assessment_completed",
      input,
      { candidate_name: input.firstName, assessment_title: input.assessmentTitle },
      { heading: "Assessment completed", subtitle: input.assessmentTitle },
    );
  }

  // This one explains what happened to the candidate, so its wording is not editable.
  return {
    subject: `Assessment Auto-Submitted: ${input.assessmentTitle}`,
    html: renderEmailLayout({
      companyName: input.companyName,
      heading: "Your assessment was submitted",
      subtitle: input.assessmentTitle,
      bodyHtml: [
        hello(input.firstName),
        emailParagraph(
          `Your answers for <strong>${escapeHtml(input.assessmentTitle)}</strong> were saved and submitted automatically.`,
        ),
        `<p style="margin:0 0 16px;padding:12px 16px;border-left:3px solid #d97706;background:#fffbeb;font-size:15px;line-height:1.6;color:#78350f">${escapeHtml(input.autoSubmitReason)}</p>`,
        emailParagraph("If you think this is a mistake, please contact the hiring team."),
      ].join(""),
    }),
  };
}

/** Asks the candidate to pick one of the offered times. */
export function interviewSlotsEmail(
  input: Common & {
    candidateName: string;
    eventName: string;
    jobTitle: string;
    eventType: string;
    meetingUrl: string | null;
    location: string | null;
    /** A message typed for this one interview. It replaces the usual message. */
    bodyText: string | null;
    publicUrl: string;
  },
): BuiltEmail {
  const wording = input.content ?? SYSTEM_EMAILS.interview_slots;
  const content = input.bodyText
    ? {
        subject: wording.subject,
        bodyHtml: `<p>Hello {{candidate_name}},</p><p>${escapeHtml(input.bodyText).replace(/\n/g, "<br>")}</p>`,
      }
    : wording;

  return compose(
    "interview_slots",
    { companyName: input.companyName, content },
    { candidate_name: input.candidateName, event_name: input.eventName, job_title: input.jobTitle },
    {
      heading: input.eventName,
      subtitle: input.jobTitle,
      after: [
        emailDetails([
          emailDetailRow("Position", escapeHtml(input.jobTitle)),
          emailDetailRow("Interview type", typeLabel(input.eventType)),
          ...(input.meetingUrl ? [emailDetailRow("Meeting link", link(input.meetingUrl))] : []),
          ...(input.location ? [emailDetailRow("Location", escapeHtml(input.location))] : []),
        ]),
        emailButton(input.publicUrl, "Choose a time"),
        emailLinkFallback(input.publicUrl),
      ],
    },
  );
}

export function interviewConfirmedEmail(
  input: Common & {
    candidateName: string;
    eventName: string;
    eventType: string;
    scheduledAt: Date;
    durationMinutes: number;
    meetingUrl: string | null;
    location: string | null;
  },
): BuiltEmail {
  return compose(
    "interview_confirmed",
    input,
    { candidate_name: input.candidateName, event_name: input.eventName },
    {
      heading: "Your interview is confirmed",
      subtitle: `${formatEmailDate(input.scheduledAt, input.timeZone)} · ${formatEmailTime(input.scheduledAt, input.timeZone)}`,
      after: [
        emailDetails([
          emailDetailRow("Date", formatEmailDate(input.scheduledAt, input.timeZone)),
          emailDetailRow("Time", formatEmailTime(input.scheduledAt, input.timeZone)),
          emailDetailRow("Duration", `${input.durationMinutes} minutes`),
          emailDetailRow("Interview type", typeLabel(input.eventType)),
          ...(input.location ? [emailDetailRow("Location", escapeHtml(input.location))] : []),
        ]),
        ...(input.meetingUrl
          ? [emailButton(input.meetingUrl, "Join the meeting"), emailLinkFallback(input.meetingUrl)]
          : []),
      ],
    },
  );
}

export function interviewCancelledEmail(
  input: Common & { candidateName: string; eventName: string; scheduledAt: Date | null },
): BuiltEmail {
  return compose(
    "interview_cancelled",
    input,
    { candidate_name: input.candidateName, event_name: input.eventName },
    {
      heading: "Your interview was cancelled",
      subtitle: input.eventName,
      after: input.scheduledAt
        ? [
            emailDetails([
              emailDetailRow("Cancelled date", formatEmailDate(input.scheduledAt, input.timeZone)),
              emailDetailRow("Cancelled time", formatEmailTime(input.scheduledAt, input.timeZone)),
            ]),
          ]
        : [],
    },
  );
}

export function offerEmail(
  input: Common & { candidateName: string; jobTitle: string; reviewUrl: string },
): BuiltEmail {
  return compose(
    "offer",
    input,
    { candidate_name: input.candidateName, job_title: input.jobTitle },
    {
      heading: "You have an offer",
      subtitle: input.jobTitle,
      after: [emailButton(input.reviewUrl, "Review your offer"), emailLinkFallback(input.reviewUrl)],
    },
  );
}

/** Wraps content written by the hiring team (a template, or a typed message) in the layout. */
export function writtenEmail(input: { companyName: string; contentHtml: string }): string {
  return renderEmailLayout({ companyName: input.companyName, bodyHtml: input.contentHtml });
}
