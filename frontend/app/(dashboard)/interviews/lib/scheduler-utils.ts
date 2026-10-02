/** The current time. A function so event handlers read it at the moment they run. */
export const currentTime = () => Date.now();

export type EventType = "virtual" | "onsite";
export type LinkMode = "auto" | "manual";

/** A slot is usable only if it parses and is still in the future. */
export function isFutureSlot(datetime: string, now: number): boolean {
  const t = new Date(datetime).getTime();
  return !Number.isNaN(t) && t > now;
}

export interface TemplateConfig {
  eventType: EventType;
  meetingUrl: string;
  autoGenerate: boolean;
  location: string;
  /** Time slots from the template that are still in the future. */
  timeSlots: string[];
  /** How many of the template's slots had already passed and were dropped. */
  skippedPastSlots: number;
  bodyText: string;
}

interface TemplateLike {
  name: string;
  bodyJson?: unknown;
}

/**
 * An event template stores its settings as a JSON text block and its email text as another
 * block. Read both, dropping time slots that have already passed.
 */
export function parseTemplate(template: TemplateLike, now: number): TemplateConfig {
  const blocks = (Array.isArray(template.bodyJson) ? template.bodyJson : []) as Array<{
    content?: string;
  }>;

  const config: Record<string, unknown> = (() => {
    const block = blocks.find((b) => b.content?.startsWith("{"));
    if (!block?.content) return {};
    try {
      return JSON.parse(block.content) as Record<string, unknown>;
    } catch {
      return {};
    }
  })();

  const allSlots = Array.isArray(config.timeSlots) ? (config.timeSlots as string[]) : [];
  const future = allSlots.filter((dt) => isFutureSlot(dt, now));

  return {
    eventType: config.eventType === "onsite" ? "onsite" : "virtual",
    meetingUrl: typeof config.meetingUrl === "string" ? config.meetingUrl : "",
    autoGenerate: config.autoGenerateMeet === true,
    location: typeof config.location === "string" ? config.location : "",
    timeSlots: future,
    skippedPastSlots: allSlots.length - future.length,
    bodyText: blocks.find((b) => b.content && !b.content.startsWith("{"))?.content ?? "",
  };
}

export interface ScheduleInput {
  templateId: string;
  interviewerId: number | null;
  bodyText: string;
  /** Local "YYYY-MM-DDTHH:mm" strings; blank rows are ignored. */
  slots: string[];
  eventType: EventType;
  linkMode: LinkMode;
  meetingUrl: string;
}

export interface ScheduleErrors {
  template?: string;
  interviewer?: string;
  slots?: string;
  /** Problems with one specific row, keyed by its index. */
  slotErrors: Record<number, string>;
  meetingUrl?: string;
  body?: string;
}

function isWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function validateSchedule(input: ScheduleInput, now: number): ScheduleErrors {
  const errors: ScheduleErrors = { slotErrors: {} };

  if (!input.templateId) errors.template = "Choose an event template.";
  if (!input.interviewerId) errors.interviewer = "Choose who will run the interview.";

  const seen = new Set<number>();
  let usable = 0;
  input.slots.forEach((slot, i) => {
    if (!slot) return;
    const t = new Date(slot).getTime();
    if (Number.isNaN(t) || t <= now) {
      errors.slotErrors[i] = "This time has already passed.";
    } else if (seen.has(t)) {
      errors.slotErrors[i] = "This time is listed twice.";
    } else {
      seen.add(t);
      usable += 1;
    }
  });
  if (usable === 0 && Object.keys(errors.slotErrors).length === 0) {
    errors.slots = "Add at least one time the candidate can choose.";
  } else if (usable === 0) {
    errors.slots = "Add at least one time that is still in the future.";
  }

  if (input.eventType === "virtual" && input.linkMode === "manual") {
    const url = input.meetingUrl.trim();
    if (!url) errors.meetingUrl = "Add the meeting link.";
    else if (!isWebUrl(url)) errors.meetingUrl = "Use a full link that starts with https://";
  }

  if (!input.bodyText.trim()) errors.body = "Write the message the candidate will receive.";

  return errors;
}

export function hasScheduleErrors(errors: ScheduleErrors) {
  return Boolean(
    errors.template ||
      errors.interviewer ||
      errors.slots ||
      errors.meetingUrl ||
      errors.body ||
      Object.keys(errors.slotErrors).length > 0,
  );
}
