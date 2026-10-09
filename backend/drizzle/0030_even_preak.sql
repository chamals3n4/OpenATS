CREATE TYPE "public"."interview_recommendation" AS ENUM('strong_no', 'no', 'yes', 'strong_yes');--> statement-breakpoint
CREATE TABLE "candidate_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_ratings_candidate_id_user_id_unique" UNIQUE("candidate_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "interview_feedback_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"feedback_id" integer NOT NULL,
	"criterion_id" integer NOT NULL,
	"rating" integer NOT NULL,
	CONSTRAINT "interview_feedback_ratings_feedback_id_criterion_id_unique" UNIQUE("feedback_id","criterion_id")
);
--> statement-breakpoint
CREATE TABLE "job_scorecard_criteria" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "score_weight_questions" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "score_weight_assessment" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "score_weight_rating" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "score_weight_interview" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "job_assessment_attachments" ADD COLUMN "pass_mark" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "job_custom_question_options" ADD COLUMN "points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "job_custom_question_options" ADD COLUMN "is_knockout" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "questions_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "assessment_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "rating_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "interview_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "total_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "scored_parts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "knocked_out" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "assessment_passed" boolean;--> statement-breakpoint
ALTER TABLE "interview_feedback" ADD COLUMN "recommendation" "interview_recommendation";--> statement-breakpoint
ALTER TABLE "candidate_ratings" ADD CONSTRAINT "candidate_ratings_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_ratings" ADD CONSTRAINT "candidate_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_feedback_ratings" ADD CONSTRAINT "interview_feedback_ratings_feedback_id_interview_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."interview_feedback"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_feedback_ratings" ADD CONSTRAINT "interview_feedback_ratings_criterion_id_job_scorecard_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."job_scorecard_criteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_scorecard_criteria" ADD CONSTRAINT "job_scorecard_criteria_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_job_scorecard_criteria_job_id" ON "job_scorecard_criteria" USING btree ("job_id");--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "chk_score_weights" CHECK ("jobs"."score_weight_questions" BETWEEN 0 AND 100 AND "jobs"."score_weight_assessment" BETWEEN 0 AND 100 AND "jobs"."score_weight_rating" BETWEEN 0 AND 100 AND "jobs"."score_weight_interview" BETWEEN 0 AND 100);