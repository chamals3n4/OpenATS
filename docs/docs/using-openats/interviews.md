---
sidebar_position: 6
title: Interviews and Feedback
---

# Interviews and Feedback

OpenATS keeps the interview invitation, candidate-selected time, meeting details, interviewer, and feedback together on the candidate record.

## Before scheduling

Make sure these are ready:

- The candidate has applied for the job.
- The person who will run the interview is on the job's hiring team.
- An **Interview Event** template exists in [Templates](./templates#interview-event-templates). It supplies the type, the length, the link or address, and the message.

### Who can do what

**Super Admins** and **Hiring Managers** schedule, edit and cancel interviews, and choose the interviewer.

An **Interviewer** runs the interview and submits feedback. An interviewer cannot schedule an interview or move a candidate between stages. Candidates do not need an OpenATS account.

## Google Calendar and Google Meet

Google is optional. Each interviewer can connect their own Google account, and OpenATS then puts their interviews in their own Google Calendar.

Each interview gets **one** calendar event, created when the interview gets its time.

| The interviewer chosen for the interview | What happens |
| --- | --- |
| Has connected Google | The event goes in their calendar and the candidate is invited. A Google Meet link is added only if you chose Google Meet |
| Has not connected Google | No calendar event is created. The candidate is still emailed the details |

It depends on the **interviewer** chosen for that interview, not on the person who schedules it. A Google Meet link can only be created for an interviewer who has connected.

### Connect your Google account

1. Open **Settings → Integrations**.
2. Find **Google Meet** and select **Connect**.
3. Sign in to Google and approve the calendar permission.
4. Back in OpenATS, check that it shows **Connected**.

![Google Meet integration before connecting](/content/interviews/google-meet-integration.png)

![Connected Google Meet integration](/content/interviews/connected-integration.png)

Before anyone can connect, a server administrator must add the Google OAuth settings. See [Deployment](../operations/deployment#google-calendar-and-google-meet-optional).

## Schedule an interview

1. Open the candidate from **Candidates**.
2. Open the **Interviews** tab and select **Schedule interview**.
3. Choose an **Event template**. It fills in the type, the length, the link or address, and the message.
4. Choose the **Interviewer**. A hint under the field says whether the interview will be added to their calendar.
5. Check the **Length**, and the meeting link or address. You can change them for this interview.
6. Under **When**, choose who decides the time:
   - **Let the candidate choose**: add a few times. The candidate picks one.
   - **Set the time myself**: choose one date and time that you have already agreed.
7. Select **Send to candidate**, or **Book interview** if you set the time yourself.

Every time must be in the future. A virtual interview needs either Google Meet or a link you paste.

### If the candidate chooses

OpenATS sends the "Interview: pick a time" email with a private link. The interview shows as **Awaiting Slot** until they pick.

The candidate opens the link, sees the times you offered, and selects one. Times that have passed, or that another interview has taken, cannot be chosen.

An interviewer cannot be booked for two interviews that overlap. A 60 minute interview at 10:00 also rules out a 10:30 start, not only another interview at exactly 10:00. If two candidates choose the same time at the same moment, one gets it and the other is asked to pick another.

![Candidate selects an interview time slot](/content/interviews/timeslot-selection-by-candidate.png)

### If you set the time

The interview is booked at once. There is no link for the candidate to pick from. If the interviewer already has an interview that overlaps that time, OpenATS says so and nothing is booked.

### When the interview has its time

Either way, three things happen:

1. A Google Meet link is created, if you chose Google Meet.
2. A calendar event is created, if the interviewer has connected Google.
3. The candidate receives the "Interview confirmed" email with the date, the time, the length, and the link or address.

Dates and times in emails are written in the **company time zone**, with the zone named beside the time, for example `3:00 PM GMT+5:30 (Asia/Colombo)`. Set it under **Settings > General > Time zone**. Until it is set, emails use UTC.

## Change or cancel an interview

Use **Edit** to change the name, the meeting link, the status or the outcome.

Cancelling a confirmed interview removes the calendar event and sends the candidate the "Interview cancelled" email.

## View and filter interviews

Open **Interviews** in the dashboard sidebar. Search by candidate or job, and filter by department or status.

**Calendar** view shows a month.

- Select a day to list its interviews on the right. Today is selected when the page opens.
- Select the month name to jump to another month or year.
- Use the search box on the right to find an interview on any day.
- **Waiting for a time** lists interviews where the candidate has not picked a time yet.

**List** view shows every interview grouped by day, with the same details and actions.

| Status | Meaning |
| --- | --- |
| **Awaiting Slot** | The invitation was sent and the candidate has not picked a time |
| **Confirmed** | The interview has its time |
| **Completed** | The interview took place |
| **Cancelled** | The interview will not take place |

## Record interview feedback

After the conversation, the interviewer or another authorized team member can select **Feedback** on the interview, from either view on the Interviews page or from the candidate profile. Record the notes and choose an outcome such as **Pass** or **Fail**. The feedback is stored with the interview and appears in the candidate profile for the hiring team.

## What happens next

The hiring team can review the interview feedback from the candidate profile, then decide whether to keep the candidate in the current stage or move them to the next stage. Assessments and offers can be connected to later stages as described in the [Hiring pipeline](./hiring-pipeline), [Assessments](./assessments), and [Offers](./offers) guides.
