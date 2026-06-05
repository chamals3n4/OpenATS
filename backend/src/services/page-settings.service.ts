import { eq } from "drizzle-orm";
import { db } from "../db";
import { pageSettings } from "../db/schema";

export const pageSettingsService = {
  async getAllowedOrigins(): Promise<string[]> {
    const [row] = await db.select().from(pageSettings).limit(1);
    return row?.allowedOrigins ?? [];
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

    return this.getAllowedOrigins();
  },
};
