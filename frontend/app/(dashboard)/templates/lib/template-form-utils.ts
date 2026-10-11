import type { EventConfig } from "./template-form-types";
import type { TemplateBody, TemplateBodyBlock } from "@/types";
import { SAMPLE, VARS } from "./template-form-constants";
import { TEMPLATE_NAME_MAX } from "./templates-utils";

const SUBJECT_MAX = 500;

const DEFAULT_SAMPLES: Record<string, string> = Object.fromEntries(VARS.map((key) => [key, SAMPLE[key] ?? key]));

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
export function fillSampleText(text: string, samples: Record<string, string> = DEFAULT_SAMPLES): string {
  let out = text;
  Object.entries(samples).forEach(([key, value]) => {
    out = out.replaceAll(`{{${key}}}`, value);
  });
  return out;
}

/** Substitute {{var}} placeholders in an HTML string with styled sample-value pills, for preview only. */
export function renderPreviewHtml(html: string, samples: Record<string, string> = DEFAULT_SAMPLES): string {
  let out = html;
  Object.entries(samples).forEach(([key, value]) => {
    out = out.replaceAll(
      `{{${key}}}`,
      `<span style="background:#dbeafe;color:#1d4ed8;border-radius:4px;padding:1px 5px;font-weight:600;font-size:0.85em">${value}</span>`,
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

export const DEFAULT_DURATION_MINUTES = 60;
export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = minutes / 60;
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

export function buildEventPayload(config: EventConfig): TemplateBody {
  const virtual = config.eventType === "virtual";
  return [
    {
      type: "text" as const,
      content: JSON.stringify({
        ...config,
        meetingUrl: virtual && !config.autoGenerateMeet ? config.meetingUrl : null,
        autoGenerateMeet: virtual && config.autoGenerateMeet,
        location: virtual ? null : config.location,
        message: config.message.trim(),
      } satisfies EventConfig),
    } satisfies TemplateBodyBlock,
  ];
}
