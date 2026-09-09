---
sidebar_position: 3
title: Hiring pipeline
---

# Hiring pipeline

Each job has its own hiring pipeline. The pipeline is created when the job is created, so you can review and adjust it before publishing the job or receiving applications.

## Open the pipeline for a job

1. Open **Manage Jobs** from the dashboard.
2. Select the job you created.
3. In the job header, select **Hiring Pipeline**.

The pipeline page shows the stages currently configured for that job. A new job starts with the stages provided by the organization's pipeline templates. The default installation includes **Screening**, **Screening Qualified**, **Screening Disqualified**, **Interviews**, **Shortlisted**, **Offer**, and **Hired**.

![Hiring pipeline for a job](/content/hiring-pipeline/hiring-pipeline.png)

## Stage types

Every stage has one of three types. The type describes the part of the hiring process the stage belongs to and enables the related automation.

- **Screening**: early application review and qualification stages.
- **Interview**: stages used while the team evaluates a candidate through interviews.
- **Offer**: stages used for offers and final hiring decisions.

The stage name is what your team sees. For example, you can create stages named **Technical screen** and **Hiring manager interview**, then assign them the Screening and Interview types respectively.

## Change the process

Hiring managers can add a stage, rename a stage, delete a stage that is no longer needed, and drag stages into a different order. Keep the order aligned with the decisions your team makes, then finish configuring the job before publishing it.

When candidates are later moved between stages, OpenATS records the change in their Stage History. Candidates are moved from the job's pipeline view by dragging their card to another stage, or from the stage control in their profile.

## Stage-based automation

The stage type provides the foundation for automation, while the job configuration decides what should happen at a specific stage.

### Assessments triggered by a stage

From the job's **Assessments** tab, a hiring manager can attach an assessment to one of the job's stages. When a candidate enters that trigger stage, OpenATS automatically creates or sends the assessment invitation. If the candidate already has an active invitation, OpenATS keeps the existing link instead of sending another one.

Assessment setup and question authoring are covered in the [Assessments guide](./assessments).

### Offers created at an offer stage

When a candidate enters a stage with the **Offer** type, OpenATS creates a draft offer for that candidate if one does not already exist. The hiring team can then complete and review the offer before sending it from the candidate's **Offer** tab.

Offer details and candidate responses are covered in the [Offers guide](./offers).

Configure the stages and any stage-based actions before publishing the job. This ensures that the process is ready when the first application arrives.
