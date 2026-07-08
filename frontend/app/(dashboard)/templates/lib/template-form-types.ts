export type TemplateType = "email" | "event";

export type BlockKind = "heading" | "text" | "button";

export interface Block {
  id: string;
  kind: BlockKind;
  content: string;
}

export interface TimeSlot {
  datetime: string;
}

export interface EventConfig {
  eventName: string;
  eventType: "virtual" | "onsite";
  meetingUrl: string | null;
  location: string | null;
  description: string;
  timeSlots: string[];
}

export interface TemplateFormState {
  name: string;
  subject: string;
  blocks: Block[];
  eventName: string;
  eventDesc: string;
  eventTypeRadio: "virtual" | "onsite";
  meetingUrl: string;
  location: string;
  timeSlots: TimeSlot[];
}
