import {
  emailButton,
  emailDetailRow,
  emailDetails,
  emailLinkFallback,
  emailParagraph,
  escapeHtml,
  renderEmailLayout,
} from "./email-layout";

/**
 * The wording of every built-in email to a candidate. Each function only builds text, so it
 * can be tested without sending anything. All values are escaped here.
 */

export interface BuiltEmail {
  subject: string;
  html: string;
}

const typeLabel = (eventType: string) => (eventType === "onsite" ? "On-site" : "Virtual");

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(d: Date): string {
  // The zone is included so the time cannot be misread.
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

const hello = (name: string) => emailParagraph(`Hello ${escapeHtml(name)},`);
const link = (url: string) =>
  `<a href="${escapeHtml(url)}" style="color:#145962;word-break:break-all">${escapeHtml(url)}</a>`;

export function applicationReceivedEmail(input: {
  companyName: string;
  candidateName: string;
  jobTitle: string;
}): BuiltEmail {
  return {
    subject: `${input.jobTitle} - Thank you for your application`,
    html: renderEmailLayout({
      companyName: input.companyName,
      heading: "We received your application",
      subtitle: input.jobTitle,
      bodyHtml: [
        hello(input.candidateName),
        emailParagraph(
          `Thank you for applying for <strong>${escapeHtml(input.jobTitle)}</strong>. We have your application and will review it carefully.`,
        ),
        emailParagraph(
          "If your experience matches what we are looking for, we will contact you about the next steps.",
        ),
      ].join(""),
    }),
  };
}

export function assessmentInviteEmail(input: {
  companyName: string;
  firstName: string;
  assessmentTitle: string;
  inviteUrl: string;
  expiresAt: Date;
}): BuiltEmail {
  return {
    subject: `Assessment Invitation: ${input.assessmentTitle}`,
    html: renderEmailLayout({
      companyName: input.companyName,
      heading: "You are invited to an assessment",
      subtitle: input.assessmentTitle,
      bodyHtml: [
        hello(input.firstName),
        emailParagraph("As the next step in your application, please complete this assessment."),
        emailDetails([
          emailDetailRow("Assessment", escapeHtml(input.assessmentTitle)),
          emailDetailRow("Open until", formatDate(input.expiresAt)),
        ]),
        emailButton(input.inviteUrl, "Start the assessment"),
        emailLinkFallback(input.inviteUrl),
      ].join(""),
    }),
  };
}

export function assessmentCompletedEmail(input: {
  companyName: string;
  firstName: string;
  assessmentTitle: string;
  /** Set when the assessment was handed in for the candidate, for example when time ran out. */
  autoSubmitReason?: string | undefined;
}): BuiltEmail {
  const title = `<strong>${escapeHtml(input.assessmentTitle)}</strong>`;
  return {
    subject: input.autoSubmitReason
      ? `Assessment Auto-Submitted: ${input.assessmentTitle}`
      : `Assessment Completed: ${input.assessmentTitle}`,
    html: renderEmailLayout({
      companyName: input.companyName,
      heading: input.autoSubmitReason ? "Your assessment was submitted" : "Assessment completed",
      subtitle: input.assessmentTitle,
      bodyHtml: [
        hello(input.firstName),
        ...(input.autoSubmitReason
          ? [
              emailParagraph(`Your answers for ${title} were saved and submitted automatically.`),
              `<p style="margin:0 0 16px;padding:12px 16px;border-left:3px solid #d97706;background:#fffbeb;font-size:15px;line-height:1.6;color:#78350f">${escapeHtml(input.autoSubmitReason)}</p>`,
              emailParagraph("If you think this is a mistake, please contact the hiring team."),
            ]
          : [
              emailParagraph(`Your answers for ${title} were saved. Thank you for completing it.`),
              emailParagraph("The hiring team will review your result and contact you about the next steps."),
            ]),
      ].join(""),
    }),
  };
}

/** An interview at a time the hiring team has already fixed. */
export function interviewInviteEmail(input: {
  companyName: string;
  candidateName: string;
  jobTitle: string;
  stageName: string;
  scheduledAt: Date;
  durationMinutes: number;
}): BuiltEmail {
  return {
    subject: `Interview Invitation — ${input.jobTitle}`,
    html: renderEmailLayout({
      companyName: input.companyName,
      heading: "Interview invitation",
      subtitle: input.jobTitle,
      bodyHtml: [
        hello(input.candidateName),
        emailParagraph("You are invited to an interview. Here are the details:"),
        emailDetails([
          emailDetailRow("Position", escapeHtml(input.jobTitle)),
          ...(input.stageName ? [emailDetailRow("Stage", escapeHtml(input.stageName))] : []),
          emailDetailRow("Date", formatDate(input.scheduledAt)),
          emailDetailRow("Time", formatTime(input.scheduledAt)),
          emailDetailRow("Duration", `${input.durationMinutes} minutes`),
        ]),
        emailParagraph("If you have any questions, or the time does not work, please contact the hiring team."),
      ].join(""),
    }),
  };
}

/** Asks the candidate to pick one of the offered times. */
export function interviewSlotsEmail(input: {
  companyName: string;
  candidateName: string;
  eventName: string;
  jobTitle: string;
  eventType: string;
  meetingUrl: string | null;
  location: string | null;
  bodyText: string | null;
  publicUrl: string;
}): BuiltEmail {
  return {
    subject: `${input.eventName} — ${input.jobTitle}`,
    html: renderEmailLayout({
      companyName: input.companyName,
      heading: input.eventName,
      subtitle: input.jobTitle,
      bodyHtml: [
        hello(input.candidateName),
        input.bodyText
          ? emailParagraph(escapeHtml(input.bodyText).replace(/\n/g, "<br>"))
          : emailParagraph("We would like to invite you to an interview. Please choose a time that suits you."),
        emailDetails([
          emailDetailRow("Position", escapeHtml(input.jobTitle)),
          emailDetailRow("Interview type", typeLabel(input.eventType)),
          ...(input.meetingUrl ? [emailDetailRow("Meeting link", link(input.meetingUrl))] : []),
          ...(input.location ? [emailDetailRow("Location", escapeHtml(input.location))] : []),
        ]),
        emailButton(input.publicUrl, "Choose a time"),
        emailLinkFallback(input.publicUrl),
      ].join(""),
    }),
  };
}

export function interviewConfirmedEmail(input: {
  companyName: string;
  candidateName: string;
  eventName: string;
  eventType: string;
  scheduledAt: Date;
  durationMinutes: number;
  meetingUrl: string | null;
  location: string | null;
}): BuiltEmail {
  return {
    subject: `Interview Confirmed — ${input.eventName}`,
    html: renderEmailLayout({
      companyName: input.companyName,
      heading: "Your interview is confirmed",
      subtitle: `${formatDate(input.scheduledAt)} · ${formatTime(input.scheduledAt)}`,
      bodyHtml: [
        hello(input.candidateName),
        emailParagraph(`Your interview <strong>${escapeHtml(input.eventName)}</strong> is confirmed. Here are the details:`),
        emailDetails([
          emailDetailRow("Date", formatDate(input.scheduledAt)),
          emailDetailRow("Time", formatTime(input.scheduledAt)),
          emailDetailRow("Duration", `${input.durationMinutes} minutes`),
          emailDetailRow("Interview type", typeLabel(input.eventType)),
          ...(input.location ? [emailDetailRow("Location", escapeHtml(input.location))] : []),
        ]),
        ...(input.meetingUrl
          ? [emailButton(input.meetingUrl, "Join the meeting"), emailLinkFallback(input.meetingUrl)]
          : []),
        emailParagraph("If you have any questions, please contact the hiring team."),
      ].join(""),
    }),
  };
}

export function interviewCancelledEmail(input: {
  companyName: string;
  candidateName: string;
  eventName: string;
  scheduledAt: Date | null;
}): BuiltEmail {
  const when = input.scheduledAt
    ? ` on <strong>${formatDate(input.scheduledAt)} at ${formatTime(input.scheduledAt)}</strong>`
    : "";
  return {
    subject: `Interview Cancelled — ${input.eventName}`,
    html: renderEmailLayout({
      companyName: input.companyName,
      heading: "Your interview was cancelled",
      subtitle: input.eventName,
      bodyHtml: [
        hello(input.candidateName),
        emailParagraph(`Your interview <strong>${escapeHtml(input.eventName)}</strong>${when} has been cancelled.`),
        emailParagraph("The hiring team will contact you if a new time is arranged. We are sorry for the inconvenience."),
      ].join(""),
    }),
  };
}

export function offerEmail(input: {
  companyName: string;
  candidateName: string;
  jobTitle: string;
  reviewUrl: string;
}): BuiltEmail {
  return {
    subject: `Offer for ${input.jobTitle}`,
    html: renderEmailLayout({
      companyName: input.companyName,
      heading: "You have an offer",
      subtitle: input.jobTitle,
      bodyHtml: [
        hello(input.candidateName),
        emailParagraph(
          `Congratulations. We are pleased to offer you the position of <strong>${escapeHtml(input.jobTitle)}</strong>.`,
        ),
        emailParagraph("Please read the offer and accept or decline it on the page below."),
        emailButton(input.reviewUrl, "Review your offer"),
        emailLinkFallback(input.reviewUrl),
      ].join(""),
    }),
  };
}

/** Wraps content written by the hiring team (a template, or a typed message) in the layout. */
export function writtenEmail(input: { companyName: string; contentHtml: string }): string {
  return renderEmailLayout({ companyName: input.companyName, bodyHtml: input.contentHtml });
}
