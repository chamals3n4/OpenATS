import {
  integer,
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
  scheduledAt: timestamp("scheduled_at"),
  durationMinutes: integer("duration_minutes"),
  notes: text("notes"),
  outcome: interviewOutcome("outcome").default("pending"),
  // Google Calendar event ID — set when synced to Google Calendar
  googleEventId: varchar("google_event_id", { length: 255 }),
  createdBy: integer("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CandidateInterview = typeof candidateInterviews.$inferSelect;
export type NewCandidateInterview = typeof candidateInterviews.$inferInsert;
