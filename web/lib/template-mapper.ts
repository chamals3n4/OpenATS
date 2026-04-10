import type { TemplateEditorBlock } from "@/components/template-block-preview";
import type { TemplateBodyBlock } from "@/types";

/** Editor → API `body_json` (includes divider/spacer; button/image use `content` for API normalize). */
export function editorBlocksToApiBodyJson(
  blocks: TemplateEditorBlock[],
): TemplateBodyBlock[] {
  return blocks.map((b) => {
    if (b.kind === "divider") {
      return { type: "divider" };
    }
    if (b.kind === "spacer") {
      const n = parseInt(b.content, 10);
      return {
        type: "spacer",
        height: Number.isFinite(n) && n > 0 ? n : 24,
      };
    }
    return {
      type: b.kind as "heading" | "text" | "button" | "image",
      content: b.content,
    };
  });
}

/** API stores button as `{ label, url }` and image as `{ url }`; editor uses `content` for both. */
export function apiBodyJsonToEditorBlocks(
  bodyJson: unknown,
): TemplateEditorBlock[] {
  if (!Array.isArray(bodyJson)) return [];
  return bodyJson.map((raw, i) => {
    const b = raw as Record<string, unknown>;
    const type = b.type;
    const id = `blk-${i}-${Date.now()}`;
    if (type === "heading" || type === "text") {
      return { id, kind: type, content: String(b.content ?? "") };
    }
    if (type === "button") {
      return {
        id,
        kind: "button",
        content: String(b.label ?? b.content ?? "Button"),
      };
    }
    if (type === "image") {
      return {
        id,
        kind: "image",
        content: String(b.url ?? b.content ?? ""),
      };
    }
    if (type === "divider") {
      return { id, kind: "divider", content: "" };
    }
    if (type === "spacer") {
      const h = typeof b.height === "number" ? b.height : 24;
      return { id, kind: "spacer", content: String(h) };
    }
    return { id, kind: "text", content: "" };
  });
}
