/** The public address of this app, for links that leave it: previews, sitemaps */
export function appUrl() {
  const url =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim() ||
    "http://localhost:3000";
  return url.replace(/\/$/, "");
}
