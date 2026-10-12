CREATE TYPE "public"."cv_text_status" AS ENUM('pending', 'done', 'empty', 'failed');--> statement-breakpoint
CREATE TABLE "candidate_cv_text" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"resume_url" varchar(1000) NOT NULL,
	"status" "cv_text_status" DEFAULT 'pending' NOT NULL,
	"method" varchar(10),
	"file_type" varchar(10),
	"text" text,
	"search_text" text,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce("candidate_cv_text"."search_text", ''))) STORED,
	"page_count" integer,
	"char_count" integer,
	"extractor_version" integer DEFAULT 1 NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_cv_text_candidate_id_unique" UNIQUE("candidate_id")
);
--> statement-breakpoint
ALTER TABLE "candidate_cv_text" ADD CONSTRAINT "candidate_cv_text_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_candidate_cv_text_search" ON "candidate_cv_text" USING gin ("search_vector");