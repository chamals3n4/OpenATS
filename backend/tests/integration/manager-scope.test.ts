import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import request from "supertest";

vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  const { jwks } = await import("../helpers/jwks-holder");
  return { ...actual, createRemoteJWKSet: () => async () => jwks.publicKey };
});
vi.mock("../../src/queues/resume-delete/queue", () => ({ requestResumeDeletion: async () => undefined }));

import app from "../../src/app";
import { db } from "../../src/db";
import { company, departments } from "../../src/db/schema/company";
import { jobs } from "../../src/db/schema/jobs";
import { jobHiringTeam, jobPipelineStages } from "../../src/db/schema/pipeline";
import { candidates } from "../../src/db/schema/candidates";
import { users } from "../../src/db/schema/users";
import { initTestKeys, bearer } from "../helpers/jwt";

// A hiring manager works only on the jobs whose hiring team they are on; a super admin on every job.

const SUFFIX = `mscope${Date.now()}`;
let ownerAuth: string, adminAuth: string;
const userIds: number[] = [];
let companyId: number, departmentId: number;
let ownJob: number, otherJob: number, ownStage: number, otherStage: number;
let ownCandidate: number, otherCandidate: number;

const api = (auth: string) => ({
  get: (path: string) => request(app).get(`/api${path}`).set("Authorization", auth),
  put: (path: string, body: object = {}) => request(app).put(`/api${path}`).set("Authorization", auth).send(body),
  post: (path: string, body: object = {}) => request(app).post(`/api${path}`).set("Authorization", auth).send(body),
  delete: (path: string, body: object = {}) => request(app).delete(`/api${path}`).set("Authorization", auth).send(body),
});

