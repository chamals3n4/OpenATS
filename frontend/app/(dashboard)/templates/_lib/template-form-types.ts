export type TemplateType = "email" | "event";

/** What an event template saves. The times are chosen later, when an interview is scheduled. */
export interface EventConfig {
  eventName: string;
  eventType: "virtual" | "onsite";
  meetingUrl: string | null;
  autoGenerateMeet: boolean;
  location: string | null;
  /** A note for the hiring team. */
  description: string;
  durationMinutes: number;
  /** The message the candidate is emailed. Empty means the automatic email's wording. */
  message: string;
}
