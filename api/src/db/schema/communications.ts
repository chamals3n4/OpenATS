import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { candidates } from "./candidates";
import { jobs } from "./jobs";
import { templates } from "./templates";
import { users } from "./users";

// ------------------------------------------------------------------
// Email Messages
// Complete audit log of every outbound email sent to a candidate.
// Covers: offer emails, rejection emails, assessment invites, manual messages.
// body_html stores the fully rendered content (all variables already resolved).
// ------------------------------------------------------------------
export const emailMessages = pgTable("email_messages", {
  id: serial("id").primaryKey(),

  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),

  // NULL for system-automated emails (offer auto-send, rejection auto-trigger)
  sentBy: integer("sent_by").references(() => users.id, {
    onDelete: "set null",
  }),

  // nullable for manually composed emails with no template
  templateId: integer("template_id").references(() => templates.id, {
    onDelete: "set null",
  }),

  subject: varchar("subject", { length: 500 }).notNull(),

  // fully rendered HTML with all template variables resolved
  bodyHtml: text("body_html").notNull(),

  // snapshot of the address used at send time
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),

  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

// ------------------------------------------------------------------
// Job Chat Messages
// Persistent store for real-time team chat within a job.
// WebSockets deliver messages live; this table is the source of truth.
// Visible to all members of the job's hiring team.
// ------------------------------------------------------------------
export const jobChatMessages = pgTable("job_chat_messages", {
  id: serial("id").primaryKey(),

  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),

  senderId: integer("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // plain text or light markdown; NULL when message has been soft-deleted
  message: text("message"),

  // self-referencing FK for threaded replies
  replyToId: integer("reply_to_id").references((): any => jobChatMessages.id, {
    onDelete: "set null",
  }),

  sentAt: timestamp("sent_at").notNull().defaultNow(),

  // soft-delete: set TRUE and null out message content to "delete"
  // UI renders as "[message removed]" rather than hiding entirely
  isDeleted: boolean("is_deleted").notNull().default(false),
});

export type EmailMessage = typeof emailMessages.$inferSelect;
export type NewEmailMessage = typeof emailMessages.$inferInsert;

export type JobChatMessage = typeof jobChatMessages.$inferSelect;
export type NewJobChatMessage = typeof jobChatMessages.$inferInsert;
