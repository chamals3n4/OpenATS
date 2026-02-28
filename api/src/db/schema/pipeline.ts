import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

import { offerMode, stageType } from "./enums";
import { jobs } from "./jobs";
import { templates } from "./templates";
import { users } from "./users";

// ------------------------------------------------------------------
// Pipeline Stage Templates
// Global default stages — copied into job_pipeline_stages on every
// new job creation. Changes here only affect future jobs.
// ------------------------------------------------------------------
export const pipelineStageTemplates = pgTable("pipeline_stage_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  // 1 = leftmost kanban column
  position: integer("position").notNull(),
  stageType: stageType("stage_type").notNull().default("none"),
  // FALSE = protected system stage (Applied, Rejected); cannot be deleted
  isDeletable: boolean("is_deletable").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ------------------------------------------------------------------
// Job Pipeline Stages
// Each job gets its own independent copy of the pipeline stages,
// seeded from pipelineStageTemplates at job creation time.
//
// ⚠️  Drizzle circular-import note:
//   This table references templates(id). templates has NO dependency
//   on pipeline, so the import direction is safe:
//     pipeline → templates  ✅
//     templates → pipeline  ❌ (never do this)
// ------------------------------------------------------------------
export const jobPipelineStages = pgTable(
  "job_pipeline_stages",
  {
    id: serial("id").primaryKey(),
    jobId: integer("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),

    // Copied from pipelineStageTemplates.name; can be renamed per-job
    name: varchar("name", { length: 100 }).notNull(),

    // 1 = leftmost column on THIS job's kanban board
    position: integer("position").notNull(),

    stageType: stageType("stage_type").notNull().default("none"),

    // ── Offer stage config (set only when stageType = 'offer') ────
    offerTemplateId: integer("offer_template_id").references(
      () => templates.id,
      { onDelete: "set null" },
    ),
    // auto_send only valid for fixed-salary jobs; app layer must guard this
    offerMode: offerMode("offer_mode"),
    // calendar days after sending before the offer expires
    offerExpiryDays: integer("offer_expiry_days"),
    // ──────────────────────────────────────────────────────────────

    // ── Rejection stage config (set only when stageType = 'rejection') ──
    rejectionTemplateId: integer("rejection_template_id").references(
      () => templates.id,
      { onDelete: "set null" },
    ),
    // ──────────────────────────────────────────────────────────────

    // Which global template stage this was seeded from.
    // NULL for custom stages added after job creation.
    sourceTemplateId: integer("source_template_id").references(
      () => pipelineStageTemplates.id,
      { onDelete: "set null" },
    ),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.jobId, t.position)],
);

// ------------------------------------------------------------------
// Job Hiring Team
// Users assigned to work on a specific job.
// The creating Hiring Manager is auto-inserted on job creation.
// ------------------------------------------------------------------
export const jobHiringTeam = pgTable(
  "job_hiring_team",
  {
    id: serial("id").primaryKey(),
    jobId: integer("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.jobId, t.userId)],
);

export type PipelineStageTemplate = typeof pipelineStageTemplates.$inferSelect;
export type NewPipelineStageTemplate =
  typeof pipelineStageTemplates.$inferInsert;

export type JobPipelineStage = typeof jobPipelineStages.$inferSelect;
export type NewJobPipelineStage = typeof jobPipelineStages.$inferInsert;

export type JobHiringTeam = typeof jobHiringTeam.$inferSelect;
export type NewJobHiringTeam = typeof jobHiringTeam.$inferInsert;
