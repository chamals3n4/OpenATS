export type TemplateType = "email" | "event";

/** Event template settings. Times are picked later */
export interface EventConfig {
  eventName: string;
  eventType: "virtual" | "onsite";
  meetingUrl: string | null;
  autoGenerateMeet: boolean;
  location: string | null;
  /** A note for the hiring team. */
  description: string;
  durationMinutes: number;
  /** Email message. Empty means the default wording */
  message: string;
}
