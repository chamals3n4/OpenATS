---
title: Create Take-Home Assignments
sidebar_label: Create Assignments
description: Send candidates a take-home assignment in OpenATS. Write the brief, build a hand-in form, set a deadline, and send it by hand or from a pipeline stage.
keywords: [take-home assignment, candidate work sample, hiring task, recruitment assignment, OpenATS assignments]
---

# Create Take-Home Assignments

Sometimes the best way to judge someone is to see their real work. An assignment is a task they do in their own time, like "build a small job board". They get a private link, finish it by a deadline, and send you their work.

Not sure whether you want an assignment or an [assessment](./assessments)? An assessment is a timed test with questions, and the score feeds into the candidate's total. An assignment takes days rather than minutes, your team reads the result, and it doesn't count towards the score.

You'll need to be a Super Admin or Hiring Manager to create and send assignments.

## Write the assignment

1. Open **Assessments** in the sidebar, go to the **Assignments** tab, and select **New Assignment**.
2. Give it a **Title**, such as `Build a small job board`.
3. Write the **Brief and requirements**. Tell candidates what to build, what you'll be looking at, and roughly how long it should take. A clear brief gets you better work, and it's fairer on people who are fitting this in around a job.
4. Set **Days to hand in**, anywhere from 1 to 90. The default is 7, and the clock starts when you send it.
5. Add any **Resource links** they'll need, such as a data file or a design.
6. Build the **Hand-in form**. This is what candidates fill in when they're done. Each field can be a **Link**, a **Short answer** or a **Long answer**, and you can mark it as **Required**. You'll need at least one.
7. Check the preview on the right, which shows exactly what the candidate will see, then save.

{/* SCREENSHOT: assignments/create-assignment.png - The assignment form with the brief, days to hand in, resource links, hand-in form and live preview */}

Candidates can't upload files, so ask for a link to their work instead, such as a GitHub repository or a shared folder. Links must start with `http://` or `https://`.

## Send it to one candidate

Open the candidate, go to the **Assignments** tab, and select **Send an assignment**. Pick the assignment, then choose how to send it:

- **Send by email** shows you the email first. Nothing goes out until you select **Confirm and send**.
- **Get link only** gives you the private link to pass on yourself, say in a message. OpenATS doesn't email them.

{/* SCREENSHOT: assignments/send-assignment.png - The Send an assignment dialog with an assignment chosen */}

If they already have that assignment, OpenATS keeps the one they've got rather than sending another.

## Send it automatically from a stage

If everyone who reaches a certain stage should get the same task, let OpenATS send it for you.

1. Open the job and go to its **Assessments** tab.
2. Under **Automated assignments**, select **Attach assignment**.
3. Pick the assignment, and the stage under **Send when a candidate moves into**.

{/* SCREENSHOT: assignments/attach-to-stage.png - The Automated assignments section on a job, with one assignment attached to a stage */}

Now anyone you move into that stage gets it. Each stage can have one assignment. This is also how you send a task to lots of people at once: attach it to a stage, then [move them there together](./hiring-pipeline#move-many-candidates-at-once).

## What the candidate sees

They open the link from their email, with no account needed. They'll see your brief, the links and the deadline, and they fill in the form when they're ready.

{/* SCREENSHOT: assignments/candidate-view.png - The public assignment page with the brief and the hand-in form */}

They only get one go. Once they've handed in, the page shows what they sent and they can't change it. After the deadline, the link closes.

## Review their work

If you're working in OpenATS when someone hands in, a message pops up with a **View** button. Otherwise, open the candidate and go to their **Assignments** tab. It'll say **Handed in** with the date and their answers, or **Not handed in** if the deadline passed.

{/* SCREENSHOT: assignments/review-submission.png - The candidate's Assignments tab showing a handed-in assignment */}

## Changing an assignment later

Go ahead and edit an assignment whenever you like. People who've already received it keep the version they were sent, so nobody's task changes halfway through.

Be careful with deleting, though. It also deletes everything candidates handed in for that assignment, and you can't undo it.

## Next step

That's your hiring tools ready. Time to [create your first job](./manage-jobs).
