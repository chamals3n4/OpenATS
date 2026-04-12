/**
 * Applies safe IF NOT EXISTS schema fixes when `drizzle-kit migrate` cannot run
 * (e.g. stuck on an older migration or duplicate data blocking a unique index).
 *
 * Usage: cd api && node scripts/apply-schema-hotfix.mjs
 * Requires DATABASE_URL in api/.env or env.
 */
import "dotenv/config";
import pg from "pg";

const columnSql = `
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "rejection_notice_sent_at" timestamp;
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "benefits_text" text;
CREATE TABLE IF NOT EXISTS "public_page_settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "allowed_origins" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
`;

/** Drizzle 0010; DBs that skipped it cannot save interview_invite (etc.) templates. */
const templateTypeEnumSql = `
DO $enumfix$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public' AND t.typname = 'template_type'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public' AND t.typname = 'template_type' AND e.enumlabel = 'application_received'
    ) THEN
      EXECUTE 'ALTER TYPE "public"."template_type" ADD VALUE ''application_received''';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public' AND t.typname = 'template_type' AND e.enumlabel = 'assessment_completion'
    ) THEN
      EXECUTE 'ALTER TYPE "public"."template_type" ADD VALUE ''assessment_completion''';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public' AND t.typname = 'template_type' AND e.enumlabel = 'interview_invite'
    ) THEN
      EXECUTE 'ALTER TYPE "public"."template_type" ADD VALUE ''interview_invite''';
    END IF;
  END IF;
END
$enumfix$;
`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await pool.query(columnSql);
    await pool.query(templateTypeEnumSql);
    console.log("Schema hotfix applied successfully.");
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
