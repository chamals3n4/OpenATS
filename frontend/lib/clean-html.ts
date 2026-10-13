import DOMPurify from "dompurify";

// The same list as the API's sanitizeJobDescription (backend/src/modules/job/job-description.ts):
// what the description editor can produce, and nothing that runs.
const ALLOWED_TAGS = [
  "p", "br", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s",
  "ul", "ol", "li",
  "blockquote", "code", "pre",
  "a",
];

/**
 * Cleans rich text before it is put into the page with dangerouslySetInnerHTML. The API already
 * cleans a job description when it is saved; this is the second check, at the point of use, so
 * one missed write path cannot become a script running in someone's session.
 *
 * Cleaning needs a browser. On the server there is none, so nothing is rendered there rather
 * than letting uncleaned HTML into the page: only use this for content loaded in the browser.
 */
export function cleanRichText(html: string): string {
  if (typeof window === "undefined") return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
  });
}
