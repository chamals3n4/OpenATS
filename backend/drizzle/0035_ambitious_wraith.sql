ALTER TABLE "email_messages" ADD COLUMN "kind" varchar(40) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_messages" ADD COLUMN "status" varchar(10) DEFAULT 'sent' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_messages" ADD COLUMN "error_message" text;