import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Settings for the whole installation. One row. A missing row means every setting is at its
 * default, so nothing has to be seeded.
 */
export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  // Whether candidates' CVs are sent to Google Gemini for a written summary. Off unless someone
  // turns it on, because it shares personal data with a third party.
  aiCvAnalysisEnabled: boolean("ai_cv_analysis_enabled").notNull().default(false),
  aiCvModel: text("ai_cv_model"),
  aiCvProvider: text("ai_cv_provider"),
  aiCvApiKeyEncrypted: text("ai_cv_api_key_encrypted"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AppSettings = typeof appSettings.$inferSelect;
