ALTER TYPE "public"."template_type" ADD VALUE 'event';--> statement-breakpoint
ALTER TABLE "candidate_interviews" ADD COLUMN "event_name" varchar(255);--> statement-breakpoint
ALTER TABLE "candidate_interviews" ADD COLUMN "event_type" varchar(20) DEFAULT 'virtual';--> statement-breakpoint
ALTER TABLE "candidate_interviews" ADD COLUMN "meeting_url" varchar(1000);--> statement-breakpoint
ALTER TABLE "candidate_interviews" ADD COLUMN "body_text" text;--> statement-breakpoint
ALTER TABLE "candidate_interviews" ADD COLUMN "time_slots" jsonb;--> statement-breakpoint
ALTER TABLE "candidate_interviews" ADD COLUMN "status" varchar(30) DEFAULT 'pending_schedule' NOT NULL;--> statement-breakpoint
ALTER TABLE "candidate_interviews" ADD COLUMN "public_token" varchar(100);--> statement-breakpoint
ALTER TABLE "candidate_interviews" ADD CONSTRAINT "candidate_interviews_public_token_unique" UNIQUE("public_token");