import {
  check,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { employmentType, jobStatus, payFrequency, salaryType } from "./enums";
import { departments } from "./company";
import { users } from "./users";

export const jobs = pgTable(
  "jobs",
  {
    id: serial("id").primaryKey(),

    // URL-safe identifier for internal links and public preview pages
    // e.g. "senior-backend-engineer-2024"
    slug: varchar("slug", { length: 255 }).notNull().unique(),

    title: varchar("title", { length: 255 }).notNull(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id),
    employmentType: employmentType("employment_type").notNull(),
    location: varchar("location", { length: 255 }),

    // HTML from the WYSIWYG editor
    description: text("description"),

    // ── Salary block ────────────────────────────────────────────────
    // NULL salaryType = no salary info disclosed
    // 'fixed'  → salaryFixed required
    // 'range'  → salaryMin + salaryMax required
    salaryType: salaryType("salary_type"),
    currency: varchar("currency", { length: 3 }), // ISO 4217 e.g. 'USD'
    payFrequency: payFrequency("pay_frequency"),
    salaryFixed: numeric("salary_fixed", {
      precision: 12,
      scale: 2,
    }).$type<number>(),
    salaryMin: numeric("salary_min", {
      precision: 12,
      scale: 2,
    }).$type<number>(),
    salaryMax: numeric("salary_max", {
      precision: 12,
      scale: 2,
    }).$type<number>(),
    // ────────────────────────────────────────────────────────────────

    status: jobStatus("status").notNull().default("draft"),

    // Hiring Manager who created the job; auto-added to job_hiring_team on creation
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    // salary_type = 'range'  → both min and max must be present
    check(
      "chk_salary_range",
      sql`${t.salaryType} != 'range' OR (${t.salaryMin} IS NOT NULL AND ${t.salaryMax} IS NOT NULL)`,
    ),
    // salary_type = 'fixed'  → salary_fixed must be present
    check(
      "chk_salary_fixed",
      sql`${t.salaryType} != 'fixed' OR ${t.salaryFixed} IS NOT NULL`,
    ),
    // any salary type requires a currency
    check(
      "chk_salary_currency",
      sql`${t.salaryType} IS NULL OR ${t.currency} IS NOT NULL`,
    ),
    // max must be >= min when both are provided
    check(
      "chk_salary_min_max",
      sql`${t.salaryMin} IS NULL OR ${t.salaryMax} IS NULL OR ${t.salaryMax} >= ${t.salaryMin}`,
    ),
  ],
);

// ------------------------------------------------------------------
// Job Skills
// Free-text skill tags per job. Also used by the CV analysis engine.
// ------------------------------------------------------------------
export const jobSkills = pgTable(
  "job_skills",
  {
    id: serial("id").primaryKey(),
    jobId: integer("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    skill: varchar("skill", { length: 100 }).notNull(),
  },
  (t) => [unique().on(t.jobId, t.skill)],
);

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

export type JobSkill = typeof jobSkills.$inferSelect;
export type NewJobSkill = typeof jobSkills.$inferInsert;
