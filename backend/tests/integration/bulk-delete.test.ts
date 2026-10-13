import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import request from "supertest";

vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  const { jwks } = await import("../helpers/jwks-holder");
  return { ...actual, createRemoteJWKSet: () => async () => jwks.publicKey };
});
const requestResumeDeletion = vi.fn(async (_keys: Array<string | null | undefined>) => undefined);
vi.mock("../../src/queues/resume-delete/queue", () => ({
  requestResumeDeletion: (keys: Array<string | null | undefined>) => requestResumeDeletion(keys),
}));

import app from "../../src/app";
import { db } from "../../src/db";
import { company, departments } from "../../src/db/schema/company";
import { jobs } from "../../src/db/schema/jobs";
import { candidateCvText, candidates } from "../../src/db/schema/candidates";
import { users } from "../../src/db/schema/users";
import { initTestKeys, bearer } from "../helpers/jwt";

// A bulk delete has to say exactly what it deletes. It used to take optional filters, so an empty
// body deleted every candidate in the installation.

const SUFFIX = `bulkdel${Date.now()}`;
let managerAuth: string, interviewerAuth: string;
const userIds: number[] = [];
let companyId: number, departmentId: number, jobA: number, jobB: number;

const bulkDelete = (body: unknown, auth = managerAuth) =>
  request(app).delete("/api/candidates/bulk").set("Authorization", auth).send(body as object);

const idsIn = async (jobId: number) =>
  (await db.select({ id: candidates.id }).from(candidates).where(eq(candidates.jobId, jobId)))
    .map((row) => row.id)
    .sort((a, b) => a - b);

async function addCandidates(jobId: number, names: string[], status: "active" | "rejected" = "active") {
  const rows = await db
    .insert(candidates)
    .values(
      names.map((name) => ({
        firstName: name,
        lastName: "Bulk",
        email: `${name}.${jobId}.${SUFFIX}@example.test`.toLowerCase(),
        jobId,
        status,
        resumeKey: `resumes/${name}-${jobId}-${SUFFIX}.pdf`.toLowerCase(),
      })),
    )
    .returning({ id: candidates.id });
  return rows.map((row) => row.id);
}

