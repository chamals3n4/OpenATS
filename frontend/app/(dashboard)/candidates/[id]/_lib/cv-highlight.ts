/** Find search words in the CV, ignoring one letter words */
export function searchPattern(query: string): RegExp | null {
  const words = query
    .trim()
    .split(/\s+/)
    .filter((word) => word.length >= 2)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return words.length > 0 ? new RegExp(`(${words.join("|")})`, "gi") : null;
}

/** Split into matched and normal parts */
export function highlightParts(text: string, pattern: RegExp | null): { text: string; match: boolean }[] {
  if (!pattern) return text ? [{ text, match: false }] : [];
  // Matches are at odd indexes
  return text
    .split(pattern)
    .map((part, index) => ({ text: part, match: index % 2 === 1 }))
    .filter((part) => part.text !== "");
}

export function countMatches(texts: string[], pattern: RegExp | null): number {
  if (!pattern) return 0;
  return texts.reduce((total, text) => total + (text.match(pattern)?.length ?? 0), 0);
}
