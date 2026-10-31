import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { inArray, eq } from "drizzle-orm";
import { db } from "../../src/db";
import { company, departments } from "../../src/db/schema/company";
import { jobs } from "../../src/db/schema/jobs";
import { jobHiringTeam } from "../../src/db/schema/pipeline";
import { candidates } from "../../src/db/schema/candidates";
import { offers } from "../../src/db/schema/offers";
import { users } from "../../src/db/schema/users";
import { getJobDeleteSummary } from "../../src/modules/job/job.controller";
import type { AuthenticatedUser } from "../../src/shared/auth/verify-token";
import type { Request, Response } from "express";

// The numbers a person sees before deleting jobs, and that only someone on every job's team gets them.

const SUFFIX = `delete-summary-${Date.now()}`;

let member: AuthenticatedUser;
let companyId: number;
let departmentId: number;
let memberJobId: number;
let emptyJobId: number;
let otherJobId: number;

async function call(user: AuthenticatedUser, ids: string) {
  const reply: { status?: number; body?: { data?: unknown; error?: string } } = {};
  const res = {
    status(code: number) {
      reply.status = code;
      return this;
    },
    json(body: typeof reply.body) {
      reply.body = body;
      return this;
    },
  } as unknown as Response;
  await getJobDeleteSummary({ query: { ids }, user } as unknown as Request, res);
  return reply;
}

beforeAll(async () => {
  const [co] = await db
    .insert(company)
    .values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` })
    .returning();
  companyId = co!.id;
  const [dept] = await db
    .insert(departments)
    .values({ companyId, name: `Dept ${SUFFIX}` })
    .returning();
  departmentId = dept!.id;

  const [row] = await db
    .insert(users)
    .values({
      name: "Member Tester",
      firstName: "Member",
      lastName: "Tester",
      email: `member.${SUFFIX}@example.test`,
      role: "hiring_manager",
    })
    .returning();
  member = { ...row!, role: "hiring_manager" };

  const inserted = await db
    .insert(jobs)
    .values(
      ["member", "empty", "other"].map((tag) => ({
        slug: `${tag}-${SUFFIX}`,
        title: tag,
        departmentId,
        employmentType: "full_time" as const,
        createdBy: member.id,
      })),
    )
    .returning({ id: jobs.id });
  [memberJobId, emptyJobId, otherJobId] = inserted.map((job) => job.id) as [number, number, number];

  await db.insert(jobHiringTeam).values([
    { jobId: memberJobId, userId: member.id },
    { jobId: emptyJobId, userId: member.id },
  ]);

  const made = await db
    .insert(candidates)
    .values(
      [memberJobId, memberJobId, otherJobId].map((jobId, index) => ({
        firstName: "Cand",
        lastName: `${index}`,
        email: `cand${index}.${SUFFIX}@example.test`,
        jobId,
      })),
    )
    .returning({ id: candidates.id });

  await db
    .insert(offers)
    .values({ candidateId: made[0]!.id, jobId: memberJobId, createdBy: member.id });
});

afterAll(async () => {
  const ids = [memberJobId, emptyJobId, otherJobId];
  await db.delete(offers).where(inArray(offers.jobId, ids));
  await db.delete(candidates).where(inArray(candidates.jobId, ids));
  await db.delete(jobs).where(inArray(jobs.id, ids));
  await db.delete(users).where(eq(users.id, member.id));
  await db.delete(departments).where(eq(departments.id, departmentId));
  await db.delete(company).where(eq(company.id, companyId));
});

describe("getJobDeleteSummary", () => {
  it("counts the candidates and offers across the jobs", async () => {
    const reply = await call(member, `${memberJobId},${emptyJobId}`);

    expect(reply.status).toBe(200);
    expect(reply.body?.data).toEqual({ candidates: 2, offers: 1 });
  });

  it("answers zero for a job with nothing on it", async () => {
    expect((await call(member, `${emptyJobId}`)).body?.data).toEqual({ candidates: 0, offers: 0 });
  });

  it("refuses when any job is not on the person's team, and gives no numbers", async () => {
    const reply = await call(member, `${memberJobId},${otherJobId}`);

    expect(reply.status).toBe(403);
    expect(reply.body?.data).toBeUndefined();
  });

  it.each(["", "abc", "1,abc", "-1"])("refuses ids %j", async (ids) => {
    expect((await call(member, ids)).status).toBe(400);
  });
});
