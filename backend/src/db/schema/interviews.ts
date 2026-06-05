import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { interviewOutcome } from "./enums";
import { candidates } from "./candidates";
import { jobPipelineStages } from "./pipeline";
import { jobs } from "./jobs";
import { users } from "./users";

export const candidateInterviews = pgTable("candidate_interviews", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  stageId: integer("stage_id")
    .notNull()
    .references(() => jobPipelineStages.id, { onDelete: "restrict" }),
  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "restrict" }),

  // Scheduling
  eventName: varchar("event_name", { length: 255 }),
  eventType: varchar("event_type", { length: 20 }).default("virtual"),
  meetingUrl: varchar("meeting_url", { length: 1000 }),
  bodyText: text("body_text"),

  // Time slots (array of { datetime: string, selected: boolean })
  timeSlots:
    jsonb("time_slots").$type<Array<{ datetime: string; selected: boolean }>>(),

  // State
  status: varchar("status", { length: 30 })
    .notNull()
    .default("pending_schedule"),
  outcome: interviewOutcome("outcome").default("pending"),
  publicToken: varchar("public_token", { length: 100 }).unique(),

  // Google Calendar
  googleEventId: varchar("google_event_id", { length: 255 }),

  // Legacy
  scheduledAt: timestamp("scheduled_at"),
  durationMinutes: integer("duration_minutes"),
  notes: text("notes"),

  createdBy: integer("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CandidateInterview = typeof candidateInterviews.$inferSelect;
export type NewCandidateInterview = typeof candidateInterviews.$inferInsert;
