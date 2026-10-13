import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

// The queue is replaced by a list, so the tests can see which files were sent to be erased.
const requestResumeDeletion = vi.fn(async (_keys: Array<string | null | undefined>) => undefined);
vi.mock("../../src/queues/resume-delete/queue", () => ({
  requestResumeDeletion: (keys: Array<string | null | undefined>) => requestResumeDeletion(keys),
}));

import { db } from "../../src/db";
import { company, departments } from "../../src/db/schema/company";
import { jobs } from "../../src/db/schema/jobs";
import { candidateCvText, candidates } from "../../src/db/schema/candidates";
import { emailMessages } from "../../src/db/schema/communications";
import { users } from "../../src/db/schema/users";
import { candidateService } from "../../src/modules/candidate/candidate.service";
import { jobService } from "../../src/modules/job/job.service";

// When a candidate is deleted their CV file has to go too, by every route that deletes candidates.

const SUFFIX = `erasure-${Date.now()}`;

let adminId: number;
let departmentId: number;
const jobIds: number[] = [];

const erasedKeys = () =>
  requestResumeDeletion.mock.calls.flatMap(([keys]) => keys).filter(Boolean).sort();

async function makeJob(tag: string): Promise<number> {
  const [job] = await db
    .insert(jobs)
    .values({
      slug: `${tag}-${SUFFIX}`,
      title: `Job ${tag}`,
      departmentId,
      employmentType: "full_time",
      createdBy: adminId,
    })
    .returning({ id: jobs.id });
  jobIds.push(job!.id);
  return job!.id;
}

async function makeCandidate(jobId: number, tag: string, withCv = true) {
  const resumeKey = withCv ? `resumes/${tag}-${SUFFIX}.pdf` : null;
  const [candidate] = await db
    .insert(candidates)
    .values({ firstName: tag, lastName: "Erasure", email: `${tag}.${SUFFIX}@example.test`, jobId, resumeKey })
    .returning({ id: candidates.id });
  return { id: candidate!.id, resumeKey };
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
  departmentId = dept!.id;

  const [admin] = await db
    .insert(users)
    .values({ name: "Admin Tester", firstName: "Admin", lastName: "Tester", email: `admin.${SUFFIX}@example.test`, role: "super_admin" })
    .returning();
  adminId = admin!.id;
});

beforeEach(() => requestResumeDeletion.mockClear());

afterAll(async () => {
  await db.delete(candidates).where(inArray(candidates.jobId, jobIds));
  await db.delete(jobs).where(inArray(jobs.id, jobIds));
  await db.delete(users).where(eq(users.id, adminId));
  await db.delete(company).where(eq(company.email, `co.${SUFFIX}@example.test`));
});

describe("deleting one candidate", () => {
  it("erases their CV file and everything stored about them", async () => {
    const jobId = await makeJob("single");
    const { id, resumeKey } = await makeCandidate(jobId, "single");
    await db.insert(candidateCvText).values({ candidateId: id, resumeKey: resumeKey!, text: "Private CV text" });
    await db.insert(emailMessages).values({
      candidateId: id,
      recipientEmail: `single.${SUFFIX}@example.test`,
      subject: "Hello",
      bodyHtml: "<p>Hello</p>",
    });

    const result = await candidateService.delete(id);

    expect(result).toEqual({ id, jobId });
    expect(erasedKeys()).toEqual([resumeKey]);
    expect(await db.select().from(candidates).where(eq(candidates.id, id))).toHaveLength(0);
    expect(await db.select().from(candidateCvText).where(eq(candidateCvText.candidateId, id))).toHaveLength(0);
    expect(await db.select().from(emailMessages).where(eq(emailMessages.candidateId, id))).toHaveLength(0);
  });

  it("asks for nothing to be erased when there was no CV", async () => {
    const jobId = await makeJob("no-cv");
    const { id } = await makeCandidate(jobId, "nocv", false);

    await candidateService.delete(id);

    expect(erasedKeys()).toEqual([]);
  });

  it("erases nothing when the candidate does not exist", async () => {
    expect(await candidateService.delete(2_000_000_000)).toBeNull();
    expect(requestResumeDeletion).not.toHaveBeenCalled();
  });
});

describe("deleting many candidates", () => {
  it("erases the file of each deleted candidate and of no one else", async () => {
    const jobId = await makeJob("bulk");
    const otherJobId = await makeJob("bulk-other");
    const first = await makeCandidate(jobId, "bulk-a");
    const second = await makeCandidate(jobId, "bulk-b");
    const kept = await makeCandidate(otherJobId, "bulk-kept");

    const deleted = await candidateService.deleteManyByFilters(jobId, {}, 2);

    expect(deleted.map((row) => row.id).sort()).toEqual([first.id, second.id].sort());
    expect(erasedKeys()).toEqual([first.resumeKey, second.resumeKey].sort());
    expect(erasedKeys()).not.toContain(kept.resumeKey);
    // Where the file was is not part of what the caller gets back.
    expect(deleted[0]).not.toHaveProperty("resumeKey");
    expect(deleted[0]).not.toHaveProperty("email");
  });
});

describe("deleting a job", () => {
  it("erases the CV files of the candidates deleted with it", async () => {
    const jobId = await makeJob("job");
    const first = await makeCandidate(jobId, "job-a");
    const second = await makeCandidate(jobId, "job-b");

    await jobService.delete(jobId);

    expect(erasedKeys()).toEqual([first.resumeKey, second.resumeKey].sort());
  });

  it("does the same when several jobs are deleted at once", async () => {
    const jobA = await makeJob("jobs-a");
    const jobB = await makeJob("jobs-b");
    const first = await makeCandidate(jobA, "jobs-a");
    const second = await makeCandidate(jobB, "jobs-b");

    await jobService.deleteMany([jobA, jobB]);

    expect(erasedKeys()).toEqual([first.resumeKey, second.resumeKey].sort());
  });
});