beforeAll(async () => {
  await initTestKeys();
  const [co] = await db.insert(company).values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` }).returning();
  companyId = co!.id;
  const [dept] = await db.insert(departments).values({ name: `Dept ${SUFFIX}`, companyId }).returning();
  departmentId = dept!.id;

  const manager = await bearer({ email: `manager.${SUFFIX}@example.test`, role: "hiring_manager" });
  const interviewer = await bearer({ email: `interviewer.${SUFFIX}@example.test`, role: "interviewer" });
  managerAuth = manager.authorization;
  interviewerAuth = interviewer.authorization;
  userIds.push(manager.user.id, interviewer.user.id);

  const rows = await db
    .insert(jobs)
    .values(
      ["a", "b"].map((tag) => ({
        title: `Job ${tag} ${SUFFIX}`,
        slug: `job-${tag}-${SUFFIX}`,
        employmentType: "full_time" as const,
        departmentId,
        createdBy: manager.user.id,
      })),
    )
    .returning({ id: jobs.id });
  jobA = rows[0]!.id;
  jobB = rows[1]!.id;
});

beforeEach(async () => {
  requestResumeDeletion.mockClear();
  await db.delete(candidates).where(inArray(candidates.jobId, [jobA, jobB]));
});

afterAll(async () => {
  await db.delete(candidates).where(inArray(candidates.jobId, [jobA, jobB]));
  await db.delete(jobs).where(inArray(jobs.id, [jobA, jobB]));
  await db.delete(departments).where(eq(departments.id, departmentId));
  await db.delete(company).where(eq(company.id, companyId));
  await db.delete(users).where(inArray(users.id, userIds));
});

describe("a bulk delete that does not say what to delete", () => {
  it.each([
    ["an empty body", {}],
    ["only a search", { search: "java" }],
    ["only a status", { status: "active" }],
    ["only a stage", { stageId: 1 }],
    ["a job without the number to delete", { jobId: 0 }],
    ["an empty list of candidates", { candidateIds: [] }],
    ["more than 200 candidates", { candidateIds: Array.from({ length: 201 }, (_, i) => i + 1) }],
  ])("is refused: %s", async (_name, body) => {
    const before = await addCandidates(jobA, ["ann", "ben"]);

    const res = await bulkDelete(body);

    expect(res.status).toBe(400);
    expect(await idsIn(jobA)).toEqual(before);
    expect(requestResumeDeletion).not.toHaveBeenCalled();
  });

  it("is refused when the job has no confirmed number", async () => {
    const before = await addCandidates(jobA, ["ann", "ben"]);

    const res = await bulkDelete({ jobId: jobA });

    expect(res.status).toBe(400);
    expect(await idsIn(jobA)).toEqual(before);
  });

  it("is refused when a list of candidates is mixed with filters", async () => {
    const [ann] = await addCandidates(jobA, ["ann", "ben"]);

    const res = await bulkDelete({ candidateIds: [ann], search: "ben" });

    expect(res.status).toBe(400);
    expect(await idsIn(jobA)).toHaveLength(2);
  });
});

describe("deleting the candidates that were picked", () => {
  it("deletes exactly those, and has their CV files erased", async () => {
    const [ann, ben, cat] = await addCandidates(jobA, ["ann", "ben", "cat"]);

    const res = await bulkDelete({ candidateIds: [ann, cat] });

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(2);
    expect(await idsIn(jobA)).toEqual([ben]);
    expect(requestResumeDeletion.mock.calls[0]![0]).toHaveLength(2);
  });

  it("skips ids that no longer exist", async () => {
    const [ann] = await addCandidates(jobA, ["ann"]);

    const res = await bulkDelete({ candidateIds: [ann, 2_000_000_000] });

    expect(res.status).toBe(200);
    expect(res.body.data.ids).toEqual([ann]);
  });
});

describe("deleting everyone who matches in one job", () => {
  it("deletes them when the number is the one that was confirmed", async () => {
    await addCandidates(jobA, ["ann", "ben"]);
    const others = await addCandidates(jobB, ["cat"]);

    const res = await bulkDelete({ jobId: jobA, expectedCount: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(2);
    expect(await idsIn(jobA)).toEqual([]);
    // Never reaches another job.
    expect(await idsIn(jobB)).toEqual(others);
  });

  it("deletes nothing when a different number matches now", async () => {
    const before = await addCandidates(jobA, ["ann", "ben", "cat"]);

    const res = await bulkDelete({ jobId: jobA, expectedCount: 2 });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: "COUNT_CHANGED", count: 3 });
    expect(await idsIn(jobA)).toEqual(before);
    expect(requestResumeDeletion).not.toHaveBeenCalled();
  });

  it("applies the status filter", async () => {
    const active = await addCandidates(jobA, ["ann"]);
    await addCandidates(jobA, ["ben", "cat"], "rejected");

    const res = await bulkDelete({ jobId: jobA, status: "rejected", expectedCount: 2 });

    expect(res.status).toBe(200);
    expect(await idsIn(jobA)).toEqual(active);
  });

  it("a search that also matches a CV is caught by the number, not deleted on the quiet", async () => {
    const [ann, ben] = await addCandidates(jobA, ["javaid", "ben"]);
    // Ben's name does not match "java", but his CV does.
    await db.insert(candidateCvText).values({
      candidateId: ben!,
      resumeKey: "resumes/ben.pdf",
      status: "done",
      text: "Five years of Java",
      searchText: "Five years of Java",
    });

    // The person saw one name match and confirmed 1; with the CV match there are two.
    const res = await bulkDelete({ jobId: jobA, search: "java", expectedCount: 1 });

    expect(res.status).toBe(409);
    expect(await idsIn(jobA)).toEqual([ann, ben].sort((a, b) => a! - b!));
  });
});

describe("who may bulk delete", () => {
  it("not an interviewer", async () => {
    const [ann] = await addCandidates(jobA, ["ann"]);

    const res = await bulkDelete({ candidateIds: [ann] }, interviewerAuth);

    expect(res.status).toBe(403);
    expect(await idsIn(jobA)).toEqual([ann]);
  });
});
