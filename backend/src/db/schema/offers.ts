import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

import { employmentType, offerStatus } from "./enums";
import { candidates } from "./candidates";
import { jobs } from "./jobs";
import { templates } from "./templates";
import { users } from "./users";

export const offers = pgTable(
  "offers",
  {
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
    currency: varchar("currency", { length: 3 }),
    employmentType: employmentType("employment_type"),
    startDate: date("start_date"),
    reportingManager: varchar("reporting_manager", { length: 255 }),
    benefits: text("benefits"),
    offerLetterHtml: text("offer_letter_html"),

    reviewToken: varchar("review_token", { length: 100 }).unique(),

    sentAt: timestamp("sent_at"),
    viewedAt: timestamp("viewed_at"),
    acceptedAt: timestamp("accepted_at"),
    declinedAt: timestamp("declined_at"),

    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.candidateId, t.jobId),
    index("idx_offers_job_id").on(t.jobId),
    index("idx_offers_created_by").on(t.createdBy),
  ],
);

export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;
