CREATE TABLE "company_google_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"connected_by" integer NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expiry_date" timestamp NOT NULL,
	"calendar_id" varchar(255) DEFAULT 'primary' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidate_interviews" ADD COLUMN "google_event_id" varchar(255);--> statement-breakpoint
ALTER TABLE "company_google_tokens" ADD CONSTRAINT "company_google_tokens_connected_by_users_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;