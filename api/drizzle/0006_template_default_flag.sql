ALTER TABLE "templates"
  ADD COLUMN IF NOT EXISTS "is_default" boolean NOT NULL DEFAULT false;
