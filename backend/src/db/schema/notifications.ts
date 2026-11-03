import { index, integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { candidates } from "./candidates";
import { jobs } from "./jobs";
import { users } from "./users";

/**
 * One row per person told about something on a job: the bell in the dashboard. Only the kind and
 * the ids are stored, never a name, so the text is put together when the list is read and
 * deleting a candidate (which cascades here) leaves nothing about them behind.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** A NotificationType, see shared/services/notification-types.ts */
    type: varchar("type", { length: 50 }).notNull(),
    candidateId: integer("candidate_id").references(() => candidates.id, { onDelete: "cascade" }),
    jobId: integer("job_id").references(() => jobs.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_notifications_user_created").on(t.userId, t.createdAt),
    index("idx_notifications_candidate_id").on(t.candidateId),
  ],
);

export type Notification = typeof notifications.$inferSelect;
