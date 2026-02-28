import {
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";

import { questionType } from "./enums";
import { users } from "./users";
import { jobs } from "./jobs";
import { jobPipelineStages } from "./pipeline";

// ------------------------------------------------------------------
// Assessments
// Standalone assessments attached to pipeline stages.
// Candidates receive a unique time-limited token link to complete them.
// ------------------------------------------------------------------
export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  // maximum allowed completion time in minutes
  timeLimit: integer("time_limit").notNull(),
  // minimum percentage score required to pass (0.00 – 100.00)
  passScore: numeric("pass_score", { precision: 5, scale: 2 })
    .$type<number>()
    .notNull(),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ------------------------------------------------------------------
// Assessment Questions
// Only short_answer and multiple_choice supported in v1 (no media).
// ------------------------------------------------------------------
export const assessmentQuestions = pgTable("assessment_questions", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id")
    .notNull()
    .references(() => assessments.id, { onDelete: "cascade" }),
  // question prompt shown to the candidate
  title: varchar("title", { length: 500 }).notNull(),
  // optional clarification or instructions
  description: text("description"),
  // 'short_answer' for free-text; 'multiple_choice' for option-based
  questionType: questionType("question_type").notNull(),
  // points this question is worth; summed to produce score_total on an attempt
  points: numeric("points", { precision: 6, scale: 2 })
    .$type<number>()
    .notNull()
    .default(1),
  // render order within the assessment
  position: integer("position").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ------------------------------------------------------------------
// Assessment Question Options
// Answer choices for multiple_choice questions.
// Exactly ONE option per question should have isCorrect = true.
// ------------------------------------------------------------------
export const assessmentQuestionOptions = pgTable(
  "assessment_question_options",
  {
    id: serial("id").primaryKey(),
    questionId: integer("question_id")
      .notNull()
      .references(() => assessmentQuestions.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 500 }).notNull(),
    // marks the correct answer; used by the auto-scoring engine
    isCorrect: boolean("is_correct").notNull().default(false),
    // render order within the question
    position: integer("position").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
);

// ------------------------------------------------------------------
// Job Custom Questions
// Additional questions on a specific job's public application form.
// Rendered below the default fields (name, email, phone, resume).
// ------------------------------------------------------------------
export const jobCustomQuestions = pgTable("job_custom_questions", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  questionType: questionType("question_type").notNull(),
  // TRUE = applicant cannot submit without answering
  isRequired: boolean("is_required").notNull().default(false),
  // render order on the application form
  position: integer("position").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ------------------------------------------------------------------
// Job Custom Question Options
// Selectable options for checkbox/radio application form questions.
// ------------------------------------------------------------------
export const jobCustomQuestionOptions = pgTable("job_custom_question_options", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id")
    .notNull()
    .references(() => jobCustomQuestions.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 500 }).notNull(),
  // optionally marks a correct answer; not enforced at submission
  isCorrect: boolean("is_correct").notNull().default(false),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ------------------------------------------------------------------
// Job Assessment Attachments
// Links an assessment to a specific stage of a specific job's pipeline.
// Candidate entry into triggerStageId triggers the assessment invite email.
// ------------------------------------------------------------------
export const jobAssessmentAttachments = pgTable(
  "job_assessment_attachments",
  {
    id: serial("id").primaryKey(),
    jobId: integer("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    assessmentId: integer("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    // the pipeline stage whose entry triggers the assessment invite
    triggerStageId: integer("trigger_stage_id")
      .notNull()
      .references(() => jobPipelineStages.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  // only one assessment per stage per job
  (t) => [unique().on(t.jobId, t.triggerStageId)],
);

export type Assessment = typeof assessments.$inferSelect;
export type NewAssessment = typeof assessments.$inferInsert;

export type AssessmentQuestion = typeof assessmentQuestions.$inferSelect;
export type NewAssessmentQuestion = typeof assessmentQuestions.$inferInsert;

export type AssessmentQuestionOption =
  typeof assessmentQuestionOptions.$inferSelect;
export type NewAssessmentQuestionOption =
  typeof assessmentQuestionOptions.$inferInsert;

export type JobCustomQuestion = typeof jobCustomQuestions.$inferSelect;
export type NewJobCustomQuestion = typeof jobCustomQuestions.$inferInsert;

export type JobCustomQuestionOption =
  typeof jobCustomQuestionOptions.$inferSelect;
export type NewJobCustomQuestionOption =
  typeof jobCustomQuestionOptions.$inferInsert;

export type JobAssessmentAttachment =
  typeof jobAssessmentAttachments.$inferSelect;
export type NewJobAssessmentAttachment =
  typeof jobAssessmentAttachments.$inferInsert;
