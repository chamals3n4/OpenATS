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

// ------------------------------------------------------------------
// Candidates
// One record per job application.
// A person applying to two jobs = two completely independent records.
// ------------------------------------------------------------------
export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),

  // ── Default application form fields ──────────────────────────────
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  // Cloudflare R2 URL to the uploaded PDF resume
  resumeUrl: varchar("resume_url", { length: 1000 }),
  // ─────────────────────────────────────────────────────────────────

  // RESTRICT: prevents accidental job deletion while candidates exist
  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "restrict" }),

  // current kanban position; updated on every drag-and-drop move
  // SET NULL if the stage is deleted — app layer must handle null gracefully
  currentStageId: integer("current_stage_id").references(
    () => jobPipelineStages.id,
    { onDelete: "set null" },
  ),

  appliedAt: timestamp("applied_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ------------------------------------------------------------------
// Candidate Stage History
// Append-only audit log of every pipeline stage transition.
// Powers Time-To-Hire analytics and timeline views.
//
// ⚠️  ON DELETE RESTRICT on stageId:
//   A stage that has history cannot be deleted.
//   App layer must check for history rows before allowing stage deletion.
// ------------------------------------------------------------------
export const candidateStageHistory = pgTable("candidate_stage_history", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  // RESTRICT: preserves audit integrity; cannot delete a stage with history
  stageId: integer("stage_id")
    .notNull()
    .references(() => jobPipelineStages.id, { onDelete: "restrict" }),
  // NULL = transition triggered by system automation
  movedBy: integer("moved_by").references(() => users.id, {
    onDelete: "set null",
  }),
  movedAt: timestamp("moved_at").notNull().defaultNow(),
});

// ------------------------------------------------------------------
// Candidate Custom Answers
// Free-text answers to short_answer / long_answer custom questions.
// Option-based answers → candidateCustomAnswerSelections below.
// ------------------------------------------------------------------
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

// ------------------------------------------------------------------
// Candidate Custom Answer Selections
// Selected option(s) for checkbox / radio custom questions.
// Multiple rows per question are valid for checkbox (multi-select).
// ------------------------------------------------------------------
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

// ------------------------------------------------------------------
// Candidate Assessment Attempts
// One row per assessment invite sent to a candidate.
// The unique token is embedded in the invite email URL — no sign-in needed.
// Candidate confirms name + email before starting (identity check).
// ------------------------------------------------------------------
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

    // random token for passwordless access — crypto.randomBytes(32).toString('hex')
    token: varchar("token", { length: 255 }).notNull().unique(),

    status: assessmentStatus("status").notNull().default("pending"),

    // token is invalid after this timestamp (suggest 7-day default)
    expiresAt: timestamp("expires_at").notNull(),

    startedAt: timestamp("started_at"), // set when candidate opens assessment
    completedAt: timestamp("completed_at"), // set when candidate submits

    // ── Scoring ────────────────────────────────────────────────────
    scoreRaw: numeric("score_raw", { precision: 8, scale: 2 }).$type<number>(),
    // snapshot of max possible points at attempt time
    scoreTotal: numeric("score_total", {
      precision: 8,
      scale: 2,
    }).$type<number>(),
    // (scoreRaw / scoreTotal) * 100
    scorePercentage: numeric("score_percentage", {
      precision: 5,
      scale: 2,
    }).$type<number>(),
    // TRUE if scorePercentage >= assessments.passScore
    passed: boolean("passed"),
    // ──────────────────────────────────────────────────────────────

    // identity confirmation collected before assessment starts
    candidateNameInput: varchar("candidate_name_input", { length: 255 }),
    candidateEmailInput: varchar("candidate_email_input", { length: 255 }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
);

// ------------------------------------------------------------------
// Candidate Assessment Answers
// Per-question answers submitted during an attempt.
// ------------------------------------------------------------------
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
    // populated for short_answer; NULL for multiple_choice
    answerText: text("answer_text"),
    // auto-scored for multiple_choice; NULL for text until manually reviewed
    pointsEarned: numeric("points_earned", {
      precision: 6,
      scale: 2,
    }).$type<number>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.attemptId, t.questionId)],
);

// ------------------------------------------------------------------
// Candidate Assessment Answer Selections
// The option(s) selected for a multiple_choice assessment answer.
// ------------------------------------------------------------------
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

// ------------------------------------------------------------------
// Candidate CV Analysis
// Auto-generated on application submission.
// Async job: fetches resume from R2, parses PDF, matches against job_skills.
// UI shows loading state while status = 'pending'.
// ------------------------------------------------------------------
export const candidateCvAnalysis = pgTable(
  "candidate_cv_analysis",
  {
    id: serial("id").primaryKey(),
    candidateId: integer("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    // denormalised from candidates.jobId for convenient querying
    jobId: integer("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),

    // (matchedSkills.length / jobSkills.length) * 100
    matchScore: numeric("match_score", {
      precision: 5,
      scale: 2,
    }).$type<number>(),

    // JSONB arrays of skill strings from job_skills
    // e.g. ["PostgreSQL", "Node.js"]
    matchedSkills: text("matched_skills").array(), // or jsonb if preferred
    missingSkills: text("missing_skills").array(),

    // raw PDF text — stored so re-scoring doesn't need to re-fetch from R2
    extractedText: text("extracted_text"),

    status: cvAnalysisStatus("status").notNull().default("pending"),

    // populated when status = 'failed'
    errorMessage: text("error_message"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  // one analysis record per candidate application
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
