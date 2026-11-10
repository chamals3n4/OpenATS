import type { ParaformSubmission } from "../../shared/integrations/paraform/paraform-api";
import { extractContacts } from "../candidate/cv-text/contacts";
import { splitSections } from "../candidate/cv-text/sections";

/**
 * The sync's rules, kept free of the database and of Paraform so they can be tested alone.
 */

export type ImportPlan =
  | {
      kind: "create";
      submission: ParaformSubmission;
      email: string;
      phone: string | null;
    }
  | {
      kind: "link_existing";
      submission: ParaformSubmission;
      candidateId: number;
    }
  | { kind: "skip"; submission: ParaformSubmission; problem: string };

/** A candidate already in the job, found by email; or more than one, when only case tells them apart. */
export type ExistingMatch =
  | { kind: "one"; candidateId: number; linked: boolean }
  | { kind: "several"; candidateIds: number[] };

/**
 * Groups the job's candidates by email, compared in lower case. Applying stores the email in lower
 * case but a staff edit keeps it as typed, so `Ada@x.com` and `ada@x.com` can both be in one job.
 * Then nobody can say which one Paraform means, and the caller must not pick one by row order.
 */
export function indexExistingByEmail(
  rows: { candidateId: number; email: string; linked: boolean }[],
): Map<string, ExistingMatch> {
  const byEmail = new Map<string, Map<number, boolean>>();
  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    const found = byEmail.get(email) ?? new Map<number, boolean>();
    found.set(row.candidateId, (found.get(row.candidateId) ?? false) || row.linked);
    byEmail.set(email, found);
  }
  const index = new Map<string, ExistingMatch>();
  for (const [email, found] of byEmail) {
    const [only, ...rest] = [...found];
    if (!only) continue;
    index.set(
      email,
      rest.length === 0
        ? { kind: "one", candidateId: only[0], linked: only[1] }
        : { kind: "several", candidateIds: [...found.keys()].sort((a, b) => a - b) },
    );
  }
  return index;
}

/**
 * The email and phone written in the submission's CV text. Paraform shares neither as a field, so
 * this is the only place they are. An email is used only when the CV has exactly one: with
 * several, the candidate's own cannot be told from a referee's or a past employer's.
 */
export function submissionContacts(
  submission: Pick<ParaformSubmission, "resumeText">,
):
  | { kind: "found"; email: string; phone: string | null }
  | { kind: "none" }
  | { kind: "several"; count: number } {
  const text = submission.resumeText ?? "";
  const { emails, phones } = extractContacts(text, splitSections(text));
  if (emails.length === 0) return { kind: "none" };
  if (emails.length > 1) return { kind: "several", count: emails.length };
  return { kind: "found", email: emails[0]!, phone: phones.length === 1 ? phones[0]! : null };
}

/** What to do with each submission to one role that has not been imported yet. */
export function planImports(input: {
  submissions: ParaformSubmission[];
  importedSubmissionIds: ReadonlySet<string>;
  /** Candidates already in the job, by lower-case email (see `indexExistingByEmail`). */
  existingByEmail: ReadonlyMap<string, ExistingMatch>;
}): ImportPlan[] {
  const plans: ImportPlan[] = [];
  const seenEmails = new Set<string>();

  for (const submission of input.submissions) {
    if (input.importedSubmissionIds.has(submission.id)) continue;

    // The sync log outlives a deleted candidate, so it names ids, never a name or an email.
    const name = submissionLabel(submission);
    const contacts = submissionContacts(submission);
    if (contacts.kind === "none") {
      plans.push({
        kind: "skip",
        submission,
        problem: `${name} was not imported: Paraform shares no email address, and its CV text has none. Add the candidate by hand.`,
      });
      continue;
    }
    if (contacts.kind === "several") {
      plans.push({
        kind: "skip",
        submission,
        problem: `${name} was not imported: its CV text has ${contacts.count} email addresses, so OpenATS cannot tell which is the candidate's. Add the candidate by hand.`,
      });
      continue;
    }
    const { email, phone } = contacts;
    if (seenEmails.has(email)) {
      plans.push({
        kind: "skip",
        submission,
        problem: `${name} was submitted twice to the same role; only the first was imported.`,
      });
      continue;
    }
    seenEmails.add(email);

    const existing = input.existingByEmail.get(email);
    if (existing?.kind === "several") {
      plans.push({
        kind: "skip",
        submission,
        problem: `${name} was not imported: its email matches more than one candidate in this job (#${existing.candidateIds.join(", #")}), whose emails differ only in capital letters. Merge them or correct the email, and the next sync will import it.`,
      });
    } else if (existing && existing.linked) {
      plans.push({
        kind: "skip",
        submission,
        problem: `${name} is candidate #${existing.candidateId}, who is already in this job from another Paraform submission.`,
      });
    } else if (existing) {
      // They applied directly too. Link that application instead of making a second one.
      plans.push({
        kind: "link_existing",
        submission,
        candidateId: existing.candidateId,
      });
    } else {
      plans.push({ kind: "create", submission, email, phone });
    }
  }
  return plans;
}

/** How the sync log names a submission: by its Paraform id, never by the person's name or email. */
export function submissionLabel(submission: Pick<ParaformSubmission, "id">): string {
  return `Paraform submission ${submission.id}`;
}

/**
 * Splits Paraform's one name string into the first and last name OpenATS stores, within its
 * limits: the last word is the last name. "Ada B." stays as Paraform shortened it.
 */
export function candidateName(submission: Pick<ParaformSubmission, "name">): {
  firstName: string;
  lastName: string;
} {
  const words = submission.name.trim().split(/\s+/).filter(Boolean);
  const last = words.length > 1 ? words.pop()! : "";
  const firstName = words.join(" ").slice(0, 100) || "Unknown";
  const lastName = last.slice(0, 100) || "-";
  return { firstName, lastName };
}
