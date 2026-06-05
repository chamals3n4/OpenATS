import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const pageSettings = pgTable("public_page_settings", {
  id: serial("id").primaryKey(),
  allowedOrigins: text("allowed_origins")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PageSettings = typeof pageSettings.$inferSelect;
