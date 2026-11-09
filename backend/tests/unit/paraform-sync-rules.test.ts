import { describe, expect, it } from "vitest";
import {
  candidateName,
  decisionFor,
  decisionToSend,
  indexExistingByEmail,
  planImports,
} from "../../src/modules/paraform/paraform-sync-rules";
import type { ParaformSubmission } from "../../src/shared/integrations/paraform/paraform-api";

function submission(overrides: Partial<ParaformSubmission> = {}): ParaformSubmission {
  return {
    id: "sub-1",
    roleId: "role-1",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "Ada@Example.com",
    phone: null,
    recruiterName: "Rita Recruiter",
    note: null,
    url: null,
    ...overrides,
  };
}

const none = { importedSubmissionIds: new Set<string>(), existingByEmail: new Map() };

describe("planImports", () => {
  it("creates a candidate for a new submission, with the email in lower case", () => {
    const [plan] = planImports({ ...none, submissions: [submission()] });
    expect(plan).toMatchObject({ kind: "create", email: "ada@example.com" });
  });

  it("leaves out submissions already imported, so a second sync adds nobody twice", () => {
    const plans = planImports({ ...none, submissions: [submission()], importedSubmissionIds: new Set(["sub-1"]) });
    expect(plans).toEqual([]);
  });

  it("skips a submission without an email and says why", () => {
    const [plan] = planImports({ ...none, submissions: [submission({ email: "  " })] });
    expect(plan).toMatchObject({ kind: "skip" });
    expect(plan?.kind === "skip" && plan.problem).toContain("did not share an email");
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
        submission({ email: null }),
        submission({ id: "sub-2" }),
        submission({ id: "sub-3" }),
        submission({ id: "sub-4", email: "grace@example.com", firstName: "Grace" }),
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
      submissions: [submission(), submission({ id: "sub-2", email: "ada@example.com" })],
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

describe("decisionFor", () => {
  it("waits while the candidate is still in the first stage", () => {
    expect(decisionFor({ status: "active", inFirstStage: true })).toBeNull();
  });

  it("advances a candidate moved past the first stage", () => {
    expect(decisionFor({ status: "active", inFirstStage: false })).toBe("advance");
  });

  it("advances on an offer or a hire, wherever the card sits", () => {
    expect(decisionFor({ status: "offered", inFirstStage: true })).toBe("advance");
    expect(decisionFor({ status: "hired", inFirstStage: true })).toBe("advance");
  });

  it("rejects a rejected candidate, even from the first stage", () => {
    expect(decisionFor({ status: "rejected", inFirstStage: true })).toBe("reject");
  });

  it("sends nothing for a withdrawal, which is not a decision", () => {
    expect(decisionFor({ status: "withdrawn", inFirstStage: false })).toBeNull();
  });
});

describe("decisionToSend", () => {
  it("sends a decision Paraform has not had yet", () => {
    expect(decisionToSend("advance", null)).toBe("advance");
    expect(decisionToSend("reject", "advance")).toBe("reject");
  });

  it("does not send the same decision twice", () => {
    expect(decisionToSend("advance", "advance")).toBeNull();
  });

  it("treats a rejection as final", () => {
    expect(decisionToSend("advance", "reject")).toBeNull();
  });

  it("sends nothing when there is no decision", () => {
    expect(decisionToSend(null, null)).toBeNull();
  });
});

describe("candidateName", () => {
  it("fills a missing name so the required columns are never empty", () => {
    expect(candidateName(submission({ firstName: " ", lastName: "" }))).toEqual({
      firstName: "Unknown",
      lastName: "-",
    });
  });
});
