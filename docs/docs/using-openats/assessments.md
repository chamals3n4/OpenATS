---
sidebar_position: 5
title: Assessments
---

# Assessments

OpenATS assessments give every candidate the same structured evaluation. Create an assessment, attach it to a stage in a job's hiring process, and let OpenATS invite candidates automatically when they reach that stage.

## Create an assessment

1. Open **Assessments** from the dashboard sidebar.
2. Select **New assessment**.
3. Enter an assessment title.
4. Add an optional description so candidates understand what the assessment covers.
5. Set the time limit in minutes.
6. Select **Save and continue**.

![Create a new assessment](/content/assessment/add-new-assessment.png)

The assessment editor opens after the basic details are saved. Add questions that measure the skills required for the role. OpenATS supports **Multiple Choice**, **Short Answer**, and **True/False** questions. For multiple-choice and true/false questions, mark the correct answer so the assessment can calculate a score.

Use **Add question** to add more questions, drag questions to change their order, and save when the assessment is ready.

![Add assessment questions](/content/assessment/adding-questions.png)

## Attach an assessment to a job stage

Create the assessment before attaching it to a job. Then:

1. Open **Manage Jobs**.
2. Select the job that should use the assessment.
3. Open the job's **Assessments** tab.
4. Select **Attach Assessment**.
5. Choose the assessment.
6. Choose the **Trigger Stage**, which is the stage a candidate must enter to receive the assessment.
7. Select **Attach assessment**.

![Attach an assessment to a hiring-process stage](/content/assessment/attaching-assessment-to-hiring-process.png)

The attached assessment appears in the job configuration with the stage that triggers it. You can remove the attachment later without deleting the assessment itself.

## Trigger the invitation

After the assessment is attached, open the job's **Hiring Pipeline** and move a candidate into the selected trigger stage. You can drag the candidate card to the stage in the pipeline, or change the stage from the candidate profile.

When the move is saved, OpenATS sends the assessment invitation automatically and shows an **Assessment invite sent** toast. If the candidate already has an active invitation, OpenATS keeps the existing link and does not send a duplicate email.

![Assessment invitation sent after a stage change](/content/assessment/assessment-invitation.png)

The candidate receives an email containing a private assessment link. They can select **Start Assessment** in the email to open the assessment. The link is unique to that candidate and should not be shared.

The candidate completes the questions within the configured time limit. When time expires, the assessment is submitted automatically. A candidate cannot complete an attempt after it has expired or already been submitted.

## Review a candidate's answers

After the candidate submits the assessment:

1. Open **Candidates** from the dashboard sidebar.
2. Select the candidate who completed the assessment.
3. Open the **Assessments** tab in the candidate profile.
4. Find the completed assessment and select **View candidate answers**.

The results view shows the candidate's responses and the calculated score. Use the answers together with the resume, interview feedback, and other hiring evidence when making a decision.

![Candidate assessment answers](/content/assessment/candidate-answer.png)

The candidate profile can show **Pending**, **In Progress**, **Completed**, or **Expired**. Results appear only after the candidate submits a completed attempt.

