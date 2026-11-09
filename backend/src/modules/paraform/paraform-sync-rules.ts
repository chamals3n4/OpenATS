import type {
  ParaformDecision,
  ParaformSubmission,
} from "../../shared/integrations/paraform/paraform-api";

/**
 * The sync's decisions, kept free of the database and of Paraform so they can be tested alone.
 */

export type ImportPlan =
  | { kind: "create"; submission: ParaformSubmission; email: string }
  | {
      kind: "link_existing";
      submission: ParaformSubmission;
      candidateId: number;
    }
  | { kind: "skip"; submission: ParaformSubmission; problem: string };

/** What to do with each submission to one role that has not been imported yet. */
export function planImports(input: {
  submissions: ParaformSubmission[];
  importedSubmissionIds: ReadonlySet<string>;
  /** Candidates already in the job by email (lower case), and whether each is already linked. */
  existingByEmail: ReadonlyMap<
    string,
    { candidateId: number; linked: boolean }
  >;
}): ImportPlan[] {
  const plans: ImportPlan[] = [];
  const seenEmails = new Set<string>();

  for (const submission of input.submissions) {
    if (input.importedSubmissionIds.has(submission.id)) continue;

    const name =
      `${submission.firstName} ${submission.lastName}`.trim() || "A candidate";
    const email = submission.email?.trim().toLowerCase();
    if (!email) {
      plans.push({
        kind: "skip",
        submission,
        problem: `${name} was not imported: Paraform did not share an email address.`,
      });
      continue;
    }
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
    if (existing && existing.linked) {
      plans.push({
        kind: "skip",
        submission,
        problem: `${name} is already in this job from another Paraform submission.`,
      });
    } else if (existing) {
      // They applied directly too. Link that application instead of making a second one.
      plans.push({
        kind: "link_existing",
        submission,
        candidateId: existing.candidateId,
      });
    } else {
      plans.push({ kind: "create", submission, email });
    }
  }
  return plans;
}

/** Where a candidate stands in OpenATS, as far as Paraform needs to know. */
export type CandidatePosition = {
  status: "active" | "rejected" | "offered" | "hired" | "withdrawn";
  /** Still in the job's first stage, where every imported candidate starts. */
  inFirstStage: boolean;
};

/**
 * The decision OpenATS has made about a candidate: rejected, or moved on from the first stage.
 * Null while they wait in the first stage, and for a withdrawal, which is the candidate's choice
 * and not a decision for the recruiter.
 */
export function decisionFor(
  position: CandidatePosition,
): ParaformDecision | null {
  if (position.status === "rejected") return "reject";
  if (position.status === "withdrawn") return null;
  if (position.status === "offered" || position.status === "hired")
    return "advance";
  return position.inFirstStage ? null : "advance";
}

/**
 * The decision still to send, given the last one Paraform accepted. Each is sent at most once,
 * and a rejection is final: a candidate moved back after one is not advanced again on Paraform.
 */
export function decisionToSend(
  current: ParaformDecision | null,
  alreadySent: ParaformDecision | null,
): ParaformDecision | null {
  if (current === null || alreadySent === "reject" || current === alreadySent)
    return null;
  return current;
}

/** Splits a submitted name into the first and last name OpenATS stores, within its limits. */
export function candidateName(submission: ParaformSubmission): {
  firstName: string;
  lastName: string;
} {
  const firstName = submission.firstName.trim().slice(0, 100) || "Unknown";
  const lastName = submission.lastName.trim().slice(0, 100) || "-";
  return { firstName, lastName };
}
