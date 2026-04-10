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

export interface TemplateContext {
  candidate_name?: string;
  job_title?: string;
  salary?: string | number;
  currency?: string;
  pay_frequency?: string;
  start_date?: string;
  expiry_date?: string;
  benefits?: string;
  company_name?: string;
  [key: string]: any;
}

export const templateEngineService = {

  replaceVariables(text: string, context: TemplateContext): string {
    if (!text) return "";
    
    return text.replace(/\{\{(.+?)\}\}/g, (match, variable) => {
      const value = context[variable.trim()];
      return value !== undefined ? String(value) : match;
    });
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

  renderHTML(blocks: ContentBlock[], context: TemplateContext): string {
    const processedBlocks = this.renderJSON(blocks, context);
    
    return processedBlocks.map((block) => {
      switch (block.type) {
        case "heading":
          return `<p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; line-height: 1.5;">${block.content.replace(/\n/g, "<br>")}</p>`;
        case "text":
          return `<p style="margin-bottom: 16px; line-height: 1.5;">${block.content.replace(/\n/g, "<br>")}</p>`;
        case "button": {
          const btn = themeButtonEmailStyles();
          return `
            <div style="margin-bottom: 16px;">
              <a href="${block.url}" style="display: inline-block; color: ${btn.color}; background-color: ${btn.backgroundColor}; border: 1px solid ${btn.borderColor}; padding: 6px 12px; text-decoration: none; border-radius: 9999px; font-size: 12px; font-weight: 600; line-height: 1.25;">
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
    }).join("");
  },

  compileTemplate(subject: string, bodyJson: ContentBlock[], context: TemplateContext) {
    return {
      subject: this.replaceVariables(subject, context),
      bodyJson: this.renderJSON(bodyJson, context),
      html: this.renderHTML(bodyJson, context),
    };
  }
};
