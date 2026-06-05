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

export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  timeLimit: integer("time_limit").notNull(),
  passScore: numeric("pass_score", { precision: 5, scale: 2 })
    .$type<number>()
    .notNull(),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const assessmentQuestions = pgTable("assessment_questions", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id")
    .notNull()
    .references(() => assessments.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  questionType: questionType("question_type").notNull(),
  points: numeric("points", { precision: 6, scale: 2 })
    .$type<number>()
    .notNull()
    .default(1),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const assessmentQuestionOptions = pgTable(
  "assessment_question_options",
  {
    id: serial("id").primaryKey(),
    questionId: integer("question_id")
      .notNull()
      .references(() => assessmentQuestions.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 500 }).notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
);

export const jobCustomQuestions = pgTable("job_custom_questions", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  questionType: questionType("question_type").notNull(),
  isRequired: boolean("is_required").notNull().default(false),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const jobCustomQuestionOptions = pgTable("job_custom_question_options", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id")
    .notNull()
    .references(() => jobCustomQuestions.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 500 }).notNull(),
  isCorrect: boolean("is_correct").notNull().default(false),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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
    triggerStageId: integer("trigger_stage_id")
      .notNull()
      .references(() => jobPipelineStages.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
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
