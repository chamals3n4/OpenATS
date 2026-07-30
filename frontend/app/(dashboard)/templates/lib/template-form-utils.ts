import type { EventConfig } from "./template-form-types";
import type { TemplateBody, TemplateBodyBlock } from "@/types";
import { SAMPLE, VARS } from "./template-form-constants";

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
