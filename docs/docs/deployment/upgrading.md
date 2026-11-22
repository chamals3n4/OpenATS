---
title: Upgrade OpenATS
sidebar_label: Upgrade
description: Upgrade an existing OpenATS installation to v1.0, with the extra steps needed when coming from v0.7 or earlier.
---

# Upgrade OpenATS

Before any upgrade, **back up your database** (see [Back up your data](./own-server#back-up-your-data)) and read the [release notes](https://github.com/chamals3n4/OpenATS/releases) of every version you skip.

## From v0.8

There are no database changes and no new required settings. Update the code, then run the normal update steps for your setup: [Your Own Server](./own-server#update-to-a-new-version) or [Render](./render).

## From v0.7

Do everything in [From v0.8](#from-v08), plus:

1. **Switch email to SMTP.** `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are gone. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` and `MAIL_FROM_NAME` in `backend/.env`. To keep using Resend, use its SMTP settings. Set the same values in `frontend/.env` for invite and password reset emails. See [Environment variables](../getting-started/environment-variables).
2. **Check `TRUST_PROXY`** if the API is not behind exactly one proxy. See [Tell the API about your proxy](./own-server#tell-the-api-about-your-proxy).
3. **Make sure the worker runs.** It's now required: it reads the text of every CV and deletes the files of removed candidates. On hosting without a second service, set `RUN_WORKER_IN_API=true`.
4. **Run the migrations**, then these one-off scripts from `backend/`, in this order:

   ```sh
   pnpm drizzle-kit migrate

   # Move CVs out of the public bucket, so old public CV links stop working
   pnpm tsx src/db/move-resumes-to-private-bucket.ts

   # Clean job descriptions saved before descriptions were cleaned on save
   pnpm tsx src/db/sanitize-job-descriptions.ts

   # Read the text of CVs uploaded before CV search existed (the worker must be running)
   pnpm tsx src/db/backfill-cv-text.ts
   ```

   `R2_PRIVATE_BUCKET_NAME` must be set, and must be a different bucket from `R2_BUCKET_NAME`, before you move the CVs. Each script is safe to run again.

## From v0.6

v0.7 replaced Asgardeo with built-in sign-in, which changes both apps and the database. Upgrade to [v0.7.0](https://github.com/chamals3n4/OpenATS/releases/tag/v0.7.0) first and follow its release notes. Then follow [From v0.7](#from-v07).
