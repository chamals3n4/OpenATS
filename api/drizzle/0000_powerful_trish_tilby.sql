CREATE TYPE "public"."assessment_status" AS ENUM('pending', 'started', 'completed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."cv_analysis_status" AS ENUM('pending', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'contract', 'internship', 'freelance');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('draft', 'inactive', 'published', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."offer_mode" AS ENUM('auto_draft', 'auto_send');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('draft', 'sent', 'pending', 'accepted', 'declined', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."pay_frequency" AS ENUM('hourly', 'daily', 'weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('short_answer', 'long_answer', 'checkbox', 'radio', 'multiple_choice');--> statement-breakpoint
CREATE TYPE "public"."salary_type" AS ENUM('range', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."stage_type" AS ENUM('none', 'offer', 'rejection');--> statement-breakpoint
CREATE TYPE "public"."template_type" AS ENUM('offer', 'rejection', 'assessment_invite', 'general');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'hiring_manager', 'interviewer');--> statement-breakpoint
CREATE TABLE "company" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"website" varchar(500),
	"phone" varchar(50),
	"address" text,
	"description" text,
	"logo_url" varchar(1000),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "departments_company_id_name_unique" UNIQUE("company_id","name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"asgardeo_user_id" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"avatar_url" varchar(1000),
	"role" "user_role" DEFAULT 'interviewer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_asgardeo_user_id_unique" UNIQUE("asgardeo_user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "template_type" NOT NULL,
	"subject" varchar(500) NOT NULL,
	"body_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"skill" varchar(100) NOT NULL,
	CONSTRAINT "job_skills_job_id_skill_unique" UNIQUE("job_id","skill")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"department_id" integer NOT NULL,
	"employment_type" "employment_type" NOT NULL,
	"location" varchar(255),
	"description" text,
	"salary_type" "salary_type",
	"currency" varchar(3),
	"pay_frequency" "pay_frequency",
	"salary_fixed" numeric(12, 2),
	"salary_min" numeric(12, 2),
	"salary_max" numeric(12, 2),
	"status" "job_status" DEFAULT 'draft' NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_slug_unique" UNIQUE("slug"),
	CONSTRAINT "chk_salary_range" CHECK ("jobs"."salary_type" != 'range' OR ("jobs"."salary_min" IS NOT NULL AND "jobs"."salary_max" IS NOT NULL)),
	CONSTRAINT "chk_salary_fixed" CHECK ("jobs"."salary_type" != 'fixed' OR "jobs"."salary_fixed" IS NOT NULL),
	CONSTRAINT "chk_salary_currency" CHECK ("jobs"."salary_type" IS NULL OR "jobs"."currency" IS NOT NULL),
	CONSTRAINT "chk_salary_min_max" CHECK ("jobs"."salary_min" IS NULL OR "jobs"."salary_max" IS NULL OR "jobs"."salary_max" >= "jobs"."salary_min")
);
--> statement-breakpoint
CREATE TABLE "job_hiring_team" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "job_hiring_team_job_id_user_id_unique" UNIQUE("job_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "job_pipeline_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"position" integer NOT NULL,
	"stage_type" "stage_type" DEFAULT 'none' NOT NULL,
	"offer_template_id" integer,
	"offer_mode" "offer_mode",
	"offer_expiry_days" integer,
	"rejection_template_id" integer,
	"source_template_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "job_pipeline_stages_job_id_position_unique" UNIQUE("job_id","position")
);
--> statement-breakpoint
CREATE TABLE "pipeline_stage_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"position" integer NOT NULL,
	"stage_type" "stage_type" DEFAULT 'none' NOT NULL,
	"is_deletable" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pipeline_stage_templates_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "assessment_question_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_id" integer NOT NULL,
	"label" varchar(500) NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"assessment_id" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"question_type" "question_type" NOT NULL,
	"points" numeric(6, 2) DEFAULT 1 NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"time_limit" integer NOT NULL,
	"pass_score" numeric(5, 2) NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_assessment_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"assessment_id" integer NOT NULL,
	"trigger_stage_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "job_assessment_attachments_job_id_trigger_stage_id_unique" UNIQUE("job_id","trigger_stage_id")
);
--> statement-breakpoint
CREATE TABLE "job_custom_question_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_id" integer NOT NULL,
	"label" varchar(500) NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_custom_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"question_type" "question_type" NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_assessment_answer_selections" (
	"id" serial PRIMARY KEY NOT NULL,
	"answer_id" integer NOT NULL,
	"option_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_assessment_answer_selections_answer_id_option_id_unique" UNIQUE("answer_id","option_id")
);
--> statement-breakpoint
CREATE TABLE "candidate_assessment_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"attempt_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"answer_text" text,
	"points_earned" numeric(6, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_assessment_answers_attempt_id_question_id_unique" UNIQUE("attempt_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "candidate_assessment_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"assessment_id" integer NOT NULL,
	"token" varchar(255) NOT NULL,
	"status" "assessment_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"score_raw" numeric(8, 2),
	"score_total" numeric(8, 2),
	"score_percentage" numeric(5, 2),
	"passed" boolean,
	"candidate_name_input" varchar(255),
	"candidate_email_input" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_assessment_attempts_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "candidate_custom_answer_selections" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"option_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_custom_answer_selections_candidate_id_question_id_option_id_unique" UNIQUE("candidate_id","question_id","option_id")
);
--> statement-breakpoint
CREATE TABLE "candidate_custom_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"answer_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_custom_answers_candidate_id_question_id_unique" UNIQUE("candidate_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "candidate_cv_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"job_id" integer NOT NULL,
	"match_score" numeric(5, 2),
	"matched_skills" text[],
	"missing_skills" text[],
	"extracted_text" text,
	"status" "cv_analysis_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_cv_analysis_candidate_id_unique" UNIQUE("candidate_id")
);
--> statement-breakpoint
CREATE TABLE "candidate_stage_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"stage_id" integer NOT NULL,
	"moved_by" integer,
	"moved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"resume_url" varchar(1000),
	"job_id" integer NOT NULL,
	"current_stage_id" integer,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"job_id" integer NOT NULL,
	"template_id" integer,
	"status" "offer_status" DEFAULT 'draft' NOT NULL,
	"salary" numeric(12, 2),
	"currency" varchar(3),
	"pay_frequency" "pay_frequency",
	"start_date" date,
	"expiry_date" date,
	"rendered_html" text,
	"sent_at" timestamp,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"sent_by" integer,
	"template_id" integer,
	"subject" varchar(500) NOT NULL,
	"body_html" text NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"message" text,
	"reply_to_id" integer,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_hiring_team" ADD CONSTRAINT "job_hiring_team_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_hiring_team" ADD CONSTRAINT "job_hiring_team_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_pipeline_stages" ADD CONSTRAINT "job_pipeline_stages_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_pipeline_stages" ADD CONSTRAINT "job_pipeline_stages_offer_template_id_templates_id_fk" FOREIGN KEY ("offer_template_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_pipeline_stages" ADD CONSTRAINT "job_pipeline_stages_rejection_template_id_templates_id_fk" FOREIGN KEY ("rejection_template_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_pipeline_stages" ADD CONSTRAINT "job_pipeline_stages_source_template_id_pipeline_stage_templates_id_fk" FOREIGN KEY ("source_template_id") REFERENCES "public"."pipeline_stage_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_question_options" ADD CONSTRAINT "assessment_question_options_question_id_assessment_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."assessment_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_assessment_attachments" ADD CONSTRAINT "job_assessment_attachments_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_assessment_attachments" ADD CONSTRAINT "job_assessment_attachments_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_assessment_attachments" ADD CONSTRAINT "job_assessment_attachments_trigger_stage_id_job_pipeline_stages_id_fk" FOREIGN KEY ("trigger_stage_id") REFERENCES "public"."job_pipeline_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_custom_question_options" ADD CONSTRAINT "job_custom_question_options_question_id_job_custom_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."job_custom_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_custom_questions" ADD CONSTRAINT "job_custom_questions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_assessment_answer_selections" ADD CONSTRAINT "candidate_assessment_answer_selections_answer_id_candidate_assessment_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."candidate_assessment_answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_assessment_answer_selections" ADD CONSTRAINT "candidate_assessment_answer_selections_option_id_assessment_question_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."assessment_question_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_assessment_answers" ADD CONSTRAINT "candidate_assessment_answers_attempt_id_candidate_assessment_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."candidate_assessment_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_assessment_answers" ADD CONSTRAINT "candidate_assessment_answers_question_id_assessment_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."assessment_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_assessment_attempts" ADD CONSTRAINT "candidate_assessment_attempts_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_assessment_attempts" ADD CONSTRAINT "candidate_assessment_attempts_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_custom_answer_selections" ADD CONSTRAINT "candidate_custom_answer_selections_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_custom_answer_selections" ADD CONSTRAINT "candidate_custom_answer_selections_question_id_job_custom_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."job_custom_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_custom_answer_selections" ADD CONSTRAINT "candidate_custom_answer_selections_option_id_job_custom_question_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."job_custom_question_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_custom_answers" ADD CONSTRAINT "candidate_custom_answers_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_custom_answers" ADD CONSTRAINT "candidate_custom_answers_question_id_job_custom_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."job_custom_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_cv_analysis" ADD CONSTRAINT "candidate_cv_analysis_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_cv_analysis" ADD CONSTRAINT "candidate_cv_analysis_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_stage_history" ADD CONSTRAINT "candidate_stage_history_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_stage_history" ADD CONSTRAINT "candidate_stage_history_stage_id_job_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."job_pipeline_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_stage_history" ADD CONSTRAINT "candidate_stage_history_moved_by_users_id_fk" FOREIGN KEY ("moved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_current_stage_id_job_pipeline_stages_id_fk" FOREIGN KEY ("current_stage_id") REFERENCES "public"."job_pipeline_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_chat_messages" ADD CONSTRAINT "job_chat_messages_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_chat_messages" ADD CONSTRAINT "job_chat_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_chat_messages" ADD CONSTRAINT "job_chat_messages_reply_to_id_job_chat_messages_id_fk" FOREIGN KEY ("reply_to_id") REFERENCES "public"."job_chat_messages"("id") ON DELETE set null ON UPDATE no action;