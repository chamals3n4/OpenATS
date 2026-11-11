import { describe, expect, it } from "vitest";
import {
  candidateName,
  indexExistingByEmail,
  planImports,
  submissionContacts,
} from "../../src/modules/paraform/paraform-sync-rules";
import type { ParaformSubmission } from "../../src/shared/integrations/paraform/paraform-api";

/** A CV as Paraform's `resumeText` gives it: one long line, contacts at the top. */
function cv(email: string, extra = ""): string {
  return `ADA LOVELACE London | ${email} | +44 20 7946 0958 EXPERIENCE Analytical Engines 1842 - 1843 ${extra}`;
}

function submission(overrides: Partial<ParaformSubmission> = {}): ParaformSubmission {
  return {
    id: "sub-1",
    roleId: "role-1",
    name: "Ada Lovelace",
    resumeText: cv("Ada@Example.com"),
    note: null,
    url: null,
    ...overrides,
  };
}

const none = { importedSubmissionIds: new Set<string>(), existingByEmail: new Map() };

describe("planImports", () => {
  it("creates a candidate for a new submission, with the email from the CV in lower case", () => {
    const [plan] = planImports({ ...none, submissions: [submission()] });
    expect(plan).toMatchObject({ kind: "create", email: "ada@example.com", phone: "+44 20 7946 0958" });
  });

  it("leaves out submissions already imported, so a second sync adds nobody twice", () => {
    const plans = planImports({ ...none, submissions: [submission()], importedSubmissionIds: new Set(["sub-1"]) });
    expect(plans).toEqual([]);
  });

  it("skips a submission whose CV has no email, or no CV text, and says why", () => {
    const plans = planImports({
      ...none,
      submissions: [
        submission({ resumeText: "ADA LOVELACE London EXPERIENCE Analytical Engines" }),
        submission({ id: "sub-2", resumeText: null }),
      ],
    });
    expect(plans.map((p) => p.kind)).toEqual(["skip", "skip"]);
    expect(plans[0]?.kind === "skip" && plans[0].problem).toContain("CV text has none");
  });

  it("skips a submission whose CV has several emails rather than guessing which is theirs", () => {
    const [plan] = planImports({
      ...none,
      submissions: [submission({ resumeText: cv("ada@example.com", "Referee: babbage@example.com") })],
    });
    expect(plan).toMatchObject({ kind: "skip" });
    expect(plan?.kind === "skip" && plan.problem).toContain("2 email addresses");
  });

  it("links someone who already applied directly instead of making a second application", () => {
    const [plan] = planImports({
      ...none,
      submissions: [submission()],
      existingByEmail: new Map([["ada@example.com", { kind: "one", candidateId: 7, linked: false }]]),
    });
    expect(plan).toMatchObject({ kind: "link_existing", candidateId: 7 });
  });

  it("skips a second submission of someone already linked from Paraform", () => {
    const [plan] = planImports({
      ...none,
      submissions: [submission({ id: "sub-2" })],
      existingByEmail: new Map([["ada@example.com", { kind: "one", candidateId: 7, linked: true }]]),
    });
    expect(plan).toMatchObject({ kind: "skip" });
  });

  it("imports nobody when the email matches more than one candidate, rather than picking one", () => {
    const [plan] = planImports({
      ...none,
      submissions: [submission()],
      existingByEmail: new Map([["ada@example.com", { kind: "several", candidateIds: [7, 9] }]]),
    });
    expect(plan).toMatchObject({ kind: "skip" });
    expect(plan?.kind === "skip" && plan.problem).toContain("#7, #9");
  });

  it("names the submission by id, never by the person's name or email", () => {
    const plans = planImports({
      ...none,
      submissions: [
        submission({ resumeText: null }),
        submission({ id: "sub-2" }),
        submission({ id: "sub-3" }),
        submission({ id: "sub-4", resumeText: cv("grace@example.com"), name: "Grace Hopper" }),
      ],
      existingByEmail: new Map([
        ["grace@example.com", { kind: "one", candidateId: 11, linked: true }],
      ]),
    });
    const problems = plans.flatMap((p) => (p.kind === "skip" ? [p.problem] : []));
    expect(problems).toHaveLength(3);
    expect(problems.join(" ")).not.toMatch(/Ada|Lovelace|Grace|example\.com/i);
    expect(problems[0]).toContain("Paraform submission sub-1");
    expect(problems[2]).toContain("candidate #11");
  });

  it("imports the same person only once when two recruiters submit them in one run", () => {
    const plans = planImports({
      ...none,
      submissions: [submission(), submission({ id: "sub-2", resumeText: cv("ada@example.com") })],
    });
    expect(plans.map((p) => p.kind)).toEqual(["create", "skip"]);
  });
});

describe("indexExistingByEmail", () => {
  it("finds a candidate whatever the capitals in the saved email", () => {
    const index = indexExistingByEmail([{ candidateId: 7, email: " Ada@Example.COM", linked: false }]);
    expect(index.get("ada@example.com")).toEqual({ kind: "one", candidateId: 7, linked: false });
  });

  it("reports every candidate when emails differ only in capitals", () => {
    const index = indexExistingByEmail([
      { candidateId: 9, email: "ADA@example.com", linked: false },
      { candidateId: 7, email: "ada@example.com", linked: true },
    ]);
    expect(index.get("ada@example.com")).toEqual({ kind: "several", candidateIds: [7, 9] });
  });

  it("counts one candidate seen on several rows once, linked if any row is", () => {
    const index = indexExistingByEmail([
      { candidateId: 7, email: "ada@example.com", linked: false },
      { candidateId: 7, email: "ada@example.com", linked: true },
    ]);
    expect(index.get("ada@example.com")).toEqual({ kind: "one", candidateId: 7, linked: true });
  });
});

describe("submissionContacts", () => {
  it("takes the one email and the one phone written in the CV", () => {
    expect(submissionContacts({ resumeText: cv("ada@example.com") })).toEqual({
      kind: "found",
      email: "ada@example.com",
      phone: "+44 20 7946 0958",
    });
  });

  it("counts an email written twice as one", () => {
    expect(submissionContacts({ resumeText: cv("ada@example.com", "Contact: ADA@example.com") })).toMatchObject({
      kind: "found",
      email: "ada@example.com",
    });
  });

  it("reports no email for an empty CV", () => {
    expect(submissionContacts({ resumeText: null })).toEqual({ kind: "none" });
  });
});

describe("candidateName", () => {
  it("takes the last word as the last name", () => {
    expect(candidateName({ name: " Ada  King Lovelace " })).toEqual({ firstName: "Ada King", lastName: "Lovelace" });
  });

  it("keeps a name Paraform shortened as it is", () => {
    expect(candidateName({ name: "Ada L." })).toEqual({ firstName: "Ada", lastName: "L." });
  });

  it("fills a missing part so the required columns are never empty", () => {
    expect(candidateName({ name: " " })).toEqual({ firstName: "Unknown", lastName: "-" });
    expect(candidateName({ name: "Ada" })).toEqual({ firstName: "Ada", lastName: "-" });
  });
});
