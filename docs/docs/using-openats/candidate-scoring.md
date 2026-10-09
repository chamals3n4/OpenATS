---
sidebar_position: 5.5
title: Candidate scoring
---

# Candidate scoring

OpenATS gives every candidate a **score from 0 to 100**. The score helps you see, at a glance, who looks strongest, so you can open the best candidates first instead of reading every profile in order.

This page explains the whole system from start to finish: what goes into the score, who enters what, when it changes, and how to read it. You do not need any technical knowledge.

:::note The score helps you decide. It does not decide for you.
OpenATS never rejects, moves or hires anyone because of a score. People make those decisions. Use the score to **sort**, then read the candidate's answers, test results and interview notes before you decide.
:::

## The score in one minute

A candidate's score is built from **four parts**. Each part is worth up to 100 points, and each has a **weight** that says how much it matters for the job.

| Part | What it measures | Who or what provides it | Default weight |
| --- | --- | --- | --- |
| **Questions** | The answers to your application questions | The candidate, when they apply. Worked out **automatically**. | 30 |
| **Assessment** | The result of the test | The candidate, when they take the test. Mostly **automatic**. Written answers are marked by a person. | 30 |
| **Rating** | A first impression after reading the CV | Your team, with a 1 to 5 star rating | 10 |
| **Interview** | How the interview went | The interviewers, with a scorecard after the interview | 30 |

