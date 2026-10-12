ALTER TABLE "candidate_cv_text" ADD COLUMN "sections" jsonb;--> statement-breakpoint
ALTER TABLE "candidate_cv_text" ADD COLUMN "experience_years" numeric(4, 1);--> statement-breakpoint
ALTER TABLE "candidate_cv_text" ADD COLUMN "education_level" varchar(20);--> statement-breakpoint
ALTER TABLE "candidate_cv_text" ADD COLUMN "contacts" jsonb;