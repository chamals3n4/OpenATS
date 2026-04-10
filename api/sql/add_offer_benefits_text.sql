-- Run once against your Postgres DB (e.g. psql or GUI) after pulling this change.
ALTER TABLE offers ADD COLUMN IF NOT EXISTS benefits_text text;
