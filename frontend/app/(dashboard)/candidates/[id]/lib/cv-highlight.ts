/**
 * Finding words inside the CV summary. Each word typed is looked for on its own, in any case, so
 * "icu nurse" marks every "ICU" and every "nurse". One-letter words are ignored: they would mark
 * half the page.
 */
export function searchPattern(query: string): RegExp | null {
  const words = query
    .trim()
    .split(/\s+/)
    .filter((word) => word.length >= 2)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return words.length > 0 ? new RegExp(`(${words.join("|")})`, "gi") : null;
}

/** The text cut into the parts that match and the parts between them, in order. */
export function highlightParts(text: string, pattern: RegExp | null): { text: string; match: boolean }[] {
  if (!pattern) return text ? [{ text, match: false }] : [];
  // Splitting on a pattern with one group puts the matches at the odd positions.
  return text
    .split(pattern)
    .map((part, index) => ({ text: part, match: index % 2 === 1 }))
    .filter((part) => part.text !== "");
}

export function countMatches(texts: string[], pattern: RegExp | null): number {
  if (!pattern) return 0;
  return texts.reduce((total, text) => total + (text.match(pattern)?.length ?? 0), 0);
}
