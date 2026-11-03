/**
 * Where the Express API is. Read when the app runs, never only when it is built, so one built
 * image (Docker) works on any address.
 *
 * - Server code calls the API at OPENATS_API_URL, which may be an address only the server can
 *   reach, such as http://api:8080 inside Docker Compose.
 * - The browser calls it at OPENATS_PUBLIC_API_URL. The root layout writes that into the page
 *   (RuntimeConfig), because a NEXT_PUBLIC_ variable is fixed when the app is built.
 *
 * NEXT_PUBLIC_API_URL still works as the fallback for both, so setups made before these two
 * existed keep working unchanged.
 */

const DEFAULT_API_URL = "http://localhost:8080";

declare global {
  interface Window {
    __OPENATS_API_URL__?: string;
  }
}

const trim = (url: string) => url.trim().replace(/\/+$/, "");

/** The address the browser uses. On the server, the value to write into the page. */
function configuredPublicUrl(): string {
  return trim(process.env.OPENATS_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL);
}

/** The API for code running on the server: route handlers, server components. */
export function serverApiUrl(): string {
  return trim(process.env.OPENATS_API_URL || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL);
}

/**
 * The API for code running in the browser: the address written into the page. Safe to call
 * while a client component is rendered on the server too, where it gives the configured value.
 */
export function browserApiUrl(): string {
  if (typeof window !== "undefined" && window.__OPENATS_API_URL__) return window.__OPENATS_API_URL__;
  return configuredPublicUrl();
}

/** The script the root layout puts in the page. `<` is escaped so the value cannot end the tag. */
export function runtimeConfigScript(): string {
  return `window.__OPENATS_API_URL__=${JSON.stringify(configuredPublicUrl()).replace(/</g, "\\u003c")};`;
}
