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

    slug: varchar("slug", { length: 255 }).notNull().unique(),

    title: varchar("title", { length: 255 }).notNull(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id),
    employmentType: employmentType("employment_type").notNull(),
    location: varchar("location", { length: 255 }),

    description: text("description"),

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

    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check(
      "chk_salary_range",
      sql`${t.salaryType} != 'range' OR (${t.salaryMin} IS NOT NULL AND ${t.salaryMax} IS NOT NULL)`,
    ),
    check(
      "chk_salary_fixed",
      sql`${t.salaryType} != 'fixed' OR ${t.salaryFixed} IS NOT NULL`,
    ),
    check(
      "chk_salary_currency",
      sql`${t.salaryType} IS NULL OR ${t.currency} IS NOT NULL`,
    ),
    check(
      "chk_salary_min_max",
      sql`${t.salaryMin} IS NULL OR ${t.salaryMax} IS NULL OR ${t.salaryMax} >= ${t.salaryMin}`,
    ),
  ],
);

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
