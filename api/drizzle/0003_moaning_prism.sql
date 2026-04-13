-- Idempotent: same column as 0002 (duplicate tag in history).
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "benefits" text;