/** The most websites the server will store. */
export const MAX_ORIGINS = 50;

export type OriginResult = { ok: true; origin: string } | { ok: false; error: string };

/** Normalize to what the browser sends as Origin */
export function normalizeOrigin(input: string): OriginResult {
  const value = input.trim();
  if (!value) return { ok: false, error: "Enter the website address." };

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return { ok: false, error: "That is not a valid address. Try https://jobs.example.com." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "The address must start with https:// or http://." };
  }
  if (!url.hostname.includes(".") && url.hostname !== "localhost") {
    return { ok: false, error: "That is not a valid address. Try https://jobs.example.com." };
  }
  return { ok: true, origin: url.origin };
}

/** Same list, used to enable Save */
export function sameOrigins(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((o, i) => o === b[i]);
}

/** Careers page and API URLs */
export function careersUrls(appBase: string) {
  const base = appBase.replace(/\/$/, "");
  return {
    page: `${base}/careers`,
    jobsApi: `${base}/api/public/jobs`,
    jobApi: `${base}/api/public/jobs/42`,
    embed: `<div id="openats-jobs"></div>\n<script src="${base}/embed.js" data-instance="${base}"></script>`,
  };
}
