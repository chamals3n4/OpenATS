-- Aligns the `offers.benefits` column name with the Drizzle schema.
-- Run with: cd api && pnpm exec drizzle-kit migrate

DO $$
DECLARE
  has_benefits boolean;
  has_benefits_text boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'offers'
      AND column_name = 'benefits'
  ) INTO has_benefits;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'offers'
      AND column_name = 'benefits_text'
  ) INTO has_benefits_text;

  IF has_benefits AND has_benefits_text THEN
    RAISE EXCEPTION
      'offers table has BOTH benefits and benefits_text columns. Manual data merge required before this migration can run.';
  ELSIF has_benefits_text AND NOT has_benefits THEN
    EXECUTE 'ALTER TABLE "offers" RENAME COLUMN "benefits_text" TO "benefits"';
  ELSIF NOT has_benefits AND NOT has_benefits_text THEN
    EXECUTE 'ALTER TABLE "offers" ADD COLUMN "benefits" text';
  END IF;
END $$;
