export type TemplateType = "email" | "event";

export interface TimeSlot {
  datetime: string;
}

export interface EventConfig {
  eventName: string;
  eventType: "virtual" | "onsite";
  meetingUrl: string | null;
  autoGenerateMeet: boolean;
  location: string | null;
  description: string;
  timeSlots: string[];
}

export interface TemplateFormState {
  name: string;
  subject: string;
  emailBodyHtml: string;
  eventName: string;
  eventDesc: string;
  eventTypeRadio: "virtual" | "onsite";
  meetingUrl: string;
  autoGenerateMeet: boolean;
  location: string;
  timeSlots: TimeSlot[];
}
