import { eq } from "drizzle-orm";
import { db } from "../../db";
import { pageSettings } from "../../db/schema";

// The list is read on every request from another origin (CORS) and on every public request
// (checkOrigins), so it is kept in memory for a short time instead of read from the database
// each time. Saving the setting clears it on this server straight away; any other server picks
// the change up when its own copy runs out.
const CACHE_MS = 30_000;
let cached: { origins: string[]; expiresAt: number } | null = null;

export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, "");
}

/** OpenATS's own web app. Its careers page is never an "other website". */
export function frontendOrigin(): string {
  return normalizeOrigin(process.env.FRONTEND_URL ?? "http://localhost:3000");
}

/**
 * Whether a request from this origin may use the public API. An empty list means no
 * restriction. Otherwise the origin has to be on the list, or be OpenATS's own frontend: a
 * company that lists only its website must not lock applicants out of the built-in careers page.
 */
export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.length === 0) return true;
  const requested = normalizeOrigin(origin);
  return requested === frontendOrigin() || allowedOrigins.map(normalizeOrigin).includes(requested);
}

/**
 * What the browser is told about a request from another website (CORS):
 *   "trusted"  our own frontend or a listed origin: allowed, with credentials
 *   "public"   a /public request while the list is empty: allowed without credentials, so a
 *              custom careers site can list jobs and send applications, as checkOrigins allows
 *   "denied"   anything else
 * Only /public is opened: the signed-in API stays limited to our frontend and the list.
 */
export function corsAccess(origin: string, path: string, allowedOrigins: string[]): "trusted" | "public" | "denied" {
  const requested = normalizeOrigin(origin);
  if (requested === frontendOrigin() || allowedOrigins.map(normalizeOrigin).includes(requested)) return "trusted";
  const isPublic = path === "/public" || path.startsWith("/public/");
  return isPublic && allowedOrigins.length === 0 ? "public" : "denied";
}

export const pageSettingsService = {
  async getAllowedOrigins(now: number = Date.now()): Promise<string[]> {
    if (cached && cached.expiresAt > now) return cached.origins;

    const [row] = await db.select().from(pageSettings).limit(1);
    const origins = row?.allowedOrigins ?? [];
    cached = { origins, expiresAt: now + CACHE_MS };
    return origins;
  },

  async setAllowedOrigins(origins: string[]): Promise<string[]> {
    const [existing] = await db.select().from(pageSettings).limit(1);
    const now = new Date();

    if (existing) {
      await db
        .update(pageSettings)
        .set({ allowedOrigins: origins, updatedAt: now })
        .where(eq(pageSettings.id, existing.id));
    } else {
      await db.insert(pageSettings).values({ allowedOrigins: origins });
    }

    this.clearAllowedOriginsCache();
    return this.getAllowedOrigins();
  },

  clearAllowedOriginsCache(): void {
    cached = null;
  },
};
