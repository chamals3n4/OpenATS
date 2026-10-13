CREATE TABLE "resume_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resume_key" varchar(1000) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "resume_uploads_expires_at_idx" ON "resume_uploads" USING btree ("expires_at");