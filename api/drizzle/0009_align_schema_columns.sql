-- Run with: cd api && pnpm exec drizzle-kit migrate
-- Fixes "Failed query" on candidates/offers when the DB predates newer columns or skipped migrations.

ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "rejection_notice_sent_at" timestamp;

ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "benefits_text" text;

CREATE TABLE IF NOT EXISTS "public_page_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"allowed_origins" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
