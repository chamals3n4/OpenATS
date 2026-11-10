import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  serial,
  text,
  uniqueIndex,
  timestamp,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import {
  paraformSyncStatus,
  paraformSyncTrigger,
} from "./enums";
import { candidates } from "./candidates";
import { jobs } from "./jobs";
import { users } from "./users";

/**
 * The installation's one connection to Paraform, made by a super admin. Unlike Google, which is
 * per interviewer, Paraform is a company account, so there is at most one row (`singleton`).
 */
export const paraformConnection = pgTable(
  "paraform_connection",
  {
    id: serial("id").primaryKey(),
    singleton: boolean("singleton").notNull().default(true).unique(),
    // Registered with Paraform's sign-in server on each connect (dynamic client registration).
    clientId: varchar("client_id", { length: 255 }).notNull(),
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    accountEmail: varchar("account_email", { length: 255 }),
    connectedBy: integer("connected_by").references(() => users.id, {
      onDelete: "set null",
    }),
    // Set when Paraform refuses the stored sign-in; cleared by connecting again.
    needsReconnect: boolean("needs_reconnect").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [check("paraform_connection_singleton", sql`${t.singleton}`)],
);

/** A Paraform role whose submissions are imported into an OpenATS job. One role, one job. */
export const paraformRoleLinks = pgTable("paraform_role_links", {
  id: serial("id").primaryKey(),
  paraformRoleId: varchar("paraform_role_id", { length: 255 })
    .notNull()
    .unique(),
  // As Paraform named the role when it was linked, so the list reads well while Paraform is down.
  paraformRoleTitle: varchar("paraform_role_title", { length: 255 }).notNull(),
  jobId: integer("job_id")
    .notNull()
    .unique()
    .references(() => jobs.id, { onDelete: "cascade" }),
  createdBy: integer("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Which Paraform submission became which candidate. The unique submission id is what keeps a
 * second sync from importing the same person twice.
 */
export const paraformCandidateLinks = pgTable(
  "paraform_candidate_links",
  {
    id: serial("id").primaryKey(),
    paraformSubmissionId: varchar("paraform_submission_id", { length: 255 })
      .notNull()
      .unique(),
    candidateId: integer("candidate_id")
      .notNull()
      .unique()
      .references(() => candidates.id, { onDelete: "cascade" }),
    roleLinkId: integer("role_link_id").references(() => paraformRoleLinks.id, {
      onDelete: "set null",
    }),
    // The recruiter's notes on why the candidate fits, as Paraform gave them.
    submissionNote: text("submission_note"),
    // The application on Paraform, where advance and reject decisions are made.
    paraformUrl: varchar("paraform_url", { length: 1000 }),
    importedAt: timestamp("imported_at").notNull().defaultNow(),
  },
  (t) => [index("idx_paraform_candidate_links_role_link_id").on(t.roleLinkId)],
);

/** One run of the sync, shown to admins as the sync log. */
export const paraformSyncRuns = pgTable(
  "paraform_sync_runs",
  {
    id: serial("id").primaryKey(),
    trigger: paraformSyncTrigger("trigger").notNull(),
    status: paraformSyncStatus("status").notNull().default("running"),
    candidatesImported: integer("candidates_imported").notNull().default(0),
    // Plain-language notes about single candidates the run could not handle. They name candidate
    // and submission ids, never a name or email: this row is kept after a candidate is deleted.
    problems: text("problems")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    // Why the whole run failed, in words an admin can act on.
    error: text("error"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    finishedAt: timestamp("finished_at"),
  },
  (t) => [
    index("idx_paraform_sync_runs_started_at").on(t.startedAt),
    // At most one run at a time, even with several workers: a second insert of a running row fails.
    uniqueIndex("uq_paraform_sync_runs_one_running")
      .on(t.status)
      .where(sql`${t.status} = 'running'`),
  ],
);

export type ParaformConnection = typeof paraformConnection.$inferSelect;
export type ParaformRoleLink = typeof paraformRoleLinks.$inferSelect;
export type ParaformCandidateLink = typeof paraformCandidateLinks.$inferSelect;
export type ParaformSyncRun = typeof paraformSyncRuns.$inferSelect;
