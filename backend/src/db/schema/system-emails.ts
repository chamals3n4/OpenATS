import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { users } from "./users";

/**
 * A company's own wording for one of the emails the app sends by itself. A purpose with no
 * row here uses the built-in wording, so deleting a row is how an email is reset.
 */
export const systemEmailTemplates = pgTable("system_email_templates", {
  purpose: varchar("purpose", { length: 40 }).primaryKey(),
  subject: varchar("subject", { length: 500 }).notNull(),
  bodyHtml: text("body_html").notNull(),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SystemEmailTemplate = typeof systemEmailTemplates.$inferSelect;
