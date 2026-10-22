---
sidebar_position: 7
title: Offers and Hiring Decisions
---

# Offers and Hiring Decisions

When the team decides to hire a candidate, OpenATS helps you prepare an offer, send it through a private link, and record the candidate's response.

## Before creating an offer

Make sure:

- The candidate belongs to the correct job.
- The candidate has reached an **Offer** stage in that job's hiring pipeline.
- The offer details and offer letter content have been approved by the people responsible for the hire.
- An email template is available if you want to generate the offer letter from a reusable template.

Only **Super Admins** and **Hiring Managers** can create, edit, send, or delete offers.

## Move the candidate to an offer stage

1. Open **Manage Jobs** and select the job.
2. Select **Hiring Pipeline** in the job header.
3. Drag the selected candidate into a stage whose type is **Offer**, or open the candidate profile and change the stage there.
4. Save the stage change.

![Move a candidate to the Offer stage](/content/offer/move-candidate-to-offer.png)

When a candidate enters an Offer-type stage, OpenATS automatically creates a draft offer if the candidate does not already have one. The draft is not sent to the candidate until a hiring manager completes and sends it.

![Draft offer created after the stage change](/content/offer/offer-draft-create-after-move.png)

If an offer was not created automatically, open the candidate's **Offer** tab and select **Generate Offer** while the candidate is in an Offer-type stage.

## Complete the draft offer

1. Open **Candidates** and select the candidate.
2. Open the **Offer** tab.
3. Select **Edit** on the draft offer.
4. Optionally select an email template from **Template**.
5. Enter the **Salary** and **Currency**.
6. Select the **Employment Type**.
7. Enter the **Start Date**.
8. Optionally set **Respond by**, the last day the candidate can answer. The offer stays open for the whole of that day. Leave it empty for an offer with no end date.
9. Enter the **Reporting Manager**.
10. Add the **Benefits** included in the offer.
11. Enter or generate the **Offer Letter** content.
12. Select **Save Draft** while the offer is still being reviewed.

![Edit a draft offer with a template](/content/offer/editing-draft-offer-with-selectin-template.png)

To generate the letter from the selected template, select **Generate from template**. OpenATS renders the template with the candidate and offer details and places the result in the offer-letter editor. Review the rendered content before saving.

## Send the offer

Before sending, confirm that the draft contains all required fields: salary, currency, employment type, start date, reporting manager, benefits, and offer-letter content.

1. Select **Send Offer**.
2. Confirm that the success message says the offer was sent.
3. Open the candidate's **Offer** tab or **Manage Offers** to check the current status.

OpenATS sends the candidate an email with a private offer-review link. The link lets the candidate view the offer details and offer letter without signing in.

![Offer email sent to the candidate](/content/offer/offer-email.png)

An offer normally moves through these states:

- **Draft**: created but not sent.
- **Sent**: sent and waiting for the candidate.
- **Viewed**: the offer was shown on the candidate's screen. Opening the link is not enough, because email security scanners open links automatically; the status changes when the page is actually displayed in a browser.
- **Accepted**: the candidate accepted the offer.
- **Declined**: the candidate declined the offer.
- **Expired**: the **Respond by** date passed with no answer. The candidate can still open the link and read the offer, but can no longer accept or decline it.

## Candidate reviews the offer

The candidate opens the private link from the email and reviews the salary, employment type, start date, reporting manager, benefits, and offer letter. They can choose **Accept offer** or **Decline** while the offer is in a responseable state.

![Candidate offer acceptance screen](/content/offer/offer-accept-screen.png)

When a **Respond by** date is set, the candidate sees it above the buttons, in their own time zone.

After the candidate responds, the status is updated in OpenATS and the hiring team can see the response from the candidate profile or **Manage Offers**.

An offer can be answered once. If the candidate presses a button twice, or accepts in one tab and declines in another, only the first answer counts.

### After an answer, the offer is locked

Once an offer is **Accepted**, **Declined** or **Expired**, its salary, dates, benefits and letter can no longer be edited. They are the record of what the candidate was shown when they answered. To change the terms after that, agree them with the candidate outside OpenATS and record the outcome in the candidate's notes.

## Mark the candidate as hired

Acceptance and hiring are separate actions. After verifying the accepted offer:

1. Open the candidate's **Offer** tab.
2. Confirm that the offer status is **Accepted**.
3. Select **Mark as Hired**.

This updates the candidate's status to hired and records the final action in the candidate's history.

![Mark an accepted candidate as hired](/content/offer/after-accept-markashired.png)

If the candidate declines, keep the response in the offer record and move the candidate to the appropriate closed stage. Do not delete the candidate if you need to preserve the recruitment history.

