import { ContentBlock } from "../db/schema/templates";

/** Default matches `web/app/globals.css` `--theme-color` (offer emails have no CSS variables). */
const DEFAULT_THEME_HEX = "#d97757";

function normalizeThemeHex(input: string | undefined): string {
  const t = (input ?? "").trim();
  if (/^#[0-9a-f]{6}$/i.test(t)) return t;
  if (/^[0-9a-f]{6}$/i.test(t)) return `#${t}`;
  return DEFAULT_THEME_HEX;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Inline styles for template button blocks in HTML email / stored offer HTML. */
function themeButtonEmailStyles() {
  const color = normalizeThemeHex(process.env.BRAND_THEME_COLOR_HEX);
  const { r, g, b } = hexToRgb(color);
  return {
    color,
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.28)`,
  };
}

/** Shared with system fallback emails so pill buttons match template blocks. */
export function getEmailButtonAnchorStyleString(): string {
  const btn = themeButtonEmailStyles();
  return `display: inline-block; color: ${btn.color}; background-color: ${btn.backgroundColor}; border: 1px solid ${btn.borderColor}; padding: 6px 12px; text-decoration: none; border-radius: 9999px; font-size: 12px; font-weight: 600; line-height: 1.25;`;
}

/** Solid primary CTA (e.g. offer accept); uses `BRAND_THEME_COLOR_HEX`. */
export function getEmailSolidPrimaryButtonStyleString(): string {
  const color = normalizeThemeHex(process.env.BRAND_THEME_COLOR_HEX);
  return `display: inline-block; color: #ffffff; background-color: ${color}; border: 1px solid ${color}; padding: 10px 22px; text-decoration: none; border-radius: 9999px; font-size: 14px; font-weight: 600; line-height: 1.25;`;
}

/** Neutral outline CTA (e.g. offer decline). */
export function getEmailOutlineNeutralButtonStyleString(): string {
  return `display: inline-block; color: #334155; background-color: #ffffff; border: 1px solid #cbd5e1; padding: 10px 22px; text-decoration: none; border-radius: 9999px; font-size: 14px; font-weight: 600; line-height: 1.25;`;
}

/** Strip tags / entities enough to compare posting HTML to plain template text. */
function stripHtmlToPlainApprox(html: string): string {
  return String(html ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(p|div|h[1-6]|li|tr)\s*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&ndash;|&mdash;/gi, "-")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\r\n/g, "\n")
    .trim();
}

function normalizeComparable(s: string): string {
  return stripHtmlToPlainApprox(s).replace(/\s+/g, " ").trim();
}

function isLikelyJobDescriptionBlock(
  blockText: string,
  jobDescHtml: string,
): boolean {
  const jd = normalizeComparable(jobDescHtml);
  const bt = normalizeComparable(blockText);
  if (!jd || jd.length < 60) return false;
  if (!bt || bt.length < 40) return false;
  if (bt === jd) return true;
  const head = jd.slice(0, Math.min(400, jd.length));
  if (bt.includes(head) && jd.length * 0.72 <= bt.length) {
    return bt.length <= jd.length * 1.2;
  }
  if (jd.includes(bt) && bt.length >= jd.length * 0.9) return true;
  return false;
}

function isJobDescriptionSectionHeading(content: string): boolean {
  const t = normalizeComparable(content).toLowerCase();
  if (t.length > 140) return false;
  return (
    /\bresponsibilit/.test(t) ||
    /\bjob description\b/.test(t) ||
    /\broledescription\b/.test(t) ||
    /\bduties\b/.test(t) ||
    /\bkey responsibilities\b/.test(t) ||
    /\bwhat you'll do\b/.test(t) ||
    /\bwhat you will do\b/.test(t) ||
    /\brole overview\b/.test(t) ||
    /\babout the role\b/.test(t)
  );
}

function filterEmbeddedJobDescriptionBlocks(
  blocks: ContentBlock[],
  jobDescriptionHtml: string | null | undefined,
): ContentBlock[] {
  const jd = String(jobDescriptionHtml ?? "").trim();
  if (!jd) return blocks;

  const out: ContentBlock[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (!b) break;
    const next = blocks[i + 1];

    if (
      b.type === "heading" &&
      next?.type === "text" &&
      isJobDescriptionSectionHeading(b.content) &&
      isLikelyJobDescriptionBlock(next.content, jd)
    ) {
      i += 2;
      continue;
    }

    if (
      b.type === "text" &&
      isLikelyJobDescriptionBlock(b.content, jd)
    ) {
      const prev = out[out.length - 1];
      if (
        prev?.type === "heading" &&
        isJobDescriptionSectionHeading(prev.content)
      ) {
        out.pop();
      }
      i += 1;
      continue;
    }

    out.push(b);
    i += 1;
  }
  return out;
}

/** After variable substitution, drop lines that only framed unknown offer fields (no “TBD” in outbound mail). */
function scrubUnknownOfferLines(text: string): string {
  const stripMarkers = (s: string) =>
    s.replace(/\*\*/g, "").replace(/__/g, "").trimEnd();

  const lines = text.split("\n");
  const kept: string[] = [];

  for (const line of lines) {
    const plain = stripMarkers(line).trim();
    if (!plain) {
      kept.push(line);
      continue;
    }
    if (/\bTBD\b/i.test(plain)) continue;
    if (/^[–—\-]\s*$/.test(plain)) continue;
    if (/:\s*$/.test(plain)) continue;
    if (/\b(?:by|before|on)\s*$/i.test(plain)) continue;
    /** e.g. “Base compensation: USD ” with no amount */
    if (/:\s*[A-Z]{3}\s*$/.test(plain) && !/\d/.test(plain)) continue;

    kept.push(line);
  }

  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function scrubEmptyBenefitsSection(text: string, benefits: unknown): string {
  const b = String(benefits ?? "").trim();
  if (b && b !== "—") return text;

  let t = text;
  t = t.replace(
    /\n{2,}Benefits and programs\s*\n+(?:—\s*)?(?=\n{2,}|$)/gi,
    "\n\n",
  );
  t = t.replace(
    /Benefits and programs\s*\n+(?:—\s*)?\n{2,}/gi,
    "\n\n",
  );
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

function scrubOfferTextBlocks(
  blocks: ContentBlock[],
  context: TemplateContext,
): ContentBlock[] {
  return blocks.map((block) => {
    if (block.type === "heading" || block.type === "text") {
      return {
        ...block,
        content: scrubEmptyBenefitsSection(block.content, context.benefits),
      };
    }
    return block;
  });
}

/** Remove heading/text blocks whose copy was fully stripped (unknown fields only). */
function dropEmptyOfferContentBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.filter((b) => {
    if (b.type !== "heading" && b.type !== "text") return true;
    return stripHtmlToPlainApprox(b.content).replace(/\s+/g, " ").trim().length > 0;
  });
}

function scrubUnknownOfferFieldBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.map((block) => {
    if (block.type === "heading" || block.type === "text") {
      return { ...block, content: scrubUnknownOfferLines(block.content) };
    }
    return block;
  });
}

/** Drop a lone “Benefits…” heading when the next text block has no real benefits copy. */
function filterEmptyBenefitsHeadingBlocks(
  blocks: ContentBlock[],
  context: TemplateContext,
): ContentBlock[] {
  const b = String(context.benefits ?? "").trim();
  if (b && b !== "—") return blocks;

  const out: ContentBlock[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const cur = blocks[i];
    if (!cur) continue;
    const next = blocks[i + 1];
    if (cur.type === "heading" && next?.type === "text") {
      const ht = stripHtmlToPlainApprox(cur.content).trim().toLowerCase();
      const nt = stripHtmlToPlainApprox(next.content).trim();
      if (/^benefits/.test(ht) && (nt === "" || nt === "—")) {
        i++;
        continue;
      }
    }
    out.push(cur);
  }
  return out;
}

function isPlaceholderButtonUrl(url: string): boolean {
  const u = (url ?? "").trim();
  if (!u || u === "#") return true;
  const lower = u.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return true;
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:")
  ) {
    return false;
  }
  return true;
}

function filterPlaceholderButtonBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.filter((b) => {
    if (b.type !== "button") return true;
    return !isPlaceholderButtonUrl(b.url);
  });
}

/**
 * When templates place a period after placeholders (e.g. `{{salary}}.`), empty variables
 * yield a stray ": ." or "by ." on that line — drop those lines so email doesn’t show an orphan dot.
 */
function scrubStrayEmptyVariableLines(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const t = line.replace(/\*\*/g, "").replace(/__/g, "").trimEnd();
    if (/:\s*\.\s*$/.test(t)) continue;
    if (/\b(?:by|before|on)\s*\.\s*$/i.test(t)) continue;
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

export interface TemplateContext {
  candidate_name?: string;
  email?: string;
  job_title?: string;
  salary?: string | number;
  currency?: string;
  pay_frequency?: string;
  start_date?: string;
  expiry_date?: string;
  benefits?: string;
  company_name?: string;
  /** Intentionally blank in offer mail; do not inject full job posting. */
  job_description?: string;
  job_description_html?: string;
  [key: string]: any;
}

export const templateEngineService = {

  replaceVariables(text: string, context: TemplateContext): string {
    if (!text) return "";

    const filled = text.replace(/\{\{(.+?)\}\}/g, (match, variable) => {
      const value = context[variable.trim()];
      return value !== undefined ? String(value) : match;
    });
    return scrubStrayEmptyVariableLines(filled);
  },

  renderJSON(blocks: ContentBlock[], context: TemplateContext): ContentBlock[] {
    return blocks.map((block) => {
      switch (block.type) {
        case "heading":
        case "text":
          return {
            ...block,
            content: this.replaceVariables(block.content, context),
          };
        case "button":
          return {
            ...block,
            label: this.replaceVariables(block.label, context),
            url: this.replaceVariables(block.url, context),
          };
        case "image":
          return {
            ...block,
            alt: block.alt ? this.replaceVariables(block.alt, context) : undefined,
          };
        default:
          return block;
      }
    });
  },

  renderBlocksAsHtml(processedBlocks: ContentBlock[]): string {
    return processedBlocks
      .map((block) => {
        switch (block.type) {
          case "heading":
            return `<p style="display:block;margin:0 0 1em 0;font-size:15px;font-weight:600;line-height:1.5;">${block.content.replace(/\n/g, "<br>")}</p>`;
          case "text":
            return `<p style="display:block;margin:0 0 1em 0;line-height:1.5;">${block.content.replace(/\n/g, "<br>")}</p>`;
          case "button": {
            const anchorStyle = getEmailButtonAnchorStyleString();
            return `
            <div style="margin-bottom: 16px;">
              <a href="${block.url}" style="${anchorStyle}">
                ${block.label}
              </a>
            </div>`;
          }
          case "image":
            return `<img src="${block.url}" alt="${block.alt || ""}" style="max-width: 100%; height: auto; margin-bottom: 16px; display: block;">`;
          case "divider":
            return `<hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;">`;
          case "spacer":
            return `<div style="height: ${block.height}px;"></div>`;
          default:
            return "";
        }
      })
      .join("");
  },

  renderHTML(blocks: ContentBlock[], context: TemplateContext): string {
    const processed = filterPlaceholderButtonBlocks(
      this.renderJSON(blocks, context),
    );
    return this.renderBlocksAsHtml(processed);
  },

  /**
   * Offer emails: omit placeholder buttons, strip embedded job posting blocks that
   * match the live job description, and drop empty “Benefits and programs” boilerplate.
   */
  renderOfferEmailBodyHTML(
    blocks: ContentBlock[],
    context: TemplateContext,
    opts?: { jobDescriptionHtml?: string | null },
  ): string {
    let processed = this.renderJSON(blocks, context);
    processed = scrubUnknownOfferFieldBlocks(processed);
    processed = scrubOfferTextBlocks(processed, context);
    processed = filterEmptyBenefitsHeadingBlocks(processed, context);
    processed = filterEmbeddedJobDescriptionBlocks(
      processed,
      opts?.jobDescriptionHtml,
    );
    processed = dropEmptyOfferContentBlocks(processed);
    return this.renderBlocksAsHtml(filterPlaceholderButtonBlocks(processed));
  },

  compileTemplate(subject: string, bodyJson: ContentBlock[], context: TemplateContext) {
    return {
      subject: this.replaceVariables(subject, context),
      bodyJson: this.renderJSON(bodyJson, context),
      html: this.renderHTML(bodyJson, context),
    };
  }
};
