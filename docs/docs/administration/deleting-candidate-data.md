---
title: Deleting Candidate Data
---

# Deleting Candidate Data

When a candidate asks for their data to be removed, delete their candidate record. This page lists what that removes, what it does not, and what you have to do yourself.

Only **Super Admins** and **Hiring Managers** can delete candidates. Deleting cannot be undone.

## How to delete

Open the candidate and select **Delete**. If the same person applied to several jobs, each application is a separate candidate record: search for their email address in **Candidates** and delete each one.

Deleting a job also deletes every candidate who applied to it.

## What is deleted

Everything OpenATS stores about the candidate:

- name, email address and phone number
- the CV file, the text read from it, and any AI analysis of it
- answers to application questions
- assessment attempts, answers and scores
- interviews, scorecards and ratings
- offers and rejection records
- the history of emails sent to them from OpenATS, including the text of each email
- the candidate's activity timeline, stage history and the team chat about them

The database records are removed immediately. The CV file is erased from storage by the background worker a moment later, so the worker has to be running. If storage cannot be reached, the worker keeps trying for most of a day and writes a `[resume-delete]` line to its log each time. If it gives up, the log line names the file so you can remove it by hand.

A CV that was uploaded on the careers page by someone who never sent the application is erased automatically about an hour after the upload.

## What is not deleted

OpenATS cannot reach these. Remove them yourself if the request covers them:

- **Emails already sent.** They are in the candidate's mailbox, in the sent items or inbox of anyone copied in, and in your email provider's own log (most SMTP providers keep a record of each email).
- **Calendar entries.** An interview that was added to an interviewer's Google Calendar stays there, with whatever details of the candidate it holds.
- **Backups.** A database backup made before the deletion still contains the candidate. The same goes for point-in-time recovery on a hosted database, and for backups or version history of the CV bucket. Old backups should expire on a schedule you can state.
- **Messages in a job's team chat** that mention the candidate by name. Only the chat on the candidate's own page is deleted.
- **Copies people made.** A CV that someone downloaded, printed or forwarded.

## Logs

Server logs record that an application arrived and that a candidate was deleted using the candidate's id and the job's id, not their name or email address. Keep log retention short all the same, since logs are not rewritten when a candidate is deleted.
