---
sidebar_position: 4
title: Templates
---

# Templates

Templates let your team prepare reusable messages and interview details once, then use them throughout recruitment. OpenATS has two template types:

- **Email**: messages sent to candidates, such as interview invitations, rejection messages, and offer emails.
- **Interview Event**: interview details, meeting settings, and proposed time slots used when scheduling an interview.

The selected type controls which builder opens and which predefined variables are available.

![Template types](/content/templates/template-type.png)

## Email templates

### Create an email template

1. Open **Templates** from the dashboard sidebar.
2. Select **New Template**.
3. Choose **Email**, then select **Continue**.
4. Enter a clear template name, such as `Interview invitation` or `Application rejected`.
5. Add the email subject.
6. Write the email body in the editor.
7. Review the live preview on the right side of the page.
8. Select **Save Template**.

![Create an email template](/content/templates/email-tempalte-creation.png)

The editor supports headings, bold and italic text, bullet and numbered lists, links, dividers, and buttons. Use a short subject and keep the message clear for the candidate who receives it.

### Insert predefined variables

Variables are replaced with the correct value when OpenATS sends the email. Do not type a candidate's details directly into a reusable template.

1. Place the cursor in the subject or body where the value should appear.
2. Select the **braces** button for the variable picker.
3. Search for a variable or choose one from the list.
4. Select the variable. OpenATS inserts it in the `{{variable_name}}` format.
5. Check the preview and save the template.

Available predefined variables include:

| Variable | Value inserted when sent |
| --- | --- |
| `{{candidate_name}}` | Candidate's full name |
| `{{job_title}}` | Job title connected to the candidate |
| `{{company_name}}` | Your company name |
| `{{start_date}}` | Offer start date |
| `{{salary}}` | Offer salary |
| `{{currency}}` | Offer currency |
| `{{employment_type}}` | Employment type for the offer |
| `{{reporting_manager}}` | Reporting manager in the offer |
| `{{benefits}}` | Benefits included in the offer |
| `{{offer_review_url}}` | Candidate's private offer-review link |

Some variables only have a value in the workflow where they apply. For example, offer variables are populated for an offer email, while an interview invitation should normally use `candidate_name` and `job_title`.

You can also type `/` in the email body to open the editor commands and insert headings, lists, buttons, dividers, or variables. Use the variable picker when possible so the spelling and braces are correct.

### Edit, preview, and reuse a template

Select an existing template from the Templates list to open it. Save changes with **Save Changes**. Use the preview panel to check the subject, spacing, links, and variable placement before using the template in a candidate workflow.

Email templates are selected where an email is sent, including candidate communication, rejection messages, interview invitations, and offers. Creating a template does not send an email by itself.

## Interview Event templates

An **Interview Event** template stores the details used to schedule a particular kind of interview. It can include the event name, description, event type, meeting settings, location, and proposed time slots.

### Create an Interview Event template

1. Open **Templates** from the dashboard sidebar.
2. Select **New Template**.
3. Choose **Interview Event**, then select **Continue**.
4. Enter the template name, such as `Technical interview`.
5. Add an optional description for the hiring team.
6. Choose the **Event Type**:
   - **Virtual** for a video interview.
   - **On-site** for an in-person interview.
7. For a virtual event, choose one **Meeting Link** option:
   - **Auto-generate Google Meet** creates a Meet link from the assigned interviewer's connected Google account when the interview is scheduled.
   - **Paste a link** lets you save a Zoom, Microsoft Teams, Meet, or other meeting URL in the template.
8. For an on-site event, enter the office address, building, room, or floor in **Location**.
9. Add one or more future **Time Slots**. Candidates choose one of these slots when they receive the interview invitation. Use **Add slot** for additional choices and remove unused slots with the delete action.
10. Select **Save Template**.

![Create an Interview Event template](/content/templates/event-templat.png)

The saved event template can be selected while scheduling an interview. The scheduler loads its event type, meeting or location details, message, and future slots so the hiring team does not have to enter them again for every candidate. You can still adjust the details before sending an invitation.

For automatic Google Meet links, the interviewer must have Google Calendar connected in **Settings → Integrations**. If no connection is available, use **Paste a link** and provide the meeting URL manually.
