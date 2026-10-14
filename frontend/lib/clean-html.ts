import DOMPurify from "dompurify";

// Same tags as the backend sanitizer
const ALLOWED_TAGS = [
  "p", "br", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s",
  "ul", "ol", "li",
  "blockquote", "code", "pre",
  "a",
];

/** Clean rich text before dangerouslySetInnerHTML. Browser only */
export function cleanRichText(html: string): string {
  if (typeof window === "undefined") return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
  });
}
