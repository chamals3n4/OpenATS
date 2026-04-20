ALTER TYPE "public"."template_type" ADD VALUE IF NOT EXISTS 'assessment_completion';--> statement-breakpoint
ALTER TYPE "public"."template_type" ADD VALUE IF NOT EXISTS 'interview_invite';--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "is_default" boolean DEFAULT false NOT NULL;