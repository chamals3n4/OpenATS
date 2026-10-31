---
title: Add Your Team and Set Their Roles
sidebar_label: Add Your Team
description: Add your hiring team to OpenATS, choose the right role for each person, reset passwords, remove users, and update your own profile.
keywords: [ATS user roles, hiring manager permissions, interviewer access, add users, OpenATS user management]
---

# Add Your Team and Set Their Roles

Nobody can sign up to OpenATS by themselves, so everyone on your team needs an account from a Super Admin. Once your company is set up, this is the next thing to do.

## Pick a role for each person

There are three roles. When you're unsure, give someone the smaller role. You can change it later and it applies straight away.

**Super Admin** can do everything, on every job. Keep this to the one or two people who look after OpenATS.

**Hiring Manager** is for recruiters and team leads. They create jobs and run hiring on the jobs they're part of: moving candidates, booking interviews and making offers. They can also edit what all jobs share, such as templates, assessments, assignments and the careers page. Company settings are read-only for them.

**Interviewer** is for people who only meet candidates. They can read the candidates on their jobs and fill in scorecards, but they can't move anyone, schedule anything or see the offers page.

| | Super Admin | Hiring Manager | Interviewer |
| --- | --- | --- | --- |
| See jobs and candidates | All | Their jobs | Their jobs |
| Create jobs | Yes | Yes | No |
| Move or reject candidates, book interviews | Yes | Their jobs | No |
| Fill in scorecards | Yes | Yes | Yes |
| Make offers | Yes | Their jobs | No |
| Edit templates, assessments, assignments, careers page | Yes | Yes | No |
| Change company details, departments, AI setting | Yes | No | No |
| Manage users | Yes | No | No |

"Their jobs" means the jobs they're on the hiring team of. So if someone tells you a job is missing, it's almost always because they haven't been [added to its hiring team](./manage-jobs#build-the-hiring-team) yet.

## Add someone

1. Go to **Settings > User Management** and select **Create User**.
2. Enter their email and first name. The last name is optional.
3. Choose their **Role**.
4. Choose how they'll get their password. We recommend **Invite the user to set their own password**, which emails them a link that works once and lasts 24 hours. If you'd rather choose one, pick **Set a password for the user** and pass it on to them yourself.

{/* SCREENSHOT: users/create-user.png - The Create User panel filled in, with the role and password options visible */}

If the invite option is greyed out, your installation can't send email yet. Set a password for now, and ask whoever runs OpenATS to [set up email](../administration/authentication#email-for-invites-and-resets).

## Change someone's details

Find the person in the list. **Search User** helps if you have a lot of people. From there you can:

- **Edit** their name, email or role.
- **Send password reset link** to email them a link to choose a new password.
- **Set new password** to choose one yourself. This signs them out everywhere.

{/* SCREENSHOT: users/user-list.png - The User Management list showing all three roles, with the actions menu open */}

## When someone leaves

Select **Remove**. They're signed out immediately and can't sign back in, but their account isn't deleted, so their name stays on the jobs, notes and scorecards they worked on.

If they come back, create a user with the same email and you'll get their old account back.

OpenATS won't let you lock yourself out. You can't remove your own account or change your own role, and you can't remove the last Super Admin. Make someone else a Super Admin first.

## Update your own profile

Anyone can do this. Go to **Settings > Profile** to change your name or password. Your email is the one thing you can't change here, so ask a Super Admin if it's wrong. Changing your password signs you out on your other devices.

{/* SCREENSHOT: users/profile.png - The Profile page with the details form and the change password form */}

The menu under your name at the top right has the light and dark **Theme** switch, and **Log out**.

## If you forget your password

Select **Forgot password?** on the sign-in page and we'll email you a link. If your installation can't send email, ask a Super Admin to use **Set new password**.

## Next step

Take a look around in [Find Your Way Around](./dashboard-overview). If you're looking for session lengths or server settings, those are in [Sign-In and Users](../administration/authentication).
