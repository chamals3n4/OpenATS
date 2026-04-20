import {
  date,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { offerStatus, payFrequency } from "./enums";
import { candidates } from "./candidates";
import { jobs } from "./jobs";
import { templates } from "./templates";
import { users } from "./users";

export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),

  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),

  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "restrict" }),

  templateId: integer("template_id").references(() => templates.id, {
    onDelete: "set null",
  }),

  status: offerStatus("status").notNull().default("draft"),

  salary: numeric("salary", { precision: 12, scale: 2 }).$type<number>(),
  currency: varchar("currency", { length: 3 }), // ISO 4217
  payFrequency: payFrequency("pay_frequency"),

  startDate: date("start_date"),
  expiryDate: date("expiry_date"),

  /** Free text for {{benefits}} in offer letter templates */
  benefits: text("benefits"),

  renderedHtml: text("rendered_html"),
  sentAt: timestamp("sent_at"),

  /** Token embedded in offer email links for self-serve accept / decline. */
  responseToken: varchar("response_token", { length: 64 }).unique(),

  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;
