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

// ------------------------------------------------------------------
// Offers
// Created automatically on stage entry (auto_draft / auto_send)
// or manually by a Hiring Manager.
//
// Salary is pre-filled from the job but editable in auto_draft mode:
//   fixed salary  → pre-fill exact amount
//   range salary  → pre-fill midpoint (min + max) / 2
//   no salary     → leave blank; manager must fill before sending
//
// rendered_html is snapshotted at send time —
// template edits after sending do NOT affect already-sent offers.
// ------------------------------------------------------------------
export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),

  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),

  // denormalised from candidates.jobId for offer-list queries
  // RESTRICT: prevents job deletion while offers exist
  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "restrict" }),

  // nullable if no template was configured on the stage
  templateId: integer("template_id").references(() => templates.id, {
    onDelete: "set null",
  }),

  status: offerStatus("status").notNull().default("draft"),

  // ── Offered compensation ─────────────────────────────────────────
  // pre-filled from job salary on creation; editable before sending
  salary: numeric("salary", { precision: 12, scale: 2 }).$type<number>(),
  currency: varchar("currency", { length: 3 }), // ISO 4217
  payFrequency: payFrequency("pay_frequency"),
  // ────────────────────────────────────────────────────────────────

  startDate: date("start_date"), // proposed employment start date
  expiryDate: date("expiry_date"), // deadline for candidate to respond

  // ── Send snapshot ───────────────────────────────────────────────
  // Fully rendered HTML (all variables resolved) saved at send time.
  // Template edits after sending do not alter this record.
  renderedHtml: text("rendered_html"),
  // NULL while offer is draft/pending; set when status → 'sent'
  sentAt: timestamp("sent_at"),
  // ────────────────────────────────────────────────────────────────

  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;
