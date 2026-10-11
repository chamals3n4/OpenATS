/** Below this many seconds the clock turns red. */
export const LOW_TIME_SECONDS = 120;

export function formatTime(secs: number): string {
  const safe = Math.max(0, secs);
  const m = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const s = (safe % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/** "45 minutes", "1 hour", "1 hour 30 minutes". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const h = hours > 0 ? `${hours} hour${hours === 1 ? "" : "s"}` : "";
  const m = rest > 0 || hours === 0 ? `${rest} minute${rest === 1 ? "" : "s"}` : "";
  return [h, m].filter(Boolean).join(" ");
}
