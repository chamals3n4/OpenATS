/**
 * The company's time zone, used wherever a date or time is written into an email. Without it a
 * time is formatted in the server's own zone, which is usually UTC: a 3:00 PM interview in
 * Colombo was sent to the candidate as 9:30 AM.
 */

export const DEFAULT_TIME_ZONE = "UTC";

/** Whether a string is a time zone this server can format in, such as "Asia/Colombo". */
export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** "Monday, October 12, 2026", on the calendar of the given zone. */
export function formatEmailDate(date: Date, timeZone: string = DEFAULT_TIME_ZONE): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone,
  });
}

/**
 * "3:00 PM GMT+5:30 (Asia/Colombo)". The offset and the zone's name are both given, so the time
 * cannot be misread by someone who is somewhere else.
 */
export function formatEmailTime(date: Date, timeZone: string = DEFAULT_TIME_ZONE): string {
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone,
  });
  return timeZone === DEFAULT_TIME_ZONE ? time : `${time} (${timeZone.replace(/_/g, " ")})`;
}
