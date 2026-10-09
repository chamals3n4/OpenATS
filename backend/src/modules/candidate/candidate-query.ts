/**
 * A minimum score from the query string: one non-blank value that is a number, kept within 0-100.
 * Anything else (missing, repeated, empty, blank or not a number) means no minimum. `Number("")`
 * is 0 and `Number(["70"])` is 70, so the raw value cannot simply be converted.
 */
export function parseMinScore(raw: unknown): number | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : undefined;
}
