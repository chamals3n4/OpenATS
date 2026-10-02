const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

/**
 * A length of time in plain words for non-technical readers:
 * "Less than a minute", "35 minutes", "2 hours 10 minutes", "22 days 6 hours".
 */
export function formatElapsed(ms: number) {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "Less than a minute";
  if (minutes < 60) return plural(minutes, "minute");

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest === 0
      ? plural(hours, "hour")
      : `${plural(hours, "hour")} ${plural(rest, "minute")}`;
  }

  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours === 0
    ? plural(days, "day")
    : `${plural(days, "day")} ${plural(restHours, "hour")}`;
}
