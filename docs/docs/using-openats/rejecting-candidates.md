---
sidebar_position: 8
title: Rejecting a candidate
---

# Rejecting a candidate

Rejecting a candidate records the decision, preserves the reason, and optionally sends a rejection email. Only **Super Admins** and **Hiring Managers** can reject or restore candidates.

## Reject a candidate

1. Open **Candidates** from the dashboard sidebar.
2. Select the candidate you want to reject.
3. Open the **Rejection** tab in the candidate profile.
4. Select **Reject Candidate**.
5. Choose a **Rejection Reason**. A reason is required.
6. Add an **Internal Note** if the hiring team needs additional context. This note is visible only to your team.
7. If you want to notify the candidate, enable **Send Rejection Email**.
8. Choose an email template. A template is required when sending an email.
9. Select **Confirm Reject**.

![Reject candidate dialog](/content/reject/image.png)

Available reasons include lack of required skills, insufficient experience, compensation mismatch, culture or team fit concerns, changed role requirements, candidate withdrawal, and Other.

## What happens after rejection

OpenATS changes the candidate status to **Rejected** and removes the candidate from the active stage in the job pipeline. The rejection record stores the reason, optional internal note, previous stage, person who made the decision, and email status.

If an email was enabled, OpenATS renders the selected email template with the candidate and job details, then sends it to the candidate. The Rejection tab shows whether the email was sent.

If you do not enable the email option, the decision is still recorded and no message is sent automatically. You can contact the candidate separately when appropriate.

## Review rejection history

Return to the candidate's **Rejection** tab to review previous rejection records, reasons, internal notes, and email status. This history remains available for the hiring team.

## Restore a rejected candidate

If the decision needs to be reversed, open the rejected candidate's **Rejection** tab and select **Unreject Candidate**. OpenATS restores the candidate to the stage they occupied before rejection, or to the first stage if that stage is no longer available, and changes the status back to active.
