/** Current time, read when called */
export const currentTime = () => Date.now();

export type EventType = "virtual" | "onsite";
export type LinkMode = "auto" | "manual";

/** Valid and in the future */
export function isFutureSlot(datetime: string, now: number): boolean {
  const t = new Date(datetime).getTime();
  return !Number.isNaN(t) && t > now;
}

export const DEFAULT_DURATION_MINUTES = 60;
export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

/** Who picks the time */
export type TimeMode = "candidate" | "fixed";

export interface TemplateConfig {
  eventType: EventType;
  meetingUrl: string;
  autoGenerate: boolean;
  location: string;
  durationMinutes: number;
  /** Message to the candidate, empty if the template has none */
  bodyText: string;
}

interface TemplateLike {
  name: string;
  bodyJson?: unknown;
}

/** Read the settings saved in an event template */
export function parseTemplate(template: TemplateLike): TemplateConfig {
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

  const duration = Number(config.durationMinutes);

  return {
    eventType: config.eventType === "onsite" ? "onsite" : "virtual",
    meetingUrl: typeof config.meetingUrl === "string" ? config.meetingUrl : "",
    autoGenerate: config.autoGenerateMeet === true,
    location: typeof config.location === "string" ? config.location : "",
    durationMinutes: Number.isInteger(duration) && duration > 0 ? duration : DEFAULT_DURATION_MINUTES,
    bodyText:
      typeof config.message === "string" && config.message
        ? config.message
        : (blocks.find((b) => b.content && !b.content.startsWith("{"))?.content ?? ""),
  };
}

export interface ScheduleInput {
  templateId: string;
  interviewerId: number | null;
  timeMode: TimeMode;
  /** Time slots the candidate can pick from */
  slots: string[];
  /** The one time, when the hiring team sets it. */
  fixedTime: string;
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
  fixedTime?: string;
  meetingUrl?: string;
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

  if (input.timeMode === "fixed") {
    if (!input.fixedTime) errors.fixedTime = "Choose the date and time.";
    else if (!isFutureSlot(input.fixedTime, now)) errors.fixedTime = "This time has already passed.";
  } else {
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
  }

  if (input.eventType === "virtual" && input.linkMode === "manual") {
    const url = input.meetingUrl.trim();
    if (!url) errors.meetingUrl = "Add the meeting link.";
    else if (!isWebUrl(url)) errors.meetingUrl = "Use a full link that starts with https://";
  }

  return errors;
}

export function hasScheduleErrors(errors: ScheduleErrors) {
  return Boolean(
    errors.template ||
      errors.interviewer ||
      errors.slots ||
      errors.meetingUrl ||
      errors.fixedTime ||
      Object.keys(errors.slotErrors).length > 0,
  );
}
