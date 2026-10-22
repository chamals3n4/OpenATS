/**
 * An address on the site candidates open (the frontend), for links in emails: FRONTEND_URL with
 * any trailing slash removed, so `https://example.com/` does not give `https://example.com//offer/…`.
 */
export function frontendUrl(path = ""): string {
  const base = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}${path}`;
}

/** Whether a URL points at the machine it is opened on, which a candidate's browser cannot reach. */
export function isLocalUrl(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return (
      ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(hostname) || hostname.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}
