import sanitizeHtml from "sanitize-html";

/**
 * A job description is HTML written in the dashboard's editor and shown on the public careers
 * page and to every signed-in user. It is cleaned to exactly what that editor can produce
 * (headings, paragraphs, lists, basic emphasis, links), so nothing that runs can be stored: no
 * scripts, no event handlers such as onerror, no styles, images, frames or forms. Text inside a
 * removed tag is kept, except for script and style, whose contents are dropped.
 */
const ALLOWED: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s",
    "ul", "ol", "li",
    "blockquote", "code", "pre",
    "a",
  ],
  allowedAttributes: { a: ["href", "target", "rel"] },
  // No javascript:, data: or protocol-relative links.
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  // A link opens in a new tab and tells the other site nothing about this one.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }),
  },
};

export function sanitizeJobDescription(html: string): string;
export function sanitizeJobDescription(html: string | null | undefined): string | null | undefined;
export function sanitizeJobDescription(html: string | null | undefined) {
  if (html === null || html === undefined) return html;
  return sanitizeHtml(html, ALLOWED);
}
