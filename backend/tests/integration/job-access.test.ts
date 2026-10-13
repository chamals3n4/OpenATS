import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../src/db";
import { company, departments } from "../../src/db/schema/company";
import { jobs } from "../../src/db/schema/jobs";
import { jobHiringTeam } from "../../src/db/schema/pipeline";
import { candidates } from "../../src/db/schema/candidates";
import { users } from "../../src/db/schema/users";
import {
  canAccessJob,
  canAccessCandidate,
  canViewCandidate,
  canViewJob,
} from "../../src/shared/auth/job-access";
import {
  requireCandidateAccess,
  requireCandidateView,
  requireJobAccess,
  requireJobView,
} from "../../src/middlewares/job-access.middleware";
import { getCandidateById } from "../../src/modules/candidate/candidate.controller";
import type { AuthenticatedUser } from "../../src/shared/auth/verify-token";
import type { NextFunction, Request, Response } from "express";

// Covers the two rules in shared/auth/job-access.ts: who is in a hiring team's chat (canAccess*),
// and who may see a job's candidates (canView*).

const SUFFIX = `job-access-${Date.now()}`;

let memberUser: AuthenticatedUser;
let outsiderUser: AuthenticatedUser;
let adminUser: AuthenticatedUser;
let interviewerOnTeamUser: AuthenticatedUser;
let interviewerOffTeamUser: AuthenticatedUser;
let teamJobId: number;
let otherJobId: number;
let teamCandidateId: number;
let otherCandidateId: number;

async function makeUser(
  tag: string,
  role: AuthenticatedUser["role"],
): Promise<AuthenticatedUser> {
  const [row] = await db
    .insert(users)
    .values({
      name: `${tag} Tester`,
      firstName: tag,
      lastName: "Tester",
      email: `${tag}.${SUFFIX}@example.test`,
      role,
    })
    .returning();
  return { ...row!, role };
}