The **total score** is the average of the parts, counting the heavier parts more. Parts that have no result yet are simply left out. They are not counted as zero, with one exception: a test the candidate never opened (see [A test that runs out unused](#a-test-that-runs-out-unused)).

### The score fills in over time

A candidate does not have all four parts on day one. The score grows as they move through your process:

| Stage of the process | What gets added | Part that appears |
| --- | --- | --- |
| They apply | Their answers are scored | **Questions** |
| Your team reads the CV | Team members give stars | **Rating** |
| They take the test | The test is marked | **Assessment** |
| They are interviewed | Interviewers fill in scorecards | **Interview** |

:::tip
Because the score grows over time, the list always shows **how many parts the score is built from**, for example `3/4`. A score based on one part is a first impression. A score based on all four is much more reliable. See [Reading a score](#reading-a-score).
:::

## Part 1: Set up the job

Scoring is set up **per job**, so every role can be scored in its own way. Only **Super Admins** and **Hiring Managers** can change these settings.

After you create a job, OpenATS shows a green message with two shortcuts: **Add questions** and **Set up scoring**. You can also reach everything from the job's tabs.

| Tab on the job | What you set there |
| --- | --- |
| **Custom Questions** | The application questions, and points or knockouts for answers |
| **Assessments** | Which test to send, at which stage, and the pass mark |
| **Scoring** | How much each part matters, and the interview scorecard criteria |

You do not have to use everything. A job can use only the parts that make sense for the role. See [Using only some of the parts](#using-only-some-of-the-parts).

### Application questions with points

Open the job, go to **Custom Questions**, and add or edit a question.

Only **choice questions** can be scored: **Single choice** (the candidate picks one answer) and **Multiple choice** (the candidate can tick several). Typed answers, such as a short answer, long answer or a link, are saved so you can read them, but they cannot be scored, because the system has nothing fixed to compare them with.

For a choice question, use the **Score this question** switch:

| Switch | What it means |
| --- | --- |
| **Off** (the default) | The question is for information only. The answer is saved and shown on the candidate, but adds nothing to their score. |
| **On** | Every answer option gets a points box and a **Knockout** box. |

For each option you can set:

- **Points**: how many points the candidate earns for picking this option.
- **Knockout**: picking this option flags the candidate as "Does not meet requirements". Use it for answers that make someone unsuitable, such as "No, I cannot work on site" for an on-site role.

**Example: a single-choice question**

*"How many years of experience do you have?"*

| Option | Points | Knockout |
| --- | --- | --- |
| 0 to 1 years | 0 | Yes |
| 2 to 4 years | 5 | No |
| 5 or more years | 10 | No |

A candidate can pick only one option, so they earn that option's points.

**Example: a tick-any question**

*"Which of these do you know?"*

| Option | Points |
| --- | --- |
| Node.js | 4 |
| SQL | 4 |
| Docker | 2 |
| COBOL (not needed for this job) | -3 |

A candidate can tick several, and their points are added up. Notice the **negative points** on COBOL. Without them, a candidate could tick every box and get full marks. With them, a wrong tick costs points. Negative points can only be used on tick-any questions.

:::info Candidates never see the points
The application form shows only the question and the options. Applicants cannot see points, knockouts or which answers you prefer.
:::

### The assessment and its pass mark

Create the test and attach it to a stage as described in [Assessments](./assessments). Two scoring details are set there:

- **Points per question.** Each question in the test has a **Points** box. A harder question can be worth more.
- **Pass mark.** When you attach a test to a stage, you also set the **pass mark**, the percentage a candidate needs to pass. The default is 60%. You can change it later on the job's **Assessments** tab.

The test question types are:

| Type | How it is marked |
| --- | --- |
| **Multiple Choice** | Automatically. One correct answer. Right is full points, wrong is zero. |
| **True/False** | Automatically. Same as above. |
| **Multiple Select** | Automatically, with **partial credit**. Several answers are correct, and the candidate can tick several. |
| **Short Answer** | By a person. You decide the points when you read the answer. |
| **Long Answer** | By a person. You decide the points when you read the answer. |

### Weights and scorecard criteria

Open the job and go to the **Scoring** tab. It has two cards.

**Score weights.** This sets how much each part counts. You can start from a template and adjust it:

| Template | Questions | Assessment | Rating | Interview | Good for |
| --- | --- | --- | --- | --- | --- |
| **Balanced** (default) | 30 | 30 | 10 | 30 | Most roles |
| **Skills first** | 25 | 45 | 5 | 25 | Roles where a test says the most |
| **Interview led** | 15 | 15 | 10 | 60 | Roles where the conversation matters most |
| **Screening only** | 60 | 0 | 40 | 0 | Roles with no test and no interview stage |

Next to each part you see its **share**, the percentage of the total score it makes up. Weights do not have to add up to 100. Only their proportions matter, so 60 / 0 / 40 / 0 behaves exactly like 30 / 0 / 20 / 0.

**Interview scorecard.** This is the list of things interviewers will score, for example *Technical skill*, *Communication* and *Problem solving*. You can add up to 10. If you leave it empty, interviewers give one overall star rating instead.

:::tip
Click **Save weights** or **Save scorecard** after changing anything. Changing weights or points re-scores every candidate on the job.
:::

### Using only some of the parts

You do not need all four parts for every job.

| Your job | What to do |
| --- | --- |
| Only collecting information (GitHub link, portfolio, notice period) | Leave **Score this question** off. Set **Questions** to **0** on the Scoring tab. |
| No test for this role | Do not attach a test. Set **Assessment** to **0**. |
| No formal interview scoring | Leave the scorecard empty and set **Interview** to **0**. |
| Everything | Keep the defaults. |

A part with a weight of **0** is shown as "not used" on the candidate, and the other weights share its place. The parts count, such as `3/4`, then becomes `3/3`.

## Part 2: How each part is worked out

### Questions (automatic)

The score is created the moment a candidate applies, with nobody doing anything.

1. OpenATS looks only at **scored questions**, the ones with points on at least one option.
2. For each one, it works out the **most the question can give**:
   - Single choice: the points of the best option.
   - Tick-any: the points of all the positive options added together.
3. It adds up what the candidate **earned**. A question never scores below zero.
4. **Questions score = earned ÷ most possible × 100.**

**Example.** Using the two example questions above, the most possible is 10 (years of experience) + 10 (skills: 4 + 4 + 2) = 20 points.

| Candidate | Years | Skills ticked | Earned | Questions score |
| --- | --- | --- | --- | --- |
| Nimal | 5 or more (10) | Node.js, SQL (8) | 18 | 18 ÷ 20 = **90** |
| Kamal | 2 to 4 (5) | Node.js, SQL, Docker, COBOL (4 + 4 + 2 − 3 = 7) | 12 | 12 ÷ 20 = **60** |
| Sunil | 5 or more (10) | Only COBOL (−3, so zero) | 10 | 10 ÷ 20 = **50** |

If no question in the job has points, the **Questions part is left out** of the total.

**Knockouts.** If a candidate picks a knockout option, they are flagged **Does not meet requirements**. The flag does **not** change their score. See [Flags](#flags).

### Assessment (mostly automatic)

**Sending the test.** Nothing to do. When you move a candidate into the stage the test is attached to, they receive an email with a private link automatically. The link works for 7 days.

**Marking the test.** When the candidate submits, OpenATS marks it instantly:

- **Multiple Choice and True/False**: full points for the right answer, zero for a wrong one.
- **Multiple Select**: partial credit. Every correct tick earns an **equal share** of the points, and every wrong tick **removes one share**. The result never goes below zero.

**Example: a Multiple Select question worth 3 points**, with two correct answers (A and B) and two wrong ones (C and D):

| The candidate ticks | Working | Points |
| --- | --- | --- |
| A and B | Both correct | **3** |
| A only | One of two correct = half | **1.5** |
| A and C | One right, one wrong: 1 − 1 = 0 | **0** |
| C and D | Only wrong ones, never below zero | **0** |

- **Short and long answers are marked by a person.** After the candidate finishes, a reviewer opens the candidate's **Scores** tab, selects **View answers**, reads each written answer, and types the points to give (from 0 up to that question's points), then saves.

:::caution Written answers hold the score back
Until **every** written answer has been graded, the test has **no score and no pass or fail result**, and it is **left out of the total** so it does not drag the candidate down unfairly. The results view shows a notice saying how many answers are waiting. Once the last one is graded, the score appears and the total updates.

A **blank** written answer is simply worth 0 and does not wait for anyone.
:::

**Result and pass mark.**

| Test score | Pass mark | Result |
| --- | --- | --- |
| 75% | 60% | **Passed** |
| 55% | 60% | **Failed**. The candidate gets a "Failed assessment" flag. |

A failed test does **not** reject anyone. It only adds a flag so you can decide.

**More than one test.** A job can send several tests at different stages. Each test counts once, using the candidate's **latest** attempt, and the Assessment part is the **average** of them. If **any** of the tests was failed, the candidate is flagged as having failed the assessment. If the same test is attached at two stages with different pass marks, the **stricter (higher)** mark applies.

#### A test that runs out unused

If a candidate never opens the test and the link expires, that part is **not** left out. It counts as **0**, and the candidate is flagged **Assessment expired**. This is deliberate: otherwise a candidate could end up ahead of someone who took the test and scored badly, just by skipping it.

A test that is only **waiting** (the link is still valid, or the candidate has finished and a reviewer has not yet graded the written answers) is still left out. It turns into a 0 only after the link has actually expired. OpenATS checks for expired links about every 15 minutes.

### Rating (a person gives it)

This is for the first impression of the CV. Anyone on the team who can see the candidate can give one.

1. Open the candidate and select **View CV**. The **Job Fit** tab can also show an automatic CV analysis.
2. Open the **Scores** tab.
3. Under **Your rating**, click the stars. The stars change on screen right away, but **nothing is saved yet**.
4. Select **Update score** (top right of the Score card). This button is greyed out until you change something.
5. Click the same star again to clear your rating, then select **Update score** to save that.

Stars turn into points like this:

| Stars | Label shown | Rating points |
| --- | --- | --- |
| 1 | Poor | 0 |
| 2 | Below average | 25 |
| 3 | Average | 50 |
| 4 | Good | 75 |
| 5 | Excellent | 100 |

One star means "no", so it adds nothing. It does not still add a few points.

**Everyone has their own rating, and the part is the average.** If one person gives 4 stars (75) and another gives 5 stars (100), the Rating part is **87.5**. You only ever change your own stars.

### Interview (the interviewers give it)

After an interview, each interviewer fills in a **scorecard**.

1. Open the candidate and go to the **Interviews** tab.
2. On that interview's card, select **Add feedback**. The **Interview scorecard** window opens.
3. Give **1 to 5 stars for each criterion** you set up (for example Technical skill, Communication, Problem solving). If the job has no criteria, give one overall rating.
4. Choose a **recommendation**: *Strong no*, *No*, *Yes* or *Strong yes*.
5. Add notes about how it went, then select **Submit scorecard**.

If you submit again later, you **edit your own scorecard**. You never create a second one.

**How it becomes a score.** Each scorecard is the average of its stars, turned into points with the same table as the Rating (1 star = 0 up to 5 stars = 100). The **Interview part is the average of all submitted scorecards**.

**Example.**

| Interviewer | Technical | Communication | Problem solving | Average stars | Scorecard score |
| --- | --- | --- | --- | --- | --- |
| Interviewer A | 5 | 4 | 3 | 4.0 | **75** |
| Interviewer B | 3 | 4 | 3 | 3.3 | **58** |

The **Interview part is the average of 75 and 58: about 67**. The candidate's page also shows how far apart the interviewers were ("2 scorecards, from 58 to 75"), because an average can hide a big disagreement.

:::info The recommendation is for people, not for the score
*Strong no / No / Yes / Strong yes* is shown to the team to read. It is **not** counted in the score. Only the stars are.
:::

#### Blind review: nobody is influenced by anyone else

To keep interviewers honest, scorecards are **hidden from the interviewers until they have submitted their own**.

| Who | What they see before submitting their own scorecard | After submitting |
| --- | --- | --- |
| **Interviewers**, and **anyone assigned to that candidate's interview** (even a manager) | Other scorecards, the Interview part and the **total** are hidden | Everything is visible, with names |
| **Super Admins and Hiring Managers who are not interviewing that candidate** | Everything | Everything |

"Highest score" sorting is also switched off for the **Interviewer** role, because the order of the list would give the hidden numbers away.

## Part 3: How the total is worked out

### The rule

1. Take each part that **has a score** and a **weight above 0**.
2. Multiply each part's score by its weight.
3. Add them up and **divide by the weights you used**. Parts without a score are ignored, so the remaining weights stretch to fill the gap.

In short: **the total is the average of the parts you have, with the heavier parts counting more.**

### Example: the same candidate as parts arrive

Nimal applies for a job with the default weights (30, 30, 10, 30). The numbers below come from the examples above: Questions 90, Rating 87.5, Assessment 75, Interview about 67.

| What has happened | Parts with a score | Working | Total | Shown as |
| --- | --- | --- | --- | --- |
| Nimal applies | Questions (90) | 90 | **90** | `90  1/4` |
| The team rates his CV | Questions, Rating | (30 × 90 + 10 × 87.5) ÷ 40 | **89** | `89  2/4` |
| He passes the test | Questions, Rating, Assessment | (30 × 90 + 10 × 87.5 + 30 × 75) ÷ 70 | **83** | `83  3/4` |
| He is interviewed | All four | (30 × 90 + 10 × 87.5 + 30 × 75 + 30 × 67) ÷ 100 | **78** | `78  4/4` |

Notice that the total went **down** as more evidence arrived. His first score of 90 was based only on his answers. After the test and the interview, it settled at a more honest 78. This is exactly why you should look at the parts count (`1/4`, `2/4`...) and not only the number.

### When a part is switched off

If you set a weight to **0**, that part is ignored for every candidate on the job. For example, with **Screening only** (60 / 0 / 40 / 0) and a candidate with Questions 80 and Rating 50:

Total = (60 × 80 + 40 × 50) ÷ 100 = **68**

## Flags

Flags are warnings for you. They **never change the score**.

| Flag | When it appears | What you usually do |
| --- | --- | --- |
| **Does not meet requirements** (shown as *Knockout* in tight spaces) | The candidate picked a knockout answer | Check the answer, then reject them if you agree. You can reject several at once (see below). |
| **Failed assessment** | The candidate scored below the pass mark | Read their answers and decide. They are **not** rejected automatically. |
| **Assessment expired** (shown as *Test expired*) | The test link ran out unused | To send the test again, move the candidate out of the test stage and back in. Or decide to move on. |

### Rejecting flagged candidates in bulk

On the **Candidates** page, if some candidates are flagged "Does not meet requirements", a bar appears: **"N candidates do not meet the requirements"**.

1. Select **Select them** (or tick candidates yourself).
2. Select **Reject selected**.
3. Confirm the reason. It starts as "Did not meet the requirements" and you can change it.

They move to **Rejected**. **No email is sent**, and you can restore any of them later.

## Reading a score

You will see the same small badge in several places:

`83  3/4`

- **83** is the total score out of 100.
- **3/4** means the score is built from **3 of the 4 parts** the job uses. If a job uses only three parts, it reads `n/3`.
- Red, amber and green are only a rough guide: **70 and above** is green, **40 to 69** is amber, and **below 40** is red. A grey dash means nothing has been scored yet.

| Where | What you see |
| --- | --- |
| **Candidates** page | A **Score** column with the badge and any flags |
| **Hiring pipeline** cards | The badge on each card, shown only once a candidate has a score or a flag |
| **Candidate profile**, top | The badge next to the status. Select it to jump to the Scores tab. |
| **Candidate profile → Scores** tab | The full breakdown (see below) |

### The Scores tab

This is the complete picture of one candidate:

- The **total** in large type, with "3 of 4 parts scored so far".
- Any **flags**.
- One row per part showing its **share** of the total (for example 30%), a bar, and its score out of 100. A part with no result says **Not yet**, and a part that is switched off says **not used**.
- For the Interview part, **how many scorecards** there are and their range, for example "2 scorecards, from 58 to 75".
- **Your rating** and the **Update score** button.
- Below, the candidate's test attempts, with a **View answers** button.

### Sorting by score

On the **Candidates** page, set the sort menu to **Highest score**. The order is:

1. **Flagged** candidates ("Does not meet requirements") go to the **bottom**.
2. Among the rest, candidates **further along your hiring process come first**.
3. Within the same stage, the **highest score comes first**.

**Why the stage comes first.** A candidate who has only answered the questions might have a perfect 100 based on one part. Someone who has been through the test and the interview and scored 80 is far more proven. Ranking by stage first stops the half-scored candidate from jumping the queue.

| Candidate | Stage | Score | Parts | Position in the list |
| --- | --- | --- | --- | --- |
| Ben | Interview | 80 | 4/4 | **1st** |
| Asha | Applied | 100 | 1/4 | **2nd** |
| Chen | Applied | 60 | 1/4 | **3rd** |
| Dilan | Applied | 95 | 1/4 | Last: he is **flagged** |

Dilan has a score of 95, but he is flagged, so he sits at the bottom whatever his score is.

### Filtering the candidates list

Sorting puts the best first. Filters narrow the list down. At the top of the **Candidates** page there is a search box, a **Position** button, a **Filters** button and the sort menu.

**Position.** Select **Position** to open a list of your jobs. Type to search it, then pick one. The position then appears as a **chip** under the search box, for example `Software Engineering Intern ×`, and the list shows only that job's candidates. The chip stays there until you remove it with the **×**, so you always see what the list is narrowed by.

**Filters.** The **Filters** button opens a small menu. A number on the button shows how many of its filters are on.

| Filter | What it does | Example |
| --- | --- | --- |
| **Status** | Shows all, active or rejected candidates | Choose **Active** to hide rejected candidates. |
| **Flags** | Shows only candidates with a certain flag: *Flagged* (any flag), *Does not meet requirements*, *Failed assessment*, *Assessment expired*, or *No flags* | Choose **No flags** to see only clean candidates. |
| **Minimum score** | Shows only candidates whose total score is at least the number you type. Candidates with no score yet are left out. | Type `70` to see only candidates scoring 70 or more. |
| **All parts scored** | Hides candidates whose score is built from fewer parts than the job uses | Tick it to see only candidates who have been through every scored step. |

Every filter that is on shows as a chip, and each chip has its own **×**. **Clear all** removes everything at once.

A common combination is **Min score 70**, **No flags** and **All parts scored**, sorted by **Highest score**: strong candidates, with nothing against them, whose score rests on everything the job measures.

:::tip Your filters are remembered
The position and filters are saved in your browser and in the page address. They are still there if you open a candidate and close their profile, reload the page, or visit another page such as Jobs and come back later. You can also copy the address to share a filtered view with a teammate. They stay until you remove them with the **×** on each chip, or **Clear all**. Only what you typed in the search box is not kept.
:::

:::note
- While a score or flag filter is on, the **Select all matching** shortcut for deleting is switched off. You can still tick individual rows. This stops a delete from reaching candidates that the filtered list is not showing.
- **Interviewers** can use only the Position, Status and Flags filters. The score filters are hidden for them, because the total includes scorecards they are not allowed to see yet.
:::

## When does the score change?

Scores update by themselves. You never press a "calculate" button.

| What happens | What changes |
| --- | --- |
| A candidate **applies** | The Questions part appears |
| A candidate **finishes the test** | The Assessment part and the pass or fail result appear (after any written answers are graded) |
| A reviewer **grades a written answer** | The score appears once the last one is graded |
| A test link **expires unused** | The Assessment part becomes 0 and the flag appears |
| Someone **saves a rating** | The Rating part changes |
| An interviewer **submits or edits a scorecard** | The Interview part changes |
| You **change the weights, question points, scorecard criteria or a pass mark** | Every candidate on that job is re-scored |

**Seeing changes made by others.** Changes you make yourself show up immediately. If someone else changes a candidate while you have the same candidate open, your page does **not** refresh by itself, so it stays steady while you read. Reload the page, or open the candidate again, to see the latest numbers. The Candidates list and the pipeline pick up the changes the next time you open them.

## Common questions

**A job only collects information, like a GitHub link. What do I do?**
Leave **Score this question** off, or use typed answers, and set **Questions** to **0** on the Scoring tab. The answers are still saved and shown on the candidate.

**A candidate has a score of 100 but only `1/4`. Is that good?**
It is a good start, but only a first impression. Wait until more parts arrive, or compare with others at the same stage.

**Why did a candidate's score go down after the test?**
The first score only knew about their answers. A weaker test result pulled the average toward the truth. See the example above.

**A candidate did not take the test. Did that help them?**
No. Once the link has expired they get 0 for that part and a flag. While the link is still valid, the part is left out because they may still take it.

**Can an interviewer see what the others scored?**
Not until they submit their own scorecard. After that, yes.

**Does the recommendation (Strong yes, No...) change the score?**
No. Only the stars count. The recommendation is there for people to read.

**I changed the weights. What happens to people already scored?**
Everyone on that job is re-scored with the new weights. Nobody is moved or rejected.

**Why does the Assessment part say "Pending review"?**
The test has written answers that nobody has graded yet. Open the candidate's **Scores** tab, select **View answers**, and grade them.

**Can a candidate see their score?**
No. Scores are only for your team.

## Quick reference: where do I do each thing?

| I want to... | Go to |
| --- | --- |
| Give an answer points or a knockout | Job → **Custom Questions** → edit the question → **Score this question** |
| Set the pass mark | Job → **Assessments** |
| Change how much each part counts | Job → **Scoring** |
| Set what interviewers score | Job → **Scoring** → **Interview scorecard** |
| Rate a candidate after reading the CV | Candidate → **Scores** → stars → **Update score** |
| Fill in an interview scorecard | Candidate → **Interviews** → **Add feedback** |
| Grade a written test answer | Candidate → **Scores** → **View answers** |
| Sort by best candidates | **Candidates** → sort menu → **Highest score** |
| Show only one job, or only candidates above a score or without flags | **Candidates** → **Position**, then **Filters** (Flags, Minimum score, All parts scored) |
| Reject everyone who did not meet requirements | **Candidates** → "do not meet the requirements" bar → **Select them** → **Reject selected** |

## For administrators

Scoring needs one database change, which is applied with the normal migration command described in the [deployment guide](../operations/deployment). After you upgrade an installation that already has candidates, run the **score backfill** once so that earlier candidates get scores calculated with the current rules:

```bash
cd backend
pnpm tsx src/db/backfill-scores.ts
```

It is safe to run again at any time. OpenATS also checks every 15 minutes for test links that have expired, so no extra scheduled job is needed.
