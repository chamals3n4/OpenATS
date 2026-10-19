CREATE TABLE "assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"resources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submission_fields" jsonb DEFAULT '[{"id":"link","label":"Link to your work","type":"link","required":true,"hint":"A repository or a live demo"},{"id":"notes","label":"Notes","type":"long_text","required":false,"hint":"Anything we should know, such as how to run it"}]'::jsonb NOT NULL,
	"due_days" integer DEFAULT 7 NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"assignment_id" integer NOT NULL,
	"token" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"due_at" timestamp NOT NULL,
	"submitted_at" timestamp,
	"submission_fields" jsonb NOT NULL,
	"submission_answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_assignments_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "job_assignment_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"assignment_id" integer NOT NULL,
	"trigger_stage_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "job_assignment_attachments_job_id_trigger_stage_id_unique" UNIQUE("job_id","trigger_stage_id")
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_assignments" ADD CONSTRAINT "candidate_assignments_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_assignments" ADD CONSTRAINT "candidate_assignments_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_assignment_attachments" ADD CONSTRAINT "job_assignment_attachments_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_assignment_attachments" ADD CONSTRAINT "job_assignment_attachments_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_assignment_attachments" ADD CONSTRAINT "job_assignment_attachments_trigger_stage_id_job_pipeline_stages_id_fk" FOREIGN KEY ("trigger_stage_id") REFERENCES "public"."job_pipeline_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_candidate_assignments_candidate_id" ON "candidate_assignments" USING btree ("candidate_id");