beforeAll(async () => {
  await initTestKeys();
  const [co] = await db.insert(company).values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` }).returning();
  companyId = co!.id;
  const [dept] = await db.insert(departments).values({ name: `Dept ${SUFFIX}`, companyId }).returning();
  departmentId = dept!.id;

  const owner = await bearer({ email: `owner.${SUFFIX}@example.test`, role: "hiring_manager" });
  const other = await bearer({ email: `other.${SUFFIX}@example.test`, role: "hiring_manager" });
  const admin = await bearer({ email: `admin.${SUFFIX}@example.test`, role: "super_admin" });
  ownerAuth = owner.authorization;
  adminAuth = admin.authorization;
  userIds.push(owner.user.id, other.user.id, admin.user.id);

  const job = (tag: string, createdBy: number) => ({
    title: `${tag} ${SUFFIX}`,
    slug: `${tag}-${SUFFIX}`.toLowerCase(),
    employmentType: "full_time" as const,
    departmentId,
    status: "published" as const,
    createdBy,
  });
  const [a] = await db.insert(jobs).values(job("Own", owner.user.id)).returning();
  const [b] = await db.insert(jobs).values(job("Other", other.user.id)).returning();
  ownJob = a!.id;
  otherJob = b!.id;
  await db.insert(jobHiringTeam).values([
    { jobId: ownJob, userId: owner.user.id },
    { jobId: otherJob, userId: other.user.id },
  ]);
  const [s1] = await db.insert(jobPipelineStages).values({ jobId: ownJob, name: "Applied", position: 0 }).returning();
  const [s2] = await db.insert(jobPipelineStages).values({ jobId: otherJob, name: "Applied", position: 0 }).returning();
  ownStage = s1!.id;
  otherStage = s2!.id;
  const [c1] = await db.insert(candidates).values({ firstName: "Own", lastName: "C", email: `own.${SUFFIX}@example.test`, jobId: ownJob }).returning();
  const [c2] = await db.insert(candidates).values({ firstName: "Other", lastName: "C", email: `other.${SUFFIX}@example.test`, jobId: otherJob }).returning();
  ownCandidate = c1!.id;
  otherCandidate = c2!.id;
});

afterAll(async () => {
  await db.delete(candidates).where(inArray(candidates.jobId, [ownJob, otherJob]));
  await db.delete(jobs).where(inArray(jobs.id, [ownJob, otherJob]));
  await db.delete(users).where(inArray(users.id, userIds));
  await db.delete(departments).where(eq(departments.id, departmentId));
  await db.delete(company).where(eq(company.id, companyId));
});

describe("a hiring manager", () => {
  it("lists only the jobs and candidates of their own hiring teams", async () => {
    const jobIds = ((await api(ownerAuth).get("/jobs")).body.data as Array<{ id: number }>).map((j) => j.id);
    expect(jobIds).toContain(ownJob);
    expect(jobIds).not.toContain(otherJob);

    const candidateIds = ((await api(ownerAuth).get("/candidates?limit=200")).body.data as Array<{ id: number }>).map((c) => c.id);
    expect(candidateIds).toContain(ownCandidate);
    expect(candidateIds).not.toContain(otherCandidate);
  });

  it("can open and change their own job and its candidates", async () => {
    expect((await api(ownerAuth).get(`/jobs/${ownJob}`)).status).toBe(200);
    expect((await api(ownerAuth).get(`/candidates/${ownCandidate}`)).status).toBe(200);
    expect((await api(ownerAuth).put(`/jobs/${ownJob}`, { title: `Renamed ${SUFFIX}` })).status).toBe(200);
    expect((await api(ownerAuth).put(`/candidates/${ownCandidate}/stage`, { newStageId: ownStage })).status).toBe(200);
  });

  it("cannot open or change a job they are not on, or its candidates", async () => {
    expect((await api(ownerAuth).get(`/jobs/${otherJob}`)).status).toBe(403);
    expect((await api(ownerAuth).get(`/candidates/${otherCandidate}`)).status).toBe(403);
    expect((await api(ownerAuth).put(`/jobs/${otherJob}`, { title: "Taken over" })).status).toBe(403);
    expect((await api(ownerAuth).put(`/candidates/${otherCandidate}/stage`, { newStageId: otherStage })).status).toBe(403);
    expect((await api(ownerAuth).post(`/jobs/${otherJob}/pipeline`, { name: "Extra", position: 9 })).status).toBe(403);
    expect((await api(ownerAuth).delete(`/candidates/${otherCandidate}`)).status).toBe(403);
    expect((await api(ownerAuth).delete(`/jobs/${otherJob}`)).status).toBe(403);
  });

  it("cannot reach another job's candidates through a bulk action", async () => {
    expect((await api(ownerAuth).delete("/jobs/bulk", { ids: [otherJob] })).status).toBe(403);
    expect((await api(ownerAuth).delete("/candidates/bulk", { candidateIds: [ownCandidate, otherCandidate] })).status).toBe(403);
    expect((await api(ownerAuth).delete("/candidates/bulk", { jobId: otherJob, expectedCount: 1 })).status).toBe(403);
    expect((await api(ownerAuth).put("/candidates/bulk/stage", { candidateIds: [otherCandidate], newStageId: otherStage })).status).toBe(403);
    expect((await api(ownerAuth).post("/candidates/bulk/reject", { candidateIds: [otherCandidate], reason: "Not a fit" })).status).toBe(403);

    const [still] = await db.select({ id: candidates.id }).from(candidates).where(eq(candidates.id, otherCandidate));
    expect(still).toBeDefined();
  });
});

describe("a super admin", () => {
  it("sees and changes every job", async () => {
    const jobIds = ((await api(adminAuth).get("/jobs")).body.data as Array<{ id: number }>).map((j) => j.id);
    expect(jobIds).toEqual(expect.arrayContaining([ownJob, otherJob]));
    expect((await api(adminAuth).get(`/candidates/${otherCandidate}`)).status).toBe(200);
    expect((await api(adminAuth).put(`/jobs/${otherJob}`, { title: `Admin ${SUFFIX}` })).status).toBe(200);
  });
});

describe("company settings", () => {
  it("are changed by a super admin only", async () => {
    expect((await api(ownerAuth).post("/company/departments", { name: `New ${SUFFIX}` })).status).toBe(403);
    expect((await api(ownerAuth).put("/settings/ai", { enabled: false })).status).toBe(403);
  });
});
