import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../src/db";
import { company, departments } from "../../src/db/schema/company";
import { jobs } from "../../src/db/schema/jobs";
import { jobHiringTeam } from "../../src/db/schema/pipeline";
import { candidates } from "../../src/db/schema/candidates";
import { users } from "../../src/db/schema/users";
import { canAccessJob, canAccessCandidate } from "../../src/shared/auth/job-access";
import {
  requireCandidateAccess,
  requireJobAccess,
} from "../../src/middlewares/job-access.middleware";
import type { AuthenticatedUser } from "../../src/shared/auth/verify-token";
import type { NextFunction, Request, Response } from "express";

// Covers the rule that keeps one hiring team's chat away from another.

const SUFFIX = `job-access-${Date.now()}`;

let memberUser: AuthenticatedUser;
let outsiderUser: AuthenticatedUser;
let adminUser: AuthenticatedUser;
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
      asgardeoUserId: `${SUFFIX}-${tag}`,
      firstName: tag,
      lastName: "Tester",
      email: `${tag}.${SUFFIX}@example.test`,
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

  await db
    .insert(jobHiringTeam)
    .values({ jobId: teamJobId, userId: memberUser.id });

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
  await db
    .delete(users)
    .where(
      inArray(users.id, [memberUser.id, outsiderUser.id, adminUser.id]),
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
