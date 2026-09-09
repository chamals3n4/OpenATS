---
sidebar_position: 6
title: Interviews and feedback
---

# Interviews and feedback

OpenATS keeps the interview invitation, candidate-selected time, meeting details, interviewer, and feedback together on the candidate record.

## Before scheduling

Make sure these items are ready:

- The candidate exists for the job.
- The person who will conduct the interview has been added to the job's hiring team.
- An **Interview Event** template is available in **Templates**. The scheduler uses this template for the invitation details and time slots.
- For automatic Google Meet links, the selected interviewer has connected Google Calendar in **Settings → Integrations**.

### Who can do each action?

**Super Admins** and **Hiring Managers** can schedule, edit, cancel, and delete interviews. They select the interviewer when creating the event.

An **Interviewer** is the assigned participant who conducts the conversation and submits feedback. An interviewer does not schedule the event or change the candidate's hiring stage. Candidates do not need an OpenATS account.

## Connect Google Calendar

Google Calendar is optional. Connect it for the interviewer who should receive automatically created Google Meet events.

1. Open **Settings → Integrations**.
2. Find Google Calendar and select **Connect**.
3. Sign in with the interviewer's Google account and approve the requested calendar permissions.
4. Return to OpenATS and confirm that the integration shows as connected.

![Google Meet integration before connecting](/content/interviews/google-meet-integration.png)

After the connection succeeds, the card shows the connected account and a **Disconnect** action:

![Connected Google Meet integration](/content/interviews/connected-integration.png)

If the interviewer is not connected, choose **Paste a link** when scheduling and provide a Zoom, Microsoft Teams, or other meeting URL manually.

## Schedule an interview

1. Open **Candidates** from the dashboard sidebar.
2. Select the candidate you want to interview.
3. Open the **Interviews** tab in the candidate profile.
4. Select **Schedule**.
5. Choose an **Event Template**. The template supplies the event name, message, event type, meeting preference, and saved time slots.
6. Select the **Interviewer** who will conduct the interview.
7. Check the event name and invitation message, and update them if this interview needs different details.
8. Choose the event type:
   - **Virtual** for a video interview.
   - **On-site** for an in-person interview.
9. For a virtual interview, select **Auto-generate Google Meet** if the selected interviewer has a connected Google account. Otherwise select **Paste a link** and enter the meeting URL.
10. For an on-site interview, enter the office address, building, room, or floor.
11. Add at least one future time slot. Add multiple slots when you want the candidate to choose a convenient time.
12. Select **Schedule Interview**.

Every time slot must be in the future. A virtual interview must have either an automatically generated Google Meet link or a manually pasted meeting URL.

![Schedule an interview with Google Meet](/content/interviews/schedule-interview-with-gmeet.png)

OpenATS saves the interview as awaiting a slot and sends the candidate an email containing a private scheduling link.

![Interview invitation email](/content/interviews/interview-email.png)

## Candidate selects a time

The candidate opens the private link in the invitation and selects one of the available time slots. Past or already selected slots cannot be chosen.

![Candidate selects an interview time slot](/content/interviews/timeslot-selection-by-candidate.png)

After the candidate selects **Confirm this time**, OpenATS marks the interview as confirmed. The candidate receives the confirmation with the meeting link for a virtual event or the location for an on-site event.

![Interview confirmation with meeting link](/content/interviews/interview-confirmation-after-timeslot-select-with-link.png)

If Google Meet was enabled, the event and meeting link are created using the selected interviewer's connected Google account. With a manually pasted link, OpenATS includes that link in the confirmation.

## View and filter interviews

Open **Interviews** in the dashboard sidebar. Use **Calendar** view to see interviews by date, or switch to **List** view to review each interview in a grouped list. Search by candidate or job and filter by department or status.

The available statuses are:

- **Awaiting Slot**: the invitation was sent and the candidate has not selected a time.
- **Confirmed**: the candidate selected a time slot.
- **Completed**: the interview took place and was marked complete.
- **Cancelled**: the interview will not take place.

![Manage interviews](/content/interviews/manage-interviews-listing.png)

## Record interview feedback

After the conversation, the interviewer or another authorized team member can open the interview and select **Add feedback**. Record the notes and choose an outcome such as **Pass** or **Fail**. The feedback is stored with the interview and appears in the candidate profile for the hiring team.

If the event details change, use **Edit** to update the event name, meeting URL, status, outcome, or interviewer. Cancel an interview that will not happen. Keep the candidate record so the interview history remains available.

## What happens next

The hiring team can review the interview feedback from the candidate profile, then decide whether to keep the candidate in the current stage or move them to the next stage. Assessments and offers can be connected to later stages as described in the [Hiring pipeline](./hiring-pipeline), [Assessments](./assessments), and [Offers](./offers) guides.
