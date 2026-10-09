import {
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

import { jobs } from "./jobs";
import { users } from "./users";
import { candidates } from "./candidates";
import { interviewFeedback } from "./interview-feedback";

/** What interviewers score a candidate on for one job, e.g. "Technical skill". */
export const jobScorecardCriteria = pgTable(
  "job_scorecard_criteria",
  {
    id: serial("id").primaryKey(),
    jobId: integer("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_job_scorecard_criteria_job_id").on(t.jobId)],
);

/** One team member's 1-5 star rating of a candidate after reading the CV. */
export const candidateRatings = pgTable(
  "candidate_ratings",
  {
    id: serial("id").primaryKey(),
    candidateId: integer("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 1-5
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.candidateId, t.userId)],
);

/** A scorecard's 1-5 score for one criterion. */
export const interviewFeedbackRatings = pgTable(
  "interview_feedback_ratings",
  {
    id: serial("id").primaryKey(),
    feedbackId: integer("feedback_id")
      .notNull()
      .references(() => interviewFeedback.id, { onDelete: "cascade" }),
    criterionId: integer("criterion_id")
      .notNull()
      .references(() => jobScorecardCriteria.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 1-5
  },
  (t) => [unique().on(t.feedbackId, t.criterionId)],
);

export type JobScorecardCriterion = typeof jobScorecardCriteria.$inferSelect;
export type CandidateRating = typeof candidateRatings.$inferSelect;
export type InterviewFeedbackRating = typeof interviewFeedbackRatings.$inferSelect;
