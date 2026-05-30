DO $$ BEGIN CREATE TYPE "public"."candidate_status" AS ENUM('active', 'rejected', 'offered', 'hired', 'withdrawn'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."interview_outcome" AS ENUM('pending', 'pass', 'fail'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."rejection_email_status" AS ENUM('not_sent', 'draft', 'sent'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "candidate_rejections" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"job_id" integer NOT NULL,
	"from_stage_id" integer,
	"rejected_by" integer,
	"reason" varchar(255),
	"template_id" integer,
	"email_status" "rejection_email_status" DEFAULT 'not_sent' NOT NULL,
	"sent_at" timestamp,
	"rejected_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "candidate_interviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"stage_id" integer NOT NULL,
	"job_id" integer NOT NULL,
	"scheduled_at" timestamp,
	"duration_minutes" integer,
	"notes" text,
	"outcome" "interview_outcome" DEFAULT 'pending',
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_pipeline_stages" DROP CONSTRAINT IF EXISTS "job_pipeline_stages_offer_template_id_templates_id_fk";
--> statement-breakpoint
ALTER TABLE "job_pipeline_stages" DROP CONSTRAINT IF EXISTS "job_pipeline_stages_rejection_template_id_templates_id_fk";
--> statement-breakpoint
ALTER TABLE "job_pipeline_stages" ALTER COLUMN "stage_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "job_pipeline_stages" ALTER COLUMN "stage_type" SET DEFAULT 'screening'::text;--> statement-breakpoint
ALTER TABLE "pipeline_stage_templates" ALTER COLUMN "stage_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "pipeline_stage_templates" ALTER COLUMN "stage_type" SET DEFAULT 'screening'::text;--> statement-breakpoint
DO $$ BEGIN DROP TYPE "public"."stage_type"; EXCEPTION WHEN undefined_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."stage_type" AS ENUM('screening', 'interview', 'offer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
UPDATE "job_pipeline_stages" SET "stage_type" = 'screening' WHERE "stage_type" NOT IN ('screening', 'interview', 'offer');--> statement-breakpoint
UPDATE "pipeline_stage_templates" SET "stage_type" = 'screening' WHERE "stage_type" NOT IN ('screening', 'interview', 'offer');--> statement-breakpoint
ALTER TABLE "job_pipeline_stages" ALTER COLUMN "stage_type" SET DEFAULT 'screening'::"public"."stage_type";--> statement-breakpoint
ALTER TABLE "job_pipeline_stages" ALTER COLUMN "stage_type" SET DATA TYPE "public"."stage_type" USING "stage_type"::"public"."stage_type";--> statement-breakpoint
ALTER TABLE "pipeline_stage_templates" ALTER COLUMN "stage_type" SET DEFAULT 'screening'::"public"."stage_type";--> statement-breakpoint
ALTER TABLE "pipeline_stage_templates" ALTER COLUMN "stage_type" SET DATA TYPE "public"."stage_type" USING "stage_type"::"public"."stage_type";--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "status" "candidate_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "candidate_rejections" ADD CONSTRAINT "candidate_rejections_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "candidate_rejections" ADD CONSTRAINT "candidate_rejections_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "candidate_rejections" ADD CONSTRAINT "candidate_rejections_from_stage_id_job_pipeline_stages_id_fk" FOREIGN KEY ("from_stage_id") REFERENCES "public"."job_pipeline_stages"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "candidate_rejections" ADD CONSTRAINT "candidate_rejections_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "candidate_rejections" ADD CONSTRAINT "candidate_rejections_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "candidate_interviews" ADD CONSTRAINT "candidate_interviews_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "candidate_interviews" ADD CONSTRAINT "candidate_interviews_stage_id_job_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."job_pipeline_stages"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "candidate_interviews" ADD CONSTRAINT "candidate_interviews_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE restrict ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "candidate_interviews" ADD CONSTRAINT "candidate_interviews_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
ALTER TABLE "job_pipeline_stages" DROP COLUMN IF EXISTS "offer_template_id";--> statement-breakpoint
ALTER TABLE "job_pipeline_stages" DROP COLUMN IF EXISTS "offer_mode";--> statement-breakpoint
ALTER TABLE "job_pipeline_stages" DROP COLUMN IF EXISTS "offer_expiry_days";--> statement-breakpoint
ALTER TABLE "job_pipeline_stages" DROP COLUMN IF EXISTS "rejection_template_id";--> statement-breakpoint
ALTER TABLE "candidates" DROP COLUMN IF EXISTS "rejection_notice_sent_at";
