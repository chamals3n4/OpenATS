import type { EventConfig } from "./template-form-types";
import type { TemplateBody, TemplateBodyBlock } from "@/types";
import { SAMPLE, VARS } from "./template-form-constants";
import { TEMPLATE_NAME_MAX } from "./templates-utils";

const SUBJECT_MAX = 500;

export interface TemplateFormErrors {
  name?: string;
  subject?: string;
}

/** The same limits the API enforces, checked first so the form can say what is wrong. */
export function validateTemplateForm(input: {
  type: "email" | "event";
  name: string;
  subject: string;
}): TemplateFormErrors {
  const errors: TemplateFormErrors = {};
  const name = input.name.trim();
  if (!name) errors.name = "Enter a name.";
  else if (name.length > TEMPLATE_NAME_MAX) errors.name = `Keep the name under ${TEMPLATE_NAME_MAX} characters.`;

  if (input.type === "email") {
    const subject = input.subject.trim();
    if (!subject) errors.subject = "Enter a subject.";
    else if (subject.length > SUBJECT_MAX) errors.subject = `Keep the subject under ${SUBJECT_MAX} characters.`;
  }
  return errors;
}

/** Replace {{var}} placeholders with plain sample values, for text such as the subject. */
export function fillSampleText(text: string): string {
  let out = text;
  VARS.forEach((key) => {
    out = out.replaceAll(`{{${key}}}`, SAMPLE[key] ?? key);
  });
  return out;
}

/** Substitute {{var}} placeholders in an HTML string with styled sample-value pills, for preview only. */
export function renderPreviewHtml(html: string): string {
  let out = html;
  VARS.forEach((key) => {
    out = out.replaceAll(
      `{{${key}}}`,
      `<span style="background:#dbeafe;color:#1d4ed8;border-radius:4px;padding:1px 5px;font-weight:600;font-size:0.85em">${SAMPLE[key] ?? key}</span>`,
    );
  });
  return out;
}

export function parseEventConfig(
  bodyJson: unknown,
): Partial<EventConfig> | null {
  const blocks = bodyJson as
    | Array<{ type?: string; content?: string }>
    | undefined;
  const configBlock = blocks?.find((b) => b.content?.startsWith("{"));
  if (!configBlock) return null;
  try {
    return JSON.parse(configBlock.content!);
  } catch {
    return null;
  }
}

/** Email templates store bodyJson as a plain HTML string. */
export function parseEmailBody(bodyJson: unknown): string {
  return typeof bodyJson === "string" ? bodyJson : "";
}

export function buildEventPayload(
  eventName: string,
  eventTypeRadio: "virtual" | "onsite",
  meetingUrl: string,
  autoGenerateMeet: boolean,
  location: string,
  eventDesc: string,
  timeSlots: { datetime: string }[],
): TemplateBody {
  return [
    {
      type: "text" as const,
      content: JSON.stringify({
        eventName,
        eventType: eventTypeRadio,
        meetingUrl:
          eventTypeRadio === "virtual" && !autoGenerateMeet ? meetingUrl : null,
        autoGenerateMeet: eventTypeRadio === "virtual" && autoGenerateMeet,
        location: eventTypeRadio === "onsite" ? location : null,
        description: eventDesc,
        timeSlots: timeSlots.filter((s) => s.datetime).map((s) => s.datetime),
      }),
    } satisfies TemplateBodyBlock,
  ];
}

/** True for a chosen time that is no longer in the future. An empty slot is not past. */
export function isPastSlot(datetime: string, now: number): boolean {
  if (!datetime) return false;
  const time = new Date(datetime).getTime();
  return Number.isFinite(time) && time <= now;
}
