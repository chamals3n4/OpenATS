---
title: Import Candidates from Paraform
sidebar_label: Import from Paraform
description: Connect Paraform to OpenATS so candidates that outside recruiters submit land in the right job, with a link back to Paraform for your decisions.
keywords: [Paraform integration, recruiter submissions, agency candidates, hiring partner sync, OpenATS Paraform]
---

# Import Candidates from Paraform

If you hire through [Paraform](https://www.paraform.com), outside recruiters submit candidates to your roles there. OpenATS can bring those candidates straight into your jobs, so your team reviews everyone in one place.

There is one Paraform connection for the whole company. Only a Super Admin can see or change it.

## At a glance for hiring managers

- **Candidates arrive by themselves.** About every 15 minutes, new submissions to a linked Paraform role land in that job's first stage. Nobody adds them by hand.
- **They get no email from OpenATS.** The recruiter submitted them, so the usual "application received" email isn't sent.
- **Spot them by Open in Paraform** on the candidate's page. Paraform shares the CV's text, not the file, so read the full CV and the recruiter's note there.
- **Decide on Paraform.** Advance or reject with **Open in Paraform**. Moving a candidate between stages in OpenATS doesn't tell Paraform or the recruiter.
- **Missing someone?** A submission whose CV has no email address, or more than one, is skipped. A Super Admin sees why in the sync log and can add the candidate by hand.

The rest of this page is for the Super Admin who sets up the connection.

## Before you start

- **Paraform hiring-manager access.** Paraform turns on access for connected apps account by account. If you haven't got it yet, ask your Paraform contact to turn on hiring-manager access for the account you'll sign in with.
- **The background worker must be running.** The sync runs there. See [Environment Variables](../getting-started/environment-variables).
- **`API_PUBLIC_URL` must be set** on a real server. Paraform sends you back to this address after you sign in. See [Environment Variables](../getting-started/environment-variables#core).

You don't need to create an app in Paraform or copy any keys. OpenATS registers itself the first time you connect.

## Connect Paraform

1. Open **Settings → Integrations** and find **Hiring partners**.
2. Next to **Paraform**, select **Connect**.
3. Sign in to Paraform and approve the request. You'll come back to OpenATS, and Paraform shows as **Connected**, along with the account you signed in with.

If you see "Paraform hasn't given this account access for connected apps yet", you're signed in, but the account doesn't have hiring-manager access. Ask your Paraform contact to turn it on, then select **Check again**.

## Link roles to jobs

Under **Roles and jobs**, pick a **Paraform role** and the **Job** it should fill, then select **Link**. Each role links to one job, and each job to one role. Roles you don't link are left alone.

Each link shows how many candidates it has brought in so far. Select **Unlink** to stop importing for that role. Candidates already imported stay in the job.

## How candidates come in

Every 15 minutes, OpenATS checks each linked role for new submissions. Select **Sync now** if you don't want to wait.

- New candidates start in the job's **first stage**.
- They don't get the "application received" email, because a recruiter sent them in, not the candidate.
- OpenATS keeps the recruiter's note and the link to the application on Paraform. The candidate's page shows that link as **Open in Paraform**.
- Paraform doesn't share a candidate's email address or phone number. OpenATS reads them from the CV text Paraform sends. If the CV has no email address, or more than one, OpenATS can't tell which is the candidate's, so it skips the submission and says why in the sync log. Add that candidate by hand.
- Paraform's name is a single field, sometimes shortened (such as "Ada L."). OpenATS takes the last word as the last name.
- Only open submissions come in. Ones already rejected or hired on Paraform are left out.
- If someone has already applied to that job directly with the same email address, OpenATS links that application instead of adding them twice. Capital letters don't matter. If two candidates in the job have that email, differing only in capitals, OpenATS doesn't guess: it skips the submission and says so in the sync log.
- Each submission is imported once, however many times the sync runs.

Paraform doesn't send a CV file, so these candidates don't have one until you add it.

## Advance or reject on Paraform

OpenATS doesn't send your decisions to Paraform. To advance a candidate, Paraform asks the hiring manager how excited they are and whether to send an intro email. To reject one, it asks for their own reason and whether the candidate has been told. Those answers are yours to give, so make the decision on Paraform: select **Open in Paraform** on the candidate's page.

Moving a candidate between stages in OpenATS only changes OpenATS.

## Read the sync log

The log under the connection lists recent syncs, with how many candidates were imported and anything that went wrong, in plain words. For example, it tells you when a candidate was submitted to the same role twice, or when a linked job has no pipeline stages.

The log names candidates by number (such as "candidate #42") or by their Paraform submission id, never by name or email. It's kept after a candidate is deleted, and their details shouldn't stay behind in it.

Only one sync runs at a time. If you select **Sync now** while one is running, the next one picks up anything new.

## Reconnect or disconnect

If Paraform stops accepting the sign-in, the connection shows **Reconnect needed** and nothing syncs. Select **Reconnect** and sign in again. Your linked roles stay as they are.

A brief outage at Paraform is different. It fails only that sync, the log says you don't need to reconnect, and the next sync tries again.

Select **Disconnect** to stop syncing. Candidates already imported stay in their jobs, and your linked roles are kept for when you connect again.
