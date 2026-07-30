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

export type ContentBlock =
  | { type: "heading"; content: string }
  | { type: "text"; content: string }
  | { type: "button"; content: string }
  | { type: "image"; url: string; alt?: string | undefined }
  | { type: "divider" }
  | { type: "spacer"; height: number };

// Email templates store a plain HTML string; event templates store ContentBlock[].
export type TemplateBody = ContentBlock[] | string;

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: templateType("type").notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  bodyJson: jsonb("body_json").$type<TemplateBody>().notNull().default([]),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;
