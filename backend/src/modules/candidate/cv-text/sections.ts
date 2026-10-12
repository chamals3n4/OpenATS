export type CvSectionKey =
  | "header"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "certifications"
  | "projects"
  | "languages"
  | "references"
  | "other";

export interface CvSection {
  key: CvSectionKey;
  /** The heading as written in the CV. Null for the text above the first heading. */
  heading: string | null;
  text: string;
}

/**
 * What a heading is about, tried in order. These words are the same in every line of work: a
 * nurse, a welder and a developer all write "Experience" and "Education". The order matters where
 * a heading holds two of them ("Language Skills", "Education & Training").
 */
const HEADING_RULES: [CvSectionKey, RegExp][] = [
  ["references", /\b(references?|referees?)\b/],
  ["education", /\b(education(al)?|academic|academics|schooling)\b/],
  ["certifications", /\b(certifications?|certificates?|licen[cs]es?|licensure|accreditations?|courses|training|professional qualifications?)\b/],
  ["education", /\bqualifications?\b/],
  ["skills", /\bprogramming languages?\b/],
  ["languages", /\blanguages?\b/],
  ["experience", /\b(experience|employment|work history|career history|positions? held|internships?)\b/],
  ["skills", /\b(skills?|competenc(y|ies)|expertise|proficienc(y|ies)|technologies|tools)\b/],
  ["projects", /\bprojects?\b/],
  ["summary", /\b(summary|profile|objective|about|overview|personal statement)\b/],
  ["other", /\b(awards?|achievements?|accomplishments?|honou?rs|publications?|research|interests|hobbies|activities|volunteer(ing)?|personal (details|information|data)|contact( details| information)?|memberships?|affiliations?|declaration)\b/],
];

/**
 * Whether a line looks like a heading at all, before asking what it is about: short, on its own,
 * no digits or sentence punctuation, and written as a title. "Work experience in hospitals" in the
 * middle of a paragraph is not one.
 */
function isHeadingShape(line: string): boolean {
  if (line.length > 45 || line.startsWith("- ") || /\d/.test(line) || /[.,;!?]$/.test(line)) return false;

  const words = line.replace(/[:&/|-]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 5) return false;
  if (line === line.toUpperCase()) return true;

  const capitalised = (word: string) => /^\p{Lu}/u.test(word);
  if (!capitalised(words[0] ?? "")) return false;
  // Short link words ("and", "of") may stay lower case in a title; the rest may not.
  return words.length <= 2 || words.every((word) => word.length <= 3 || capitalised(word));
}

/** The kind of section a line starts, or null when the line is not a heading. */
export function headingKey(line: string): CvSectionKey | null {
  const trimmed = line.trim().replace(/:$/, "").trim();
  if (!isHeadingShape(trimmed)) return null;

  const words = trimmed.toLowerCase().replace(/[^\p{L}\s]/gu, " ").replace(/\s+/g, " ").trim();
  return HEADING_RULES.find(([, pattern]) => pattern.test(words))?.[0] ?? null;
}

/**
 * Splits a CV into its sections by its headings. Nothing is dropped: the text above the first
 * heading (usually the name and contact details) is the `header` section, and a section whose
 * heading is recognised but fits no other kind is `other`.
 */
export function splitSections(text: string): CvSection[] {
  const sections: CvSection[] = [];
  let current: { key: CvSectionKey; heading: string | null; lines: string[] } = {
    key: "header",
    heading: null,
    lines: [],
  };

  const close = () => {
    const body = current.lines.join("\n").trim();
    if (body || current.heading) sections.push({ key: current.key, heading: current.heading, text: body });
  };

  for (const line of text.split("\n")) {
    const key = headingKey(line);
    if (key) {
      close();
      current = { key, heading: line.trim().replace(/:$/, "").trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  close();

  return sections;
}
