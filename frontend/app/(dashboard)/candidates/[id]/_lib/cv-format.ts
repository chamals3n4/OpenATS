/** Split a CV section into lists, dated lines and tags */
export type CvBlock =
  | { type: "text"; text: string }
  | { type: "bullets"; items: string[] }
  /** A line that ends with a date range */
  | { type: "entry"; title: string; detail: string | null; tags: string[]; date: string | null }
  /** e.g. "Languages: Sinhala, English" */
  | { type: "tags"; label: string | null; items: string[] };

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
const DATE = `(?:${MONTH}\\s+)?(?:19|20)\\d{2}|(?:0?[1-9]|1[0-2])[/.](?:19|20)\\d{2}`;
const TRAILING_DATE = new RegExp(
  `\\s+((?:${DATE})(?:\\s*(?:-|\\u2013|\\u2014|to)\\s*(?:${DATE}|present|current|now|to date))?)$`,
  "i",
);

/** Split on commas outside brackets */
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

/** Sections that are usually lists */
const LIST_SECTIONS = new Set(["skills", "languages"]);
/** Sections with dated entries */
const ENTRY_SECTIONS = new Set(["experience", "education", "projects", "certifications", "other"]);

export function formatCvSection(key: string, text: string): CvBlock[] {
  const blocks: CvBlock[] = [];
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);

  // Summary is one paragraph split by the PDF
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

    // Join a wrapped line back to its bullet
    if (last?.type === "bullets") {
      last.items[last.items.length - 1] += ` ${line}`;
      continue;
    }

    const tags = LIST_SECTIONS.has(key) ? toTags(line) : null;
    blocks.push(tags ?? { type: "text", text: line });
  }

  return blocks;
}
