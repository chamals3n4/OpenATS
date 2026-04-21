import { boolean, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { offers } from "./offers";
import { candidates } from "./candidates";

export const offerResponseAttempts = pgTable("offer_response_attempts", {
  id: serial("id").primaryKey(),
  offerId: integer("offer_id")
    .notNull()
    .references(() => offers.id, { onDelete: "cascade" }),
  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  respondedAt: timestamp("responded_at"),
  responderName: varchar("responder_name", { length: 255 }),
  candidateMessage: text("candidate_message"),
  reminder48hSentAt: timestamp("reminder_48h_sent_at"),
  reminder24hSentAt: timestamp("reminder_24h_sent_at"),
  expiryNotifiedAt: timestamp("expiry_notified_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type OfferResponseAttempt = typeof offerResponseAttempts.$inferSelect;
export type NewOfferResponseAttempt = typeof offerResponseAttempts.$inferInsert;
