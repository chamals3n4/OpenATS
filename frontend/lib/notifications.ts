/** A notification as the API returns it. The wording is put together here, not stored. */
export interface ApiNotification {
  id: number;
  type: string;
  candidateId: number | null;
  jobId: number | null;
  candidateName: string | null;
  jobTitle: string | null;
  readAt: string | null;
  createdAt: string;
}

export type NotificationKind = "application" | "interview" | "assessment" | "assignment" | "offer" | "waiting" | "email";

export interface NotificationText {
  kind: NotificationKind;
  title: string;
  detail: string;
  href: string;
}

/** What the dashboard says about a notification, and where clicking it goes. */
export function describeNotification(n: ApiNotification): NotificationText {
  const who = n.candidateName ?? "A candidate";
  const job = n.jobTitle ? ` for ${n.jobTitle}` : "";
  const candidate = (section?: string) =>
    n.candidateId ? `/candidates/${n.candidateId}${section ? `?section=${section}` : ""}` : "/candidates";

  switch (n.type) {
    case "application_received":
      return { kind: "application", title: "New application", detail: `${who} applied${job}.`, href: candidate() };
    case "interview_booked":
      return {
        kind: "interview",
        title: "Interview booked",
        detail: `${who}'s interview${job} has a time.`,
        href: candidate("interviews"),
      };
    case "interview_link_expired":
      return {
        kind: "waiting",
        title: "No interview time picked",
        detail: `${who} did not choose a time before the link ran out. Send new times or set one.`,
        href: candidate("interviews"),
      };
    case "offer_accepted":
      return { kind: "offer", title: "Offer accepted", detail: `${who} accepted the offer${job}.`, href: candidate("offer") };
    case "offer_declined":
      return { kind: "offer", title: "Offer declined", detail: `${who} declined the offer${job}.`, href: candidate("offer") };
    case "assessment_completed":
      return {
        kind: "assessment",
        title: "Assessment completed",
        detail: `${who} finished an assessment${job}.`,
        href: candidate("scores"),
      };
    case "assignment_submitted":
      return {
        kind: "assignment",
        title: "Assignment handed in",
        detail: `${who} handed in an assignment${job}.`,
        href: candidate("assignments"),
      };
    case "email_failed":
      return {
        kind: "email",
        title: "Email not delivered",
        detail: `An email to ${who} could not be sent. Check the email history and send it again.`,
        href: candidate("email"),
      };
    default:
      return { kind: "application", title: "Update", detail: `Something changed for ${who}${job}.`, href: candidate() };
  }
}