beforeAll(async () => {
  const [co] = await db
    .insert(company)
    .values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` })
    .returning();

  const [dept] = await db
    .insert(departments)
    .values({ companyId: co!.id, name: `Dept ${SUFFIX}` })
    .returning();

  memberUser = await makeUser("member", "hiring_manager");
  outsiderUser = await makeUser("outsider", "hiring_manager");
  adminUser = await makeUser("admin", "super_admin");
  interviewerOnTeamUser = await makeUser("interviewer-on-team", "interviewer");
  interviewerOffTeamUser = await makeUser(
    "interviewer-off-team",
    "interviewer",
  );

  const inserted = await db
    .insert(jobs)
    .values([
      {
        slug: `team-job-${SUFFIX}`,
        title: "Team Job",
        departmentId: dept!.id,
        employmentType: "full_time",
        createdBy: adminUser.id,
      },
      {
        slug: `other-job-${SUFFIX}`,
        title: "Other Job",
        departmentId: dept!.id,
        employmentType: "full_time",
        createdBy: adminUser.id,
      },
    ])
    .returning({ id: jobs.id });

  teamJobId = inserted[0]!.id;
  otherJobId = inserted[1]!.id;

  await db.insert(jobHiringTeam).values([
    { jobId: teamJobId, userId: memberUser.id },
    { jobId: teamJobId, userId: interviewerOnTeamUser.id },
  ]);

  const insertedCandidates = await db
    .insert(candidates)
    .values([
      {
        firstName: "Team",
        lastName: "Candidate",
        email: `team.cand.${SUFFIX}@example.test`,
        jobId: teamJobId,
      },
      {
        firstName: "Other",
        lastName: "Candidate",
        email: `other.cand.${SUFFIX}@example.test`,
        jobId: otherJobId,
      },
    ])
    .returning({ id: candidates.id });

  teamCandidateId = insertedCandidates[0]!.id;
  otherCandidateId = insertedCandidates[1]!.id;
});

afterAll(async () => {
  await db
    .delete(candidates)
    .where(inArray(candidates.id, [teamCandidateId, otherCandidateId]));
  await db.delete(jobs).where(inArray(jobs.id, [teamJobId, otherJobId]));
  await db.delete(users).where(
    inArray(users.id, [
      memberUser.id,
      outsiderUser.id,
      adminUser.id,
      interviewerOnTeamUser.id,
      interviewerOffTeamUser.id,
    ]),
  );
  await db.delete(company).where(eq(company.email, `co.${SUFFIX}@example.test`));
});

describe("canAccessJob", () => {
  it("allows a member of the hiring team", async () => {
    expect(await canAccessJob(memberUser, teamJobId)).toBe(true);
  });

  it("denies a logged-in user who is not on the hiring team", async () => {
    expect(await canAccessJob(outsiderUser, teamJobId)).toBe(false);
  });

  it("denies a member for a different job", async () => {
    expect(await canAccessJob(memberUser, otherJobId)).toBe(false);
  });

  it("allows super_admin without team membership", async () => {
    expect(await canAccessJob(adminUser, teamJobId)).toBe(true);
  });

  it("denies a job that does not exist", async () => {
    expect(await canAccessJob(memberUser, 2_000_000_000)).toBe(false);
  });
});

// Driven directly: the real route needs a signed token we cannot issue here.
function runMiddleware(
  middleware: ReturnType<typeof requireJobAccess>,
  user: AuthenticatedUser,
  params: Record<string, string>,
) {
  return new Promise<{ status: number | null; body: unknown; passed: boolean }>(
    (resolve) => {
      let status: number | null = null;
      const res = {
        status(code: number) {
          status = code;
          return this;
        },
        json(body: unknown) {
          resolve({ status, body, passed: false });
          return this;
        },
      } as unknown as Response;

      const next: NextFunction = () =>
        resolve({ status: null, body: null, passed: true });

      void middleware({ user, params } as unknown as Request, res, next);
    },
  );
}

describe("requireJobAccess", () => {
  it("passes a hiring team member through", async () => {
    const result = await runMiddleware(requireJobAccess(), memberUser, {
      jobId: String(teamJobId),
    });
    expect(result.passed).toBe(true);
  });

  it("rejects an outsider with 403", async () => {
    const result = await runMiddleware(requireJobAccess(), outsiderUser, {
      jobId: String(teamJobId),
    });
    expect(result.passed).toBe(false);
    expect(result.status).toBe(403);
  });

  it("rejects a malformed id with 400", async () => {
    const result = await runMiddleware(requireJobAccess(), memberUser, {
      jobId: "not-a-number",
    });
    expect(result.status).toBe(400);
  });
});

describe("requireCandidateAccess", () => {
  it("rejects a candidate on another job with 403", async () => {
    const result = await runMiddleware(
      requireCandidateAccess(),
      memberUser,
      { candidateId: String(otherCandidateId) },
    );
    expect(result.passed).toBe(false);
    expect(result.status).toBe(403);
  });

  it("passes for a candidate on the user's own job", async () => {
    const result = await runMiddleware(
      requireCandidateAccess(),
      memberUser,
      { candidateId: String(teamCandidateId) },
    );
    expect(result.passed).toBe(true);
  });
});

describe("canAccessCandidate", () => {
  it("allows a member of the candidate's job", async () => {
    expect(await canAccessCandidate(memberUser, teamCandidateId)).toBe(true);
  });

  it("denies a candidate belonging to another job", async () => {
    expect(await canAccessCandidate(memberUser, otherCandidateId)).toBe(false);
  });

  it("denies an outsider", async () => {
    expect(await canAccessCandidate(outsiderUser, teamCandidateId)).toBe(false);
  });

  it("allows super_admin", async () => {
    expect(await canAccessCandidate(adminUser, otherCandidateId)).toBe(true);
  });

  it("denies a candidate that does not exist", async () => {
    expect(await canAccessCandidate(memberUser, 2_000_000_000)).toBe(false);
  });
});

// Driven directly, same technique as runMiddleware above: the real route
// needs a signed token we cannot issue here.
function runController(
  controller: typeof getCandidateById,
  user: AuthenticatedUser,
  params: Record<string, string>,
) {
  return new Promise<{ status: number | null; body: unknown }>((resolve) => {
    let status: number | null = null;
    const res = {
      status(code: number) {
        status = code;
        return this;
      },
      json(body: unknown) {
        resolve({ status, body });
        return this;
      },
    } as unknown as Response;

    void controller({ user, params } as unknown as Request, res);
  });
}

describe("who may see a job and its candidates", () => {
  it("lets a hiring manager see a job they are not on the hiring team of", async () => {
    expect(await canViewJob(outsiderUser, teamJobId)).toBe(true);
    expect(await canViewCandidate(outsiderUser, teamCandidateId)).toBe(true);
  });

  it("lets a super admin see every job", async () => {
    expect(await canViewJob(adminUser, otherJobId)).toBe(true);
    expect(await canViewCandidate(adminUser, otherCandidateId)).toBe(true);
  });

  it("lets an interviewer see only the jobs they are on", async () => {
    expect(await canViewJob(interviewerOnTeamUser, teamJobId)).toBe(true);
    expect(await canViewCandidate(interviewerOnTeamUser, teamCandidateId)).toBe(true);

    expect(await canViewJob(interviewerOnTeamUser, otherJobId)).toBe(false);
    expect(await canViewCandidate(interviewerOnTeamUser, otherCandidateId)).toBe(false);
    expect(await canViewCandidate(interviewerOffTeamUser, teamCandidateId)).toBe(false);
  });

  it("does not tell an interviewer whether a candidate id exists", async () => {
    expect(await canViewCandidate(interviewerOnTeamUser, 2_000_000_000)).toBe(false);
  });

  it("keeps the team chat to the hiring team: seeing a candidate is not being in the chat", async () => {
    expect(await canViewCandidate(outsiderUser, teamCandidateId)).toBe(true);
    expect(await canAccessCandidate(outsiderUser, teamCandidateId)).toBe(false);
    expect(await canAccessJob(outsiderUser, teamJobId)).toBe(false);
  });
});

describe("requireCandidateView and requireJobView", () => {
  it("pass a hiring manager who is not on the hiring team", async () => {
    const candidate = await runMiddleware(requireCandidateView(), outsiderUser, {
      candidateId: String(teamCandidateId),
    });
    const job = await runMiddleware(requireJobView(), outsiderUser, { jobId: String(teamJobId) });

    expect(candidate.passed).toBe(true);
    expect(job.passed).toBe(true);
  });

  it("reject an interviewer who is not on the hiring team with 403", async () => {
    const candidate = await runMiddleware(requireCandidateView(), interviewerOffTeamUser, {
      candidateId: String(teamCandidateId),
    });
    const job = await runMiddleware(requireJobView(), interviewerOffTeamUser, {
      jobId: String(teamJobId),
    });

    expect(candidate.status).toBe(403);
    expect(job.status).toBe(403);
  });

  it("pass an interviewer who is on the hiring team", async () => {
    const result = await runMiddleware(requireCandidateView(), interviewerOnTeamUser, {
      candidateId: String(teamCandidateId),
    });
    expect(result.passed).toBe(true);
  });

  it("reject a malformed id with 400", async () => {
    const result = await runMiddleware(requireCandidateView(), outsiderUser, { candidateId: "abc" });
    expect(result.status).toBe(400);
  });
});

describe("getCandidateById authorization", () => {
  // Regression coverage for the candidate-detail IDOR: interviewer must be
  // scoped to their own hiring team, exactly like the list endpoint already
  // is; hiring_manager/super_admin stay company-wide (canViewCandidate).
  it("allows an interviewer on the candidate's hiring team", async () => {
    const result = await runController(getCandidateById, interviewerOnTeamUser, {
      id: String(teamCandidateId),
    });
    expect(result.status).toBe(200);
  });

  it("denies an interviewer not on the candidate's hiring team with 403", async () => {
    const result = await runController(getCandidateById, interviewerOffTeamUser, {
      id: String(teamCandidateId),
    });
    expect(result.status).toBe(403);
  });

  it("allows hiring_manager for a candidate outside their own hiring team (no regression)", async () => {
    const result = await runController(getCandidateById, outsiderUser, {
      id: String(teamCandidateId),
    });
    expect(result.status).toBe(200);
  });

  it("allows super_admin unconditionally", async () => {
    const result = await runController(getCandidateById, adminUser, {
      id: String(otherCandidateId),
    });
    expect(result.status).toBe(200);
  });

  it("returns 403, not a leaking 404, for an interviewer probing a nonexistent id", async () => {
    const result = await runController(getCandidateById, interviewerOffTeamUser, {
      id: "2000000000",
    });
    expect(result.status).toBe(403);
  });
});
