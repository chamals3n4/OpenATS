-- Run against your OpenATS DB if the column is not yet applied via Drizzle.
ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;
