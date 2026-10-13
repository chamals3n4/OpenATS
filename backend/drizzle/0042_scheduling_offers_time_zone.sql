ALTER TABLE "company" ADD COLUMN "time_zone" varchar(64) DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
-- An interviewer cannot be in two interviews at once. The check in the application reads and then
-- writes, so two candidates picking the same slot at the same moment could both pass it; this makes
-- the database refuse the second one. It covers the whole length of each interview, so a 60 minute
-- interview at 10:00 also rules out 10:30. 60 is DEFAULT_INTERVIEW_MINUTES, for old rows with no
-- duration. Not in the Drizzle schema, which cannot describe an exclusion constraint.
--
-- If this statement fails, two scheduled interviews of one interviewer already overlap. Move or
-- cancel one of them and run the migrations again.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "candidate_interviews" ADD CONSTRAINT "candidate_interviews_no_overlap"
  EXCLUDE USING gist (
    "interviewer_id" WITH =,
    tsrange("scheduled_at", "scheduled_at" + make_interval(mins => COALESCE("duration_minutes", 60))) WITH &&
  )
  WHERE ("status" = 'scheduled' AND "interviewer_id" IS NOT NULL AND "scheduled_at" IS NOT NULL);
