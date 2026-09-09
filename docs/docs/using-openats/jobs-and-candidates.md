---
sidebar_position: 3
title: Jobs and candidates
---

# Jobs and candidates

When someone applies for a published job, OpenATS creates a candidate record for that application. The record keeps the applicant's contact details, resume, answers, and recruitment activity together.

## Submit an application

You need at least one published job before you can test this flow.

1. Open `http://localhost:3000/careers` in a browser. This is the public careers page for your local OpenATS installation.
2. Review the published jobs and select the job you want to test.

   You can also open the dashboard, select **Manage Jobs**, open the job, and use the careers-page URL shown in the job header. That link takes you directly to the selected public job.

3. On the job page, select **Apply**.
4. Enter a test first name, last name, email address, and phone number.
5. Upload a resume if you want to test CV storage and analysis. Resume upload requires the Cloudflare R2 configuration described in the setup guide.
6. Answer the custom application questions, if the job has any.
7. Select **Submit application**.

![Job application form](/content/jobs-candidates/job-application.png)

Use a different email address for each test submission. OpenATS rejects a second application from the same email address for the same job.

After the submission succeeds, return to the dashboard and select **Candidates** in the sidebar. The new applicant appears in the list and is connected to the job they selected.

## Open the candidate profile

Select the candidate in the list to open their profile. The profile header shows the candidate's name, contact details, current status, and actions such as **View CV**, **Edit**, and **Delete**. Use **View CV** to open the uploaded resume without leaving the profile.

The profile tabs provide separate views of the information collected during recruitment.

## Candidate profile tabs

### Job Fit

The **Job Fit** tab compares the candidate's uploaded resume with the requirements of the job. When analysis is available, it shows the overall recommendation and the supporting areas, such as skills, experience, seniority, and certifications.

CV analysis runs as a separate background process. It may take a short time after the application is submitted, so the tab can initially show a pending state. You can leave the profile and return later; a slow analysis does not block the rest of the candidate record.

![Candidate profile after CV analysis](/content/jobs-candidates/candidate-profile-after-cv-analysis.png)

If no resume was uploaded, or if the analysis has not completed, the Job Fit tab explains why results are not available yet.

### Answers

The **Answers** tab shows the candidate's responses to the custom questions configured for the job. Text responses are shown with their question, and selected options are shown for checkbox or radio questions. If the application had no custom questions, the tab indicates that no answers were submitted.

### Stage History

The **Stage History** tab records each time the candidate's stage changed. It shows the stage name and the date and time of the change, with the most recent entry highlighted. This gives the team a timeline of the candidate's progress without requiring a separate spreadsheet.

### Offer

The **Offer** tab contains the candidate's offer when one exists. It can show the offer status, salary and pay frequency, start date, expiry date, sent date, and offer-letter preview. Draft offers can be reviewed and updated before they are sent.

### Interviews

The **Interviews** tab lists interviews connected to this candidate. Each entry can include the event name, interviewer, scheduled time, meeting or location details, status, and outcome. Use **Schedule** from this tab when you are ready to invite the candidate to an interview.

### Rejection

The **Rejection** tab records rejection actions and reasons for this candidate. When appropriate, the team can choose a rejection reason and decide whether to send a rejection email using an email template. Keeping the reason here makes the final decision clear to the hiring team.

### Send Email

The **Send Email** tab lets an authorized team member compose an email to the candidate. Enter a subject and message, send it, and review the messages recorded in the profile.

### Assessments

The **Assessments** tab shows assessment invitations and attempts associated with the candidate. It displays the current state, such as pending, in progress, completed, or expired. Select a completed attempt to review its questions, answers, and score details.

## Update candidate details

If an applicant's basic information is incorrect, use **Edit** in the profile header to update their name, email, phone number, or resume. Uploading a replacement resume replaces the current CV and can start a new analysis.

Use **Delete** only when the record should be permanently removed. If you need to keep the recruitment history, retain the candidate record and use the appropriate status or decision action instead.
