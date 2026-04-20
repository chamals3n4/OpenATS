/**
 * Relative time for UI lists. Clamps negative deltas (clock skew / timezone quirks)
 * so we don't treat them as `mins < 1` → "just now" for every row.
 */
export function formatTimeAgo(dateStr: string | null | undefined): string {
  if (dateStr == null || dateStr === "") return "—";
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return "—";

  const rawDiff = Date.now() - t;
  const diff = Math.max(0, rawDiff);
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatDate(
  dateStr: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
  locale = "en-US",
): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, options);
}
