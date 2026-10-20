import { index, integer, jsonb, pgTable, serial, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";

import { candidates } from "./candidates";
import { jobs } from "./jobs";
import { jobPipelineStages } from "./pipeline";
import { users } from "./users";

export interface AssignmentResource {
  label: string;
  url: string;
}

export type SubmissionFieldType = "link" | "short_text" | "long_text";

/** One question on the form a candidate fills in to hand in their work. */
export interface SubmissionField {
  /** Stable, so answers keep matching their question when the label is reworded. */
  id: string;
  label: string;
  type: SubmissionFieldType;
  required: boolean;
  hint?: string;
}

export const DEFAULT_SUBMISSION_FIELDS: SubmissionField[] = [
  { id: "link", label: "Link to your work", type: "link", required: true, hint: "A repository or a live demo" },
  { id: "notes", label: "Notes", type: "long_text", required: false, hint: "Anything we should know, such as how to run it" },
];

export type CandidateAssignmentStatus = "pending" | "submitted" | "expired";

/** A take-home task a company sets once and sends to many candidates. */
export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  // Plain text, shown as text everywhere, never as HTML.
  description: text("description").notNull().default(""),
  // Links to the spec, a repository to start from, and so on.
  resources: jsonb("resources").$type<AssignmentResource[]>().notNull().default([]),
  // The form the candidate fills in to hand in their work.
  submissionFields: jsonb("submission_fields")
    .$type<SubmissionField[]>()
    .notNull()
    .default(DEFAULT_SUBMISSION_FIELDS),
  // Days the candidate has to hand in, counted from when it is sent.
  dueDays: integer("due_days").notNull().default(7),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** One assignment sent to one candidate, and what they handed in. */
export const candidateAssignments = pgTable(
  "candidate_assignments",
  {
    id: serial("id").primaryKey(),
    candidateId: integer("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    assignmentId: integer("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 255 }).notNull().unique(),
    status: varchar("status", { length: 20 }).$type<CandidateAssignmentStatus>().notNull().default("pending"),
    dueAt: timestamp("due_at").notNull(),
    submittedAt: timestamp("submitted_at"),
    // The form as it was when this was sent, so editing the assignment later changes nothing here.
    submissionFields: jsonb("submission_fields").$type<SubmissionField[]>().notNull(),
    // Answers by field id.
    submissionAnswers: jsonb("submission_answers").$type<Record<string, string>>().notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("idx_candidate_assignments_candidate_id").on(t.candidateId)],
);

/** An assignment sent automatically to every candidate who moves into a stage of a job. */
export const jobAssignmentAttachments = pgTable(
  "job_assignment_attachments",
  {
    id: serial("id").primaryKey(),
    jobId: integer("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    assignmentId: integer("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    triggerStageId: integer("trigger_stage_id")
      .notNull()
      .references(() => jobPipelineStages.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.jobId, t.triggerStageId)],
);
