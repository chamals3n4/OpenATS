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

The assessment editor opens after the basic details are saved. Add questions that measure the skills the role needs.

| Question type | The candidate | How it is marked |
| --- | --- | --- |
| **Multiple Choice** | Picks one option | Automatically |
| **Multiple Select** | Picks every option that applies | Automatically, with part marks |
| **True / False** | Picks true or false | Automatically |
| **Short Answer** | Writes a few lines | By a person |
| **Long Answer** | Writes a longer answer | By a person |

Give each question its **points**. For the first three types, mark the correct answer or answers.

A Multiple Select question gives part marks: each correct option picked adds to the mark and each wrong one takes away, and the mark for a question never goes below zero.

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

The candidate receives the "Assessment invite" email with a private link. The link is unique to that candidate and should not be shared.

## What the candidate sees

1. **Before starting**: the assessment name, the position and your company, the number of questions, the time allowed, and a short list of rules. The time begins when they select **Start the assessment**.
2. **During the assessment**: one question at a time, with a clock at the top and a numbered list of all the questions. They can move between questions and change an answer until they submit.
3. **Before submitting**: a list of every question showing which are answered, then a final confirmation.

Things worth knowing:

- **The time limit is in minutes** and does not pause. When it runs out, the answers given so far are submitted automatically, and no more answers are accepted.
- **Answers are saved as the candidate goes.** If they reload the page or lose their connection, their answers are still there when they return.
- **An assessment can be taken once.** After it is submitted, nothing can be changed.

## Review a candidate's answers

After the candidate submits the assessment:

1. Open **Candidates** from the dashboard sidebar.
2. Select the candidate who completed the assessment.
3. Open the **Assessments** tab in the candidate profile.
4. Find the completed assessment and select **View candidate answers**.

The results view shows the candidate's answers and the score. Short Answer and Long Answer questions wait for a person to mark them: enter the points for each, and the score is completed once all of them are marked.

Use the result together with the CV, interview feedback and other evidence when making a decision. See [Candidate scoring](./candidate-scoring) for how the assessment counts towards a candidate's score.

![Candidate assessment answers](/content/assessment/candidate-answer.png)

The candidate profile can show **Pending**, **In Progress**, **Completed**, or **Expired**. Results appear only after the candidate submits a completed attempt.

