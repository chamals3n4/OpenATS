CREATE TYPE "public"."candidate_activity_type" AS ENUM('offer_created', 'offer_updated', 'offer_sent', 'offer_viewed', 'offer_accepted', 'offer_declined', 'candidate_hired');--> statement-breakpoint
CREATE TABLE "candidate_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"job_id" integer NOT NULL,
	"offer_id" integer,
	"stage_id" integer,
	"actor_id" integer,
	"event_type" "candidate_activity_type" NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "offers" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "offers" ALTER COLUMN "status" SET DEFAULT 'draft'::text;--> statement-breakpoint
DROP TYPE "public"."offer_status";--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired');--> statement-breakpoint
ALTER TABLE "offers" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."offer_status";--> statement-breakpoint
ALTER TABLE "offers" ALTER COLUMN "status" SET DATA TYPE "public"."offer_status" USING "status"::"public"."offer_status";--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "employment_type" "employment_type";--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "reporting_manager" varchar(255);--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "benefits" text;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "offer_letter_html" text;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "review_token" varchar(100);--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "viewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "declined_at" timestamp;--> statement-breakpoint
ALTER TABLE "candidate_activities" ADD CONSTRAINT "candidate_activities_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_activities" ADD CONSTRAINT "candidate_activities_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_activities" ADD CONSTRAINT "candidate_activities_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_activities" ADD CONSTRAINT "candidate_activities_stage_id_job_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."job_pipeline_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_activities" ADD CONSTRAINT "candidate_activities_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" DROP COLUMN "pay_frequency";--> statement-breakpoint
ALTER TABLE "offers" DROP COLUMN "expiry_date";--> statement-breakpoint
ALTER TABLE "offers" DROP COLUMN "rendered_html";--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_review_token_unique" UNIQUE("review_token");--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_candidate_id_job_id_unique" UNIQUE("candidate_id","job_id");