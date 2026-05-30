ALTER TABLE "templates" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."template_type";--> statement-breakpoint
CREATE TYPE "public"."template_type" AS ENUM('email', 'event');--> statement-breakpoint
ALTER TABLE "templates" ALTER COLUMN "type" SET DATA TYPE "public"."template_type" USING "type"::"public"."template_type";