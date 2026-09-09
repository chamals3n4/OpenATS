---
sidebar_position: 2
title: Manage jobs
---

## Create a job

Jobs are the starting point for your hiring workflow. A job contains the role details, hiring team, pipeline, application questions, and candidates for one opening.

You need the **Super Admin** or **Hiring Manager** role to create a job.

1. Sign in to OpenATS.
2. In the left sidebar, select **Manage Jobs**.
3. Select **Create New Job**.

The form opens with the job saved as a draft until you publish it.

![The top section of the Create New Job form, including the title, department, employment type, skills, location, and description fields.](/content/manage-jobs/create-job-top-part.png)

### Enter the job details

Complete the fields in this order:

1. **Job Title**: enter the name candidates will see, such as `Software Engineering Intern`.
2. **Department**: choose the department responsible for this role. Departments are created in [Company setup](./first-login-and-company-setup).
3. **Employment Type**: choose **Full Time**, **Part Time**, **Contract**, **Internship**, or **Freelance**.
4. **Skills**: add the skills relevant to the role.
5. **Location**: enter a location, work arrangement, or both, such as `Colombo, Sri Lanka (Hybrid)`.
6. **Job Description**: write the role description. Use the editor toolbar for headings, bold text, italic text, bulleted lists, and numbered lists.

Job title, department, and employment type are required before **Save Job** becomes available. Location, skills, and the description can be completed according to the role.

### Add skills

The Skills field works as a list of tags:

1. Click the Skills field.
2. Type one skill, for example `TypeScript`.
3. Press **Enter** to turn it into a skill tag.
4. Continue adding skills one at a time.
5. To remove a skill, select the **×** on its tag.

OpenATS ignores duplicate skill names. Add the technologies, methods, or qualifications you expect candidates to have so they are easy to identify on the job.

## Add salary information

Salary information is optional. In the **Salary Information** section, decide whether the salary should be shown with the job.

![The Salary Information section with the include option, salary type, currency, pay frequency, and fixed salary fields.](/content/manage-jobs/create-job-salary-section.png)

### Hide salary information

Clear **Include Salary Information** when you do not want to publish salary details. The salary fields are hidden and no salary value is saved for the job.

### Add a salary range

Leave **Include Salary Information** selected, choose **Salary Range**, then set:

- **Currency**: **USD**, **EUR**, or **LKR**.
- **Paid Every**: **Hourly**, **Monthly**, or **Yearly**.
- **Minimum Salary**: the lower value in the range.
- **Maximum Salary**: the upper value in the range.

### Add a fixed salary

Choose **Fixed Salary**, then set the currency, payment frequency, and **Enter Fixed Salary** value. Enter numbers with or without thousands separators, such as `60,000`.

Choose the salary option that communicates the role accurately. If the range or fixed value is left empty, the job can still be saved, but no salary value is included in the job details.

## Save the draft

Select **Save Job** at the bottom of the form. OpenATS creates the job as a **Draft** and opens its job page. A draft is visible to your hiring team but is not visible on the public careers page.

From the job page you can review the details and configure the parts of the hiring process that happen after creation.

## Configure the hiring process

Open the **Hiring Pipeline** tab on the job page.

![The Hiring Process tab showing the pipeline stages and controls for adding, editing, deleting, and reordering stages.](/content/manage-jobs/job-hiring-process.png)

In **Hiring Pipeline Stages** you can:

- Drag stages to change their order.
- Select **Add New Stage** to create a stage.
- Select **Edit** to rename a stage.
- Select **Delete** to remove a stage.

Use stages that reflect the decisions your team actually makes, such as Screening, Interviews, Shortlisted, Offer, and Hired. Candidates move through these stages as the team evaluates them.

## Add application questions

Open the **Custom Questions** tab to ask candidates for information during the application.

![The Custom Questions tab with the answer type menu and required option.](/content/manage-jobs/job-custom-questions.png)

1. Select **Add question**.
2. Choose an answer format: **Short Answer**, **Long Answer**, **Checkbox**, or **Radio Button**.
3. Enter the question candidates should answer.
4. Select **Required** when an answer must be provided.
5. Select **Add question** to save it.

Keep questions specific to the role. Avoid asking for information that is already collected in the candidate profile.

## Publish the job

When the job details and hiring process are ready, return to the job page and select **Publish Job**.

![A saved job in the job overview with the Publish Job button available.](/content/manage-jobs/job-after-publish.png)

Publishing changes the job from **Draft** to **Published**. Published jobs are visible on your public careers page and candidates can select **Apply** to submit an application.

After publishing, use the careers-page link shown in the job header to confirm that the public listing contains the correct title, location, salary, description, skills, and application questions.

![A published job displayed on the public careers page with its Apply button.](/content/manage-jobs/career-page.png)

If you need to make changes, open the job again, update its details, and save them. You can manage its visibility from the job page without deleting the job or its candidate history.
