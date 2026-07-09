import type { Block, EventConfig, TemplateType } from "./template-form-types";
import type { TemplateBodyBlock } from "@/types";

export function renderPreview(text: string, vars: string[]): string {
  let out = text;
  vars.forEach((key) => {
    out = out.replaceAll(
      `{{${key}}}`,
      `<span style="background:#dbeafe;color:#1d4ed8;border-radius:4px;padding:1px 5px;font-weight:600;font-size:0.85em">${SAMPLE[key] ?? key}</span>`,
    );
  });
  return out;
}

import { SAMPLE } from "./template-form-constants";

export function createEmptyBlock(kind: Block["kind"]): Block {
  return {
    id: `${kind}-${Date.now()}`,
    kind,
    content:
      kind === "heading"
        ? "Your Heading"
        : kind === "text"
          ? "Write your message."
          : "Click Here",
  };
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

export function parseEmailBlocks(bodyJson: unknown): Block[] {
  const blocks = bodyJson as
    | Array<{ type?: string; content?: string }>
    | undefined;
  if (!blocks) return [];
  return blocks
    .filter((b) => b.type && !b.content?.startsWith("{"))
    .map((b, i) => ({
      id: `e${i}`,
      kind: (b.type as Block["kind"]) || "text",
      content: b.content || "",
    }));
}

export function buildEmailPayload(blocks: Block[]): TemplateBodyBlock[] {
  return blocks.map((b) => ({
    type: b.kind as TemplateBodyBlock["type"],
    content: b.content,
  }));
}

export function buildEventPayload(
  eventName: string,
  eventTypeRadio: "virtual" | "onsite",
  meetingUrl: string,
  autoGenerateMeet: boolean,
  location: string,
  eventDesc: string,
  timeSlots: { datetime: string }[],
): TemplateBodyBlock[] {
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
    },
  ];
}
