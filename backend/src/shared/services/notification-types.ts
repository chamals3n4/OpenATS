/** What a notification is about. The wording is in the dashboard (frontend/lib/notifications.ts). */
export const NOTIFICATION_TYPES = [
  "application_received",
  "interview_booked",
  "interview_link_expired",
  "offer_accepted",
  "offer_declined",
  "assessment_completed",
  "assignment_submitted",
  "email_failed",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * Who is told: the job's hiring team and anyone named on purpose (the interviewer, the person
 * who sent a failed email), minus whoever did it, each once. Pure, so the rule can be tested.
 */
export function pickRecipients(input: {
  team: number[];
  also?: number[];
  exclude?: number | null;
}): number[] {
  const all = new Set([...input.team, ...(input.also ?? [])]);
  if (input.exclude != null) all.delete(input.exclude);
  return [...all];
}
