---
sidebar_position: 4
title: Templates
---

# Templates

Templates hold wording and settings you reuse, so nobody types the same email or interview details twice. Open **Templates** from the dashboard sidebar. The page has two tabs:

| Tab | What is in it | Who uses it |
| --- | --- | --- |
| **Your templates** | Email templates and Interview Event templates that you create | A person picks one when rejecting, sending an offer, scheduling an interview or writing an email |
| **Automatic emails** | The emails OpenATS sends by itself | Nobody picks these. OpenATS sends them at the right moment |

Hiring Managers and Super Admins can create and change templates. Interviewers can open them to read.

![Template types](/content/templates/template-type.png)

## Email templates

An email template is a subject and a message. It is used in three places:

- the email sent when you **reject** a candidate
- the **offer letter** a candidate reads when you send an offer
- as a starting point for a **manual email** to a candidate

### Create an email template

1. Open **Templates** and select **New Template**.
2. Choose **Email**, then **Continue**.
3. Enter a **Template name**. Only your team sees the name.
4. Enter the **Subject** and write the message.
5. Check the **Preview** on the right. It fills the variables with sample data.
6. Select **Save template**.

The editor supports bold and italic text, three heading sizes, bullet and numbered lists, links, dividers and buttons. Type `/` in the message to add any of these from the keyboard.

### Variables

A variable is a placeholder such as `{{candidate_name}}`. OpenATS replaces it with the real value when the email is sent. To add one, place the cursor where it should go and select **Variable**.

| Variable | Replaced with | Works in |
| --- | --- | --- |
| `{{candidate_name}}` | The candidate's full name | Any email |
| `{{job_title}}` | The job the candidate applied for | Any email |
| `{{company_name}}` | Your company name | Any email |
| `{{employment_type}}` | The employment type | Any email |
| `{{start_date}}` | The start date in the offer | Offer letters only |
| `{{salary}}` | The salary in the offer | Offer letters only |
| `{{currency}}` | The currency of the salary | Offer letters only |
| `{{reporting_manager}}` | The reporting manager in the offer | Offer letters only |
| `{{benefits}}` | The benefits in the offer | Offer letters only |
| `{{offer_review_url}}` | The candidate's private link to the offer | Offer letters only |

The offer-only variables have a value only when an offer is sent. If a template that uses one is chosen for a rejection, OpenATS refuses to send it and names the variable, so a candidate never receives an email with a gap in it.

## Interview Event templates

An Interview Event template describes one kind of interview, for example "Technical interview". It does **not** hold dates. You choose the times each time you schedule an interview.

| Setting | What it is |
| --- | --- |
| **Event name** | The title of the interview. Candidates see it |
| **Length** | How long the interview lasts, from 15 minutes to 2 hours |
| **Note for your team** | An optional note. Candidates do not see it |
| **Virtual** or **On-site** | A video call, or in person at an address |
| **Meeting link** | For a virtual interview: **Google Meet** (a new link for each interview) or **My own link** (Zoom, Teams or any other link) |
| **Address** | For an on-site interview |
| **Message to the candidate** | Optional. Sent in the email that asks the candidate to pick a time |

### Create an Interview Event template

1. Open **Templates** and select **New Template**.
2. Choose **Interview Event**, then **Continue**.
3. Fill in the settings above.
4. Check the **Preview**, which shows what the candidate will see.
5. Select **Save template**.

If you leave **Message to the candidate** empty, the automatic "Interview: pick a time" email is sent with its usual wording.

A Google Meet link can only be created for an interviewer who has connected their Google account. See [Interviews and feedback](./interviews#google-calendar-and-google-meet).

## Automatic emails

OpenATS sends these emails by itself. Each has built-in wording, so they work without any setup.

| Email | Sent when |
| --- | --- |
| **Application received** | A candidate applies |
| **Assessment invite** | A candidate reaches a stage that has an assessment |
| **Assessment completed** | A candidate hands in an assessment |
| **Interview: pick a time** | You schedule an interview and let the candidate choose a time |
| **Interview confirmed** | The interview gets its time |
| **Interview cancelled** | You cancel an interview the candidate had confirmed |
| **Offer** | You send an offer. It links to the offer letter |

### Change the wording

1. Open **Templates** and select the **Automatic emails** tab.
2. Select **Edit** next to an email.
3. Change the subject or the message. The variable list shows only what that email can fill in.
4. Select **Save changes**.

An email you have changed is marked **Edited**. To go back to the built-in wording, open it and select **Reset to default**.

Only the subject and the message can be changed. OpenATS adds the details, such as the date and address, and the buttons, such as **Choose a time**, when it sends the email. This means a link the candidate needs can never be removed by mistake.

## How emails look and where they are kept

Every email to a candidate uses the same design, with your company name at the top.

Every email is also saved in the candidate's **Email** tab, whether a person wrote it or OpenATS sent it. An email the mail provider did not accept is marked **Not delivered**.
