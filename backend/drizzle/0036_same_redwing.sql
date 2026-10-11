CREATE TABLE "system_email_templates" (
	"purpose" varchar(40) PRIMARY KEY NOT NULL,
	"subject" varchar(500) NOT NULL,
	"body_html" text NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "system_email_templates" ADD CONSTRAINT "system_email_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;