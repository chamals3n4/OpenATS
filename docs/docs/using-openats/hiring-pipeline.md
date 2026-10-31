---
sidebar_position: 3
title: Set Up the Hiring Pipeline
sidebar_label: Set Up the Hiring Pipeline
description: Set up the hiring stages for a job in OpenATS, move candidates on the pipeline board, filter by time in stage, and automate assessments and offers.
keywords: [hiring pipeline, recruitment stages, candidate pipeline board, kanban hiring, hiring automation]
---

# Set Up the Hiring Pipeline

Each job has its own hiring pipeline. The pipeline is created when the job is created, so you can review and adjust it before publishing the job or receiving applications.

## Open the pipeline for a job

1. Open **Manage Jobs** from the dashboard.
2. Select the job you created.
3. Select **Go to Hiring Pipeline** to open the board, or the **Hiring Process** tab to change the stages.

The **Hiring Process** tab shows the stages currently configured for that job. A new job starts with the stages provided by the organization's pipeline templates. The default installation includes **Screening**, **Screening Qualified**, **Screening Disqualified**, **Interviews**, **Shortlisted**, **Offer**, and **Hired**.

![Hiring pipeline for a job](/content/hiring-pipeline/hiring-pipeline.png)

## Stage types

Every stage has one of three types. The type describes the part of the hiring process the stage belongs to and enables the related automation.

- **Screening**: early application review and qualification stages.
- **Interview**: stages used while the team evaluates a candidate through interviews.
- **Offer**: stages used for offers and final hiring decisions.

The stage name is what your team sees. For example, you can create stages named **Technical screen** and **Hiring manager interview**, then assign them the Screening and Interview types respectively.

## Change the process

In the **Hiring Process** tab, hiring managers can select **Add stage**, edit a stage's name and type, delete a stage that is no longer needed, and drag stages into a different order. Keep the order aligned with the decisions your team makes, then finish configuring the job before publishing it.

## Work on the board

This is where you'll spend a lot of your time. Each stage is a column and each candidate is a card, so you can see where everyone is at a glance. Every move is saved in the candidate's **Stage History**.

{/* SCREENSHOT: hiring-pipeline/board.png - The pipeline board with candidates in several stages, showing scores on the cards */}

### Move a candidate

The quickest way is to drag their card to another column. You can also use **Move to** in the card's menu, or change the stage on their profile.

If the move will email them, for example because that stage sends an assessment, OpenATS checks with you first, since you can't take an email back.

### Move many candidates at once

Select the candidates on the board, then choose **Move to** in the bar that appears. Changed your mind? Press `Esc` to clear your selection.

{/* SCREENSHOT: hiring-pipeline/bulk-move.png - The board with three candidates selected and the Move to menu open */}

### Find people on the board

With a lot of candidates, the board gets busy. You can search by name or email, or narrow it down:

| Filter | Choices |
| --- | --- |
| **Stages shown** | All stages, or only the ones you pick |
| **Status** | Active, Offer made, Hired, Withdrawn |
| **Applied** | Last 7 days, Last 30 days, Over 30 days ago |
| **Time in stage** | 3+, 7+ or 14+ days. Great for spotting people who've been forgotten |

{/* SCREENSHOT: hiring-pipeline/board-filters.png - The board filter bar with Time in stage set to 7+ days */}

## Stage-based automation

The stage type provides the foundation for automation, while the job configuration decides what should happen at a specific stage.

### Assessments triggered by a stage

From the job's **Assessments** tab, a hiring manager can attach an assessment to one of the job's stages. When a candidate enters that trigger stage, OpenATS automatically creates or sends the assessment invitation. If the candidate already has an active invitation, OpenATS keeps the existing link instead of sending another one.

Assessment setup and question authoring are covered in the [Assessments guide](./assessments).

### Assignments triggered by a stage

A job's **Assessments** tab can also send a take-home task when a candidate enters a stage. See [Assignments](./assignments#send-it-automatically-from-a-stage).

### Offers created at an offer stage

When a candidate enters a stage with the **Offer** type, OpenATS creates a draft offer for that candidate if one does not already exist. The hiring team can then complete and review the offer before sending it from the candidate's **Offer** tab.

Offer details and candidate responses are covered in the [Offers guide](./offers).

Configure the stages and any stage-based actions before publishing the job. This ensures that the process is ready when the first application arrives.

## Next step

Your job is ready for applicants, so [share your careers page](../careers-page-integration).
