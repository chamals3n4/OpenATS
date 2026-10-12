import { sql, type SQL } from "drizzle-orm";
import {
  boolean,
  customType,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
  index,
} from "drizzle-orm/pg-core";

import { assessmentStatus, candidateStatus, cvAnalysisStatus, cvTextStatus } from "./enums";
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

export const candidates = pgTable(
  "candidates",
  {
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

    status: candidateStatus("status").notNull().default("active"),

    // Order of the card within its pipeline stage (0 is the top). Ties fall back to newest first.
    stagePosition: integer("stage_position").notNull().default(0),

    // Score parts, 0-100, null until that part exists. Kept in step by scoring.service so the
    // candidate list can sort on `totalScore` in SQL.
    questionsScore: numeric("questions_score", { precision: 5, scale: 2 }).$type<number>(),
    assessmentScore: numeric("assessment_score", { precision: 5, scale: 2 }).$type<number>(),
    ratingScore: numeric("rating_score", { precision: 5, scale: 2 }).$type<number>(),
    interviewScore: numeric("interview_score", { precision: 5, scale: 2 }).$type<number>(),
    totalScore: numeric("total_score", { precision: 5, scale: 2 }).$type<number>(),
    // How many of the job's weighted parts have a score yet.
    scoredParts: integer("scored_parts").notNull().default(0),
    // Picked a knockout answer: "does not meet requirements".
    knockedOut: boolean("knocked_out").notNull().default(false),
    // Result of the latest finished assessment against its pass mark; null if none finished.
    assessmentPassed: boolean("assessment_passed"),
    // An assessment link ran out unused. It counts as 0 and is flagged, so skipping the test cannot help.
    assessmentExpired: boolean("assessment_expired").notNull().default(false),

    appliedAt: timestamp("applied_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.jobId, t.email),
    index("idx_candidates_job_id").on(t.jobId),
    index("idx_candidates_current_stage_id").on(t.currentStageId),
  ],
);

export const candidateStageHistory = pgTable(
  "candidate_stage_history",
  {
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
  },
  (t) => [
    index("idx_candidate_stage_history_candidate_id").on(t.candidateId),
    index("idx_candidate_stage_history_stage_id").on(t.stageId),
  ],
);

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
  (t) => [index("idx_assessment_attempts_candidate_id").on(t.candidateId)],
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

    scoreBreakdown: jsonb("score_breakdown").$type<{
      skills: number;
      experience: number;
      level: number;
      certs: number;
    }>(),

    // Notes only. Rows saved before the score and verdict were dropped may still hold
    // `hiringSignal` and `verdict`; they are never read or returned.
    aiSummary: jsonb("ai_summary").$type<{
      quickSummary: string;
      strengths: string[];
      gaps: string[];
    }>(),

    extractedText: text("extracted_text"),

    status: cvAnalysisStatus("status").notNull().default("pending"),

    errorMessage: text("error_message"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.candidateId)],
);

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/**
 * The text of a candidate's CV, read from the uploaded file on our own server. One row per
 * candidate, in its own table so the large text stays out of `candidates`.
 */
export const candidateCvText = pgTable(
  "candidate_cv_text",
  {
    id: serial("id").primaryKey(),
    candidateId: integer("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),

    // The file this text came from. A result for any other file is out of date and is not saved.
    resumeUrl: varchar("resume_url", { length: 1000 }).notNull(),

    status: cvTextStatus("status").notNull().default("pending"),
    // "text" (read from the file) or "ocr" (read from page images).
    method: varchar("method", { length: 10 }),
    fileType: varchar("file_type", { length: 10 }),

    // Cleaned text, for people to read and for search snippets.
    text: text("text"),
    // The same text with terms the Postgres parser cannot keep ("C++", ".NET") rewritten. Search
    // queries go through the same rewrite; see cv-text/normalize-search.ts.
    searchText: text("search_text"),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      (): SQL => sql`to_tsvector('english', coalesce(${candidateCvText.searchText}, ''))`,
    ),

    pageCount: integer("page_count"),
    charCount: integer("char_count"),

    // Read out of `text` by rules (cv-text/profile.ts). The years and the level are estimates, and
    // null means "could not be worked out", never zero. None of this is part of the score.
    sections: jsonb("sections").$type<{ key: string; heading: string | null; text: string }[]>(),
    experienceYears: numeric("experience_years", { precision: 4, scale: 1 }).$type<number>(),
    educationLevel: varchar("education_level", { length: 20 }),
    contacts: jsonb("contacts").$type<{ emails: string[]; phones: string[]; links: string[] }>(),

    // Raised when extraction changes, so the backfill knows which rows to redo.
    extractorVersion: integer("extractor_version").notNull().default(1),

    errorMessage: text("error_message"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.candidateId),
    index("idx_candidate_cv_text_search").using("gin", t.searchVector),
  ],
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

export type CandidateCvText = typeof candidateCvText.$inferSelect;
export type NewCandidateCvText = typeof candidateCvText.$inferInsert;
