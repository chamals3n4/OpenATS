import {
  integer,
  jsonb,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { templateType } from "./enums";
import { users } from "./users";

// ------------------------------------------------------------------
// Block types for the visual template editor (body_json column).
// Each block is rendered to HTML at send time.
// Supported template variables inside content/label/url fields:
//   {{candidate_name}} {{job_title}} {{salary}} {{currency}}
//   {{start_date}} {{expiry_date}} {{company_name}}
// ------------------------------------------------------------------
export type ContentBlock =
  | { type: "heading"; content: string }
  | { type: "text"; content: string }
  | { type: "button"; label: string; url: string }
  | { type: "image"; url: string; alt?: string }
  | { type: "divider" }
  | { type: "spacer"; height: number };

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: templateType("type").notNull(),
  // supports the same {{variables}} as body_json
  subject: varchar("subject", { length: 500 }).notNull(),
  // JSONB array of ContentBlock objects; rendered to HTML at send time
  bodyJson: jsonb("body_json").$type<ContentBlock[]>().notNull().default([]),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;
