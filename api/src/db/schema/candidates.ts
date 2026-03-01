import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

import { assessmentStatus, cvAnalysisStatus } from "./enums";
import { jobs } from "./jobs";
import { jobPipelineStages } from "./pipeline";
import { users } from "./users";
import {
  assessments,
  assessmentQuestions,
  assessmentQuestionOptions,
  jobCustomQuestions,
  jobCustomQuestionOptions,
} from "./assessments";

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),

  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  // Cloudflare R2 URL
  resumeUrl: varchar("resume_url", { length: 1000 }),

  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "restrict" }),

  currentStageId: integer("current_stage_id").references(
    () => jobPipelineStages.id,
    { onDelete: "set null" },
  ),

  appliedAt: timestamp("applied_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const candidateStageHistory = pgTable("candidate_stage_history", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  stageId: integer("stage_id")
    .notNull()
    .references(() => jobPipelineStages.id, { onDelete: "restrict" }),
  movedBy: integer("moved_by").references(() => users.id, {
    onDelete: "set null",
  }),
  movedAt: timestamp("moved_at").notNull().defaultNow(),
});

export const candidateCustomAnswers = pgTable(
  "candidate_custom_answers",
  {
    id: serial("id").primaryKey(),
    candidateId: integer("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    questionId: integer("question_id")
      .notNull()
      .references(() => jobCustomQuestions.id, { onDelete: "cascade" }),
    // NULL for option-based questions (stored in selections table)
    answerText: text("answer_text"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.candidateId, t.questionId)],
);

export const candidateCustomAnswerSelections = pgTable(
  "candidate_custom_answer_selections",
  {
    id: serial("id").primaryKey(),
    candidateId: integer("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    questionId: integer("question_id")
      .notNull()
      .references(() => jobCustomQuestions.id, { onDelete: "cascade" }),
    optionId: integer("option_id")
      .notNull()
      .references(() => jobCustomQuestionOptions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.candidateId, t.questionId, t.optionId)],
);

export const candidateAssessmentAttempts = pgTable(
  "candidate_assessment_attempts",
  {
    id: serial("id").primaryKey(),
    candidateId: integer("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    assessmentId: integer("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),

    token: varchar("token", { length: 255 }).notNull().unique(),

    status: assessmentStatus("status").notNull().default("pending"),

    expiresAt: timestamp("expires_at").notNull(),

    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),

    scoreRaw: numeric("score_raw", { precision: 8, scale: 2 }).$type<number>(),
    scoreTotal: numeric("score_total", {
      precision: 8,
      scale: 2,
    }).$type<number>(),
    // (scoreRaw / scoreTotal) * 100
    scorePercentage: numeric("score_percentage", {
      precision: 5,
      scale: 2,
    }).$type<number>(),
    passed: boolean("passed"),

    candidateNameInput: varchar("candidate_name_input", { length: 255 }),
    candidateEmailInput: varchar("candidate_email_input", { length: 255 }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
);

export const candidateAssessmentAnswers = pgTable(
  "candidate_assessment_answers",
  {
    id: serial("id").primaryKey(),
    attemptId: integer("attempt_id")
      .notNull()
      .references(() => candidateAssessmentAttempts.id, {
        onDelete: "cascade",
      }),
    questionId: integer("question_id")
      .notNull()
      .references(() => assessmentQuestions.id, { onDelete: "cascade" }),
    answerText: text("answer_text"),
    pointsEarned: numeric("points_earned", {
      precision: 6,
      scale: 2,
    }).$type<number>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.attemptId, t.questionId)],
);

export const candidateAssessmentAnswerSelections = pgTable(
  "candidate_assessment_answer_selections",
  {
    id: serial("id").primaryKey(),
    answerId: integer("answer_id")
      .notNull()
      .references(() => candidateAssessmentAnswers.id, { onDelete: "cascade" }),
    optionId: integer("option_id")
      .notNull()
      .references(() => assessmentQuestionOptions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.answerId, t.optionId)],
);

export const candidateCvAnalysis = pgTable(
  "candidate_cv_analysis",
  {
    id: serial("id").primaryKey(),
    candidateId: integer("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    jobId: integer("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),

    matchScore: numeric("match_score", {
      precision: 5,
      scale: 2,
    }).$type<number>(),

    matchedSkills: text("matched_skills").array(),
    missingSkills: text("missing_skills").array(),

    extractedText: text("extracted_text"),

    status: cvAnalysisStatus("status").notNull().default("pending"),

    errorMessage: text("error_message"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.candidateId)],
);

export type Candidate = typeof candidates.$inferSelect;
export type NewCandidate = typeof candidates.$inferInsert;

export type CandidateStageHistory = typeof candidateStageHistory.$inferSelect;
export type NewCandidateStageHistory =
  typeof candidateStageHistory.$inferInsert;

export type CandidateCustomAnswer = typeof candidateCustomAnswers.$inferSelect;
export type NewCandidateCustomAnswer =
  typeof candidateCustomAnswers.$inferInsert;

export type CandidateAssessmentAttempt =
  typeof candidateAssessmentAttempts.$inferSelect;
export type NewCandidateAssessmentAttempt =
  typeof candidateAssessmentAttempts.$inferInsert;

export type CandidateAssessmentAnswer =
  typeof candidateAssessmentAnswers.$inferSelect;
export type NewCandidateAssessmentAnswer =
  typeof candidateAssessmentAnswers.$inferInsert;

export type CandidateCvAnalysis = typeof candidateCvAnalysis.$inferSelect;
export type NewCandidateCvAnalysis = typeof candidateCvAnalysis.$inferInsert;
