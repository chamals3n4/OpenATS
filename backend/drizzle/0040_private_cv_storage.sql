ALTER TABLE "candidate_cv_text" RENAME COLUMN "resume_url" TO "resume_key";--> statement-breakpoint
ALTER TABLE "candidates" RENAME COLUMN "resume_url" TO "resume_key";--> statement-breakpoint
-- The column used to hold the CV's public URL (https://files.example.com/resumes/<uuid>.pdf). It now
-- holds only the key of the file in the bucket (resumes/<uuid>.pdf). A value that is not one of our
-- files (the apply request used to accept any URL) is left as it is; it never could be opened.
UPDATE "candidates" SET "resume_key" = substring("resume_key" from 'resumes/[^/?#]+$') WHERE "resume_key" ~ '/resumes/[^/?#]+$';--> statement-breakpoint
UPDATE "candidate_cv_text" SET "resume_key" = substring("resume_key" from 'resumes/[^/?#]+$') WHERE "resume_key" ~ '/resumes/[^/?#]+$';
