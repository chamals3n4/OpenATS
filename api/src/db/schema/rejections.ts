import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { rejectionEmailStatus } from "./enums";
import { candidates } from "./candidates";
import { jobs } from "./jobs";
import { jobPipelineStages } from "./pipeline";
import { templates } from "./templates";
import { users } from "./users";

export const candidateRejections = pgTable("candidate_rejections", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "restrict" }),
  fromStageId: integer("from_stage_id").references(() => jobPipelineStages.id, {
    onDelete: "set null",
  }),
  rejectedBy: integer("rejected_by").references(() => users.id, {
    onDelete: "set null",
  }),
  reason: varchar("reason", { length: 255 }),
  internalNote: text("internal_note"),
  templateId: integer("template_id").references(() => templates.id, {
    onDelete: "set null",
  }),
  emailStatus: rejectionEmailStatus("email_status")
    .notNull()
    .default("not_sent"),
  sentAt: timestamp("sent_at"),
  rejectedAt: timestamp("rejected_at").notNull().defaultNow(),
});

export type CandidateRejection = typeof candidateRejections.$inferSelect;
export type NewCandidateRejection = typeof candidateRejections.$inferInsert;
