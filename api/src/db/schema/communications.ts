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

export const emailMessages = pgTable("email_messages", {
  id: serial("id").primaryKey(),

  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),

  sentBy: integer("sent_by").references(() => users.id, {
    onDelete: "set null",
  }),

  templateId: integer("template_id").references(() => templates.id, {
    onDelete: "set null",
  }),

  subject: varchar("subject", { length: 500 }).notNull(),

  bodyHtml: text("body_html").notNull(),

  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),

  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

export const jobChatMessages = pgTable("job_chat_messages", {
  id: serial("id").primaryKey(),

  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),

  senderId: integer("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  message: text("message"),

  replyToId: integer("reply_to_id").references((): any => jobChatMessages.id, {
    onDelete: "set null",
  }),

  sentAt: timestamp("sent_at").notNull().defaultNow(),

  isSystemMessage: boolean("is_system_message").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

export const candidateChatMessages = pgTable("candidate_chat_messages", {
  id: serial("id").primaryKey(),

  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),

  senderId: integer("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  message: text("message"),

  replyToId: integer("reply_to_id").references(
    (): any => candidateChatMessages.id,
    {
      onDelete: "set null",
    }
  ),

  sentAt: timestamp("sent_at").notNull().defaultNow(),

  isSystemMessage: boolean("is_system_message").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

export type EmailMessage = typeof emailMessages.$inferSelect;
export type NewEmailMessage = typeof emailMessages.$inferInsert;

export type JobChatMessage = typeof jobChatMessages.$inferSelect;
export type NewJobChatMessage = typeof jobChatMessages.$inferInsert;

export type CandidateChatMessage = typeof candidateChatMessages.$inferSelect;
export type NewCandidateChatMessage = typeof candidateChatMessages.$inferInsert;
