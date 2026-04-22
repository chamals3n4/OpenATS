ALTER TYPE "public"."template_type" ADD VALUE 'offer_withdrawal' BEFORE 'rejection';--> statement-breakpoint
ALTER TYPE "public"."template_type" ADD VALUE 'assessment_completion' BEFORE 'general';--> statement-breakpoint
ALTER TYPE "public"."template_type" ADD VALUE 'interview_invite' BEFORE 'general';--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;