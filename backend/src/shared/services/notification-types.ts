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

export function pickRecipients(input: {
  team: number[];
  also?: number[];
  exclude?: number | null;
}): number[] {
  const all = new Set([...input.team, ...(input.also ?? [])]);
  if (input.exclude != null) all.delete(input.exclude);
  return [...all];
}
