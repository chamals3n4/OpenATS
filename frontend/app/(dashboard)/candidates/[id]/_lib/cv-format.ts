/**
 * Turns one section of CV text into blocks the page can lay out: bullet lists, lines that end in a
 * date, and short lists shown as tags. It only rearranges what is written. Nothing is guessed, and
 * a line that fits no pattern is shown as it is, so no text is ever hidden.
 */
export type CvBlock =
  | { type: "text"; text: string }
  | { type: "bullets"; items: string[] }
  /** A line ending in a date: "Staff Nurse, Kandy General Hospital" + "2018 - 2023". */
  | { type: "entry"; title: string; detail: string | null; tags: string[]; date: string | null }
  /** "Languages: Sinhala, English, Tamil" as a label and tags. */
  | { type: "tags"; label: string | null; items: string[] };

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
const DATE = `(?:${MONTH}\\s+)?(?:19|20)\\d{2}|(?:0?[1-9]|1[0-2])[/.](?:19|20)\\d{2}`;
const TRAILING_DATE = new RegExp(
  `\\s+((?:${DATE})(?:\\s*(?:-|\\u2013|\\u2014|to)\\s*(?:${DATE}|present|current|now|to date))?)$`,
  "i",
);

/** Splits on commas that are not inside brackets, so "Node.js (Express, Koa), Go" is two items. */
function splitList(text: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if (char === "(" || char === "[") depth++;
    if (char === ")" || char === "]") depth = Math.max(0, depth - 1);
    if ((char === "," || char === ";" || char === "|") && depth === 0) {
      items.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  items.push(current);
  return items.map((item) => item.trim()).filter(Boolean);
}

/** A list reads as tags only when it is one: several short items, not a sentence with commas. */
const isTagList = (items: string[]) => items.length >= 2 && items.every((item) => item.length <= 40);

function toEntry(line: string): CvBlock | null {
  const dated = line.match(TRAILING_DATE);
  const hasBar = line.includes(" | ");
  if (!dated && !hasBar) return null;

  const body = dated ? line.slice(0, dated.index).trim() : line;
  const [title = "", ...rest] = body.split(" | ");
  const detail = rest.join(" | ").trim();
  const tags = splitList(detail);
  const asTags = isTagList(tags);

  return {
    type: "entry",
    title: title.trim(),
    detail: detail && !asTags ? detail : null,
    tags: asTags ? tags : [],
    date: dated?.[1] ?? null,
  };
}

function toTags(line: string): CvBlock | null {
  const labelled = line.match(/^([^:]{2,40}):\s+(.+)$/);
  const items = splitList(labelled ? (labelled[2] ?? "") : line);
  return isTagList(items) ? { type: "tags", label: labelled ? (labelled[1] ?? null) : null, items } : null;
}

/** Sections whose lines are short lists far more often than sentences. */
const LIST_SECTIONS = new Set(["skills", "languages"]);
/** Sections made of dated entries (a job, a course, a project). */
const ENTRY_SECTIONS = new Set(["experience", "education", "projects", "certifications", "other"]);

export function formatCvSection(key: string, text: string): CvBlock[] {
  const blocks: CvBlock[] = [];
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);

  // A summary is one paragraph that the PDF broke into lines.
  if (key === "summary" && !lines.some((line) => line.startsWith("- "))) {
    return lines.length ? [{ type: "text", text: lines.join(" ") }] : [];
  }

  for (const line of lines) {
    const last = blocks[blocks.length - 1];

    if (line.startsWith("- ")) {
      const item = line.slice(2).trim();
      if (last?.type === "bullets") last.items.push(item);
      else blocks.push({ type: "bullets", items: [item] });
      continue;
    }

    const entry = ENTRY_SECTIONS.has(key) ? toEntry(line) : null;
    if (entry) {
      blocks.push(entry);
      continue;
    }

    // A line straight after a bullet, that is not the start of a new entry, is the rest of that
    // bullet: the PDF wrapped it onto a second line.
    if (last?.type === "bullets") {
      last.items[last.items.length - 1] += ` ${line}`;
      continue;
    }

    const tags = LIST_SECTIONS.has(key) ? toTags(line) : null;
    blocks.push(tags ?? { type: "text", text: line });
  }

  return blocks;
}
