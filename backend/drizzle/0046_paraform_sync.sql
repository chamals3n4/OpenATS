CREATE TYPE "public"."paraform_decision" AS ENUM('advance', 'reject');--> statement-breakpoint
CREATE TYPE "public"."paraform_sync_status" AS ENUM('running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."paraform_sync_trigger" AS ENUM('scheduled', 'manual');--> statement-breakpoint
CREATE TABLE "paraform_candidate_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"paraform_submission_id" varchar(255) NOT NULL,
	"candidate_id" integer NOT NULL,
	"role_link_id" integer,
	"recruiter_name" varchar(255),
	"submission_note" text,
	"paraform_url" varchar(1000),
	"decision_sent" "paraform_decision",
	"decision_sent_at" timestamp,
	"decision_error" text,
	"imported_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "paraform_candidate_links_paraform_submission_id_unique" UNIQUE("paraform_submission_id"),
	CONSTRAINT "paraform_candidate_links_candidate_id_unique" UNIQUE("candidate_id")
);
--> statement-breakpoint
CREATE TABLE "paraform_connection" (
	"id" serial PRIMARY KEY NOT NULL,
	"singleton" boolean DEFAULT true NOT NULL,
	"client_id" varchar(255) NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"account_email" varchar(255),
	"connected_by" integer,
	"send_decisions" boolean DEFAULT false NOT NULL,
	"needs_reconnect" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "paraform_connection_singleton_unique" UNIQUE("singleton"),
	CONSTRAINT "paraform_connection_singleton" CHECK ("paraform_connection"."singleton")
);
--> statement-breakpoint
CREATE TABLE "paraform_role_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"paraform_role_id" varchar(255) NOT NULL,
	"paraform_role_title" varchar(255) NOT NULL,
	"job_id" integer NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "paraform_role_links_paraform_role_id_unique" UNIQUE("paraform_role_id"),
	CONSTRAINT "paraform_role_links_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "paraform_sync_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"trigger" "paraform_sync_trigger" NOT NULL,
	"status" "paraform_sync_status" DEFAULT 'running' NOT NULL,
	"candidates_imported" integer DEFAULT 0 NOT NULL,
	"decisions_sent" integer DEFAULT 0 NOT NULL,
	"problems" text[] DEFAULT '{}'::text[] NOT NULL,
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "paraform_candidate_links" ADD CONSTRAINT "paraform_candidate_links_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paraform_candidate_links" ADD CONSTRAINT "paraform_candidate_links_role_link_id_paraform_role_links_id_fk" FOREIGN KEY ("role_link_id") REFERENCES "public"."paraform_role_links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paraform_connection" ADD CONSTRAINT "paraform_connection_connected_by_users_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paraform_role_links" ADD CONSTRAINT "paraform_role_links_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paraform_role_links" ADD CONSTRAINT "paraform_role_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_paraform_candidate_links_role_link_id" ON "paraform_candidate_links" USING btree ("role_link_id");--> statement-breakpoint
CREATE INDEX "idx_paraform_sync_runs_started_at" ON "paraform_sync_runs" USING btree ("started_at");