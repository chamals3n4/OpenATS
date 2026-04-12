/**
 * IANA IDs for the company profile (Settings → General).
 * Labels are standard abbreviations (EST, JST, …) for display in UI and emails.
 */
export const COMPANY_IANA_TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Not set" },
  { value: "UTC", label: "UTC" },
  { value: "Pacific/Honolulu", label: "HST" },
  { value: "America/Los_Angeles", label: "PST / PDT" },
  { value: "America/Denver", label: "MST / MDT" },
  { value: "America/Chicago", label: "CST / CDT" },
  { value: "America/New_York", label: "EST / EDT" },
  { value: "America/Sao_Paulo", label: "BRT" },
  { value: "Europe/London", label: "GMT / BST" },
  { value: "Europe/Berlin", label: "CET / CEST" },
  { value: "Asia/Dubai", label: "GST" },
  { value: "Asia/Kolkata", label: "IST" },
  { value: "Asia/Colombo", label: "UTC+05:30" },
  { value: "Asia/Singapore", label: "SGT" },
  { value: "Asia/Tokyo", label: "JST" },
  { value: "Asia/Seoul", label: "KST" },
  { value: "Australia/Sydney", label: "AEST / AEDT" },
  { value: "Pacific/Auckland", label: "NZST / NZDT" },
];

export function companyTimezoneAbbrevLabel(iana: string): string {
  const tz = iana.trim();
  if (!tz) return "";
  return (
    COMPANY_IANA_TIMEZONE_OPTIONS.find((o) => o.value === tz)?.label ?? tz
  );
}

/** `type="time"` value `HH:mm` → locale time string (e.g. 2:30 PM). */
export function formatInterviewTimeForEmail(hhmm: string): string {
  const s = hhmm.trim();
  if (!s || !/^\d{1,2}:\d{2}/.test(s)) return "";
  const [hStr, mStr] = s.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "";
  const d = new Date(2000, 0, 1, h, m);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Builds `{{interview_time}}` using company IANA zone for the suffix label. */
export function buildInterviewTimeLine(
  timeHHMM: string,
  companyTimezoneIana: string,
): string {
  const timePart = formatInterviewTimeForEmail(timeHHMM);
  const tzLabel = companyTimezoneAbbrevLabel(companyTimezoneIana);
  if (timePart && tzLabel) return `${timePart} (${tzLabel})`;
  if (timePart) return timePart;
  return "—";
}
