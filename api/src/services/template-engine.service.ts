import { ContentBlock } from "../db/schema/templates";

export interface TemplateContext {
  candidate_name?: string;
  job_title?: string;
  salary?: string | number;
  currency?: string;
  start_date?: string;
  expiry_date?: string;
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
          return `<h1 style="margin-bottom: 16px;">${block.content}</h1>`;
        case "text":
          return `<p style="margin-bottom: 16px; line-height: 1.5;">${block.content.replace(/\n/g, "<br>")}</p>`;
        case "button":
          return `
            <div style="margin-bottom: 16px;">
              <a href="${block.url}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                ${block.label}
              </a>
            </div>`;
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
