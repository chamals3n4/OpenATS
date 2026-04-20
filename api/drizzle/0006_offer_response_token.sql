-- 0006 — offer response token + withdrawal template type

-- unique token stored on the offer, embedded in the email links
-- so the candidate can accept/decline without an account
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "response_token" varchar(64);
CREATE UNIQUE INDEX IF NOT EXISTS "offers_response_token_idx" ON "offers" ("response_token");

-- allow "offer_withdrawal" as a template type
ALTER TYPE "template_type" ADD VALUE IF NOT EXISTS 'offer_withdrawal';
