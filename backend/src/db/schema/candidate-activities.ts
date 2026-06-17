import {
  integer,
  jsonb,
  pgTable,
  serial,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { candidateActivityType } from "./enums";
import { candidates } from "./candidates";
import { jobs } from "./jobs";
import { offers } from "./offers";
import { jobPipelineStages } from "./pipeline";
import { users } from "./users";

export const candidateActivities = pgTable(
  "candidate_activities",
  {
    id: serial("id").primaryKey(),

    candidateId: integer("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),

    jobId: integer("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),

    offerId: integer("offer_id").references(() => offers.id, {
      onDelete: "set null",
    }),

    stageId: integer("stage_id").references(() => jobPipelineStages.id, {
      onDelete: "set null",
    }),

    actorId: integer("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),

    eventType: candidateActivityType("event_type").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_candidate_activities_candidate_id").on(t.candidateId),
    index("idx_candidate_activities_job_id").on(t.jobId),
  ],
);

export type CandidateActivity = typeof candidateActivities.$inferSelect;
export type NewCandidateActivity = typeof candidateActivities.$inferInsert;
