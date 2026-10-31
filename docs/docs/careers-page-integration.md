---
sidebar_position: 2
sidebar_label: Share Your Careers Page
title: Share Your Careers Page
description: Publish OpenATS jobs on a public careers page or embed them in your own website.
---

# Share Your Careers Page

OpenATS can publish your open roles on a public careers page. Candidates do not need an OpenATS account to browse a role or submit an application. You can use the built-in page, or request the same published jobs from the public API and render them in your own website.

![Careers page settings](/content/careers-page/image.png)

## Before you begin

Complete the following first:

- Finish the [company setup](/docs/using-openats/first-login-and-company-setup) so the company name, logo, and description are available to candidates.
- Create a job and publish it from [Create and Publish a Job](/docs/using-openats/manage-jobs). Draft jobs are not listed publicly.
- Make sure the OpenATS frontend and backend can be reached from the website where candidates will apply.

Only Super Admins and Hiring Managers can change Careers page settings. Anyone can view the public careers page and apply for a published role.

## Use the built-in careers page

Open the public page at:

```text
http://localhost:3000/careers
```

Replace `http://localhost:3000` with your deployed frontend URL in a hosted environment. The page automatically shows:

- your company name, logo, and description from Settings > General;
- every published role, grouped by department when you have more than one;
- the employment type, location and age of each role;
- a search box; and
- department, job type and location filters, when there is more than one to choose from.

If your company description is long, it's shortened with a **See more** link.

Select a role to open its public details page. The candidate can review the description, requirements, benefits, salary information (when included), and application questions, then select **Apply**.

## Preview the listing

1. Sign in to OpenATS as a Super Admin or Hiring Manager.
2. Open **Settings > Careers Page**.
3. Under **Your careers page**, select **Open page**. Use the copy button to share the link.

This is the real page, so it's a good way to check your job looks right before you share the link. Draft jobs won't appear here.

## Control which websites can request jobs

The **Allowed origins** section limits which other websites can show your jobs and send applications from their own pages.

1. In **Settings > Careers page**, find **Allowed origins**.
2. Enter the origin of the website that will load OpenATS jobs, for example `https://careers.example.com` or `http://localhost:5173`.
3. Select **Add**. Add each separate website or development origin that needs access.
4. Remove an origin with its trash button, then select **Save origins**.

An origin contains the scheme, host, and optional port. Do not enter a page path such as `/jobs`. Leave the list empty to allow requests from all origins.

The careers page that OpenATS serves itself always works, whatever is on the list. You do not need to add your OpenATS address. A change can take up to 30 seconds to apply.

This setting stops other websites from embedding your jobs. It is not a security boundary: it relies on the origin a browser reports, and a request made without a browser (a script, `curl`) reports none and is let through. Everything behind it is already public: published jobs, their questions, and the application form. Abuse is held back by the rate limits, not by this list. If an embedded listing is blocked by the browser, check that the page's exact origin, including its port in development, is present in this list.

## Publish and unpublish roles

The careers page only returns jobs whose status is **Published**. To make a role visible:

1. Open **Manage Jobs** in the OpenATS sidebar.
2. Select the job and complete its details, hiring pipeline, and application questions.
3. Save the job, then select **Publish job** from the job page.
4. Open **Settings > Careers Page > Open page**, or visit `/careers`, and confirm that the role appears.

To remove a role from the public page, open the job and select **Deactivate** or **Close**. Existing candidate records are not deleted when a role is unpublished.

## Use the public API on a custom careers site

The public API requires no sign-in. Responses use the shape `{ "data": ... }`.

### List published jobs

```http
GET https://your-openats.example.com/api/public/jobs
```

This returns the published jobs that your careers site can list. Each job includes its id, title, employment type, location, department, and other public job fields.

### Get one published job

```http
GET https://your-openats.example.com/api/public/jobs/42
```

Replace `42` with the published job id. Use this response to build a job details page and display the public description, requirements, benefits, salary information, and application questions.

### Submit an application

Applications are submitted to the public job endpoint:

```http
POST https://your-openats.example.com/api/public/jobs/42/apply
```

Send the candidate's first name, last name, email, and phone, together with their answers to the job's custom questions:

```json
{
  "firstName": "Nimal",
  "lastName": "Fernando",
  "email": "nimal@example.com",
  "phone": "+94 77 123 4567",
  "resumeUploadId": "3f6c1c1e-8f0a-4a57-9a55-0d7a2f6f6b1c",
  "customAnswers": [
    { "questionId": 12, "answerText": "Five years" },
    { "questionId": 13, "optionIds": [41] }
  ]
}
```

- **Resume.** First send the PDF as the `file` field of a `multipart/form-data` request to `POST /api/public/upload/resume`. The reply holds an `uploadId`. Pass it as `resumeUploadId` when applying. It works once and for one hour; after that, upload the file again. The API never returns a link to the file.
- **Questions.** `GET /api/public/jobs/42/questions` lists the questions and their options. Every question with `"isRequired": true` must be answered, and each `optionIds` value must be one of that question's own options. Otherwise the application is refused with status 400 and a message naming the question.
- **Reply.** A successful application answers with status 201 and `{ "data": { "applied": true } }`. Nothing about the stored candidate is returned.

The API applies rate limits and rejects a duplicate application from the same email address for the same job (status 409, code `DUPLICATE_APPLICATION`).

After a successful submission, OpenATS creates the candidate record and places it at the opening stage of that job's hiring pipeline. Hiring teams can continue from **Candidates** in the dashboard.

## Add the ready-made embed

If you do not need a custom design, add this snippet to the page where the jobs should appear:

```html
<div id="openats-jobs"></div>
<script src="https://your-openats.example.com/embed.js"
        data-instance="https://your-openats.example.com"></script>
```

Replace both URLs with the public URL of your OpenATS frontend. The script fetches published jobs and renders a simple list. Selecting a job opens its OpenATS application page in a new tab. Add the host page's origin to **Allowed origins** when you use a restricted origin list.

The exact snippet for your current `NEXT_PUBLIC_APP_URL` is also available in **Settings > Careers page > Embed snippet**. Select **Copy** to avoid copying an outdated URL.

## Keep candidate applications moving

Candidates apply from the public role page, not from the dashboard. After they submit:

1. Open **Candidates** in OpenATS.
2. Select the new candidate to review the profile, resume, answers, and activity.
3. Move the candidate through the job's configured hiring pipeline. Assessments, interviews, feedback, offers, and rejection actions are handled from the candidate profile and pipeline.

See [Review Candidates](/docs/using-openats/jobs-and-candidates) for the candidate profile, and [Hiring pipeline](/docs/using-openats/hiring-pipeline) for stage transitions.

## Troubleshooting

**No jobs appear:** confirm that at least one job is published. Draft, closed, and archived jobs are not returned by the public endpoint.

**Company branding is missing:** update the company name, logo, and description in **Settings > General**, then refresh the careers page.

**The embed says it cannot load jobs:** verify `data-instance` points to the frontend URL, confirm the backend is running, and add the embedding website's exact origin to **Allowed origins**.

**A candidate cannot submit an application:** check that the job is still published, that required fields and questions are complete, and that the candidate is not submitting the same email twice for the same role.
