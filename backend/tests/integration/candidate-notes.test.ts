import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import request from "supertest";

vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  const { jwks } = await import("../helpers/jwks-holder");
  return { ...actual, createRemoteJWKSet: () => async () => jwks.publicKey };
});
import app from "../../src/app";
import { db } from "../../src/db";
import { company, departments } from "../../src/db/schema/company";
import { candidates } from "../../src/db/schema/candidates";
import { jobs } from "../../src/db/schema/jobs";
import { jobHiringTeam, jobPipelineStages } from "../../src/db/schema/pipeline";
import { users } from "../../src/db/schema/users";
import { bearer, initTestKeys } from "../helpers/jwt";

const suffix = `notes-${Date.now()}`;
let companyId: number, jobId: number, candidateId: number, otherCandidateId: number, stageId: number;
let memberAuth: string, outsiderAuth: string, memberId: number, outsiderId: number;

beforeAll(async () => {
  await initTestKeys();
  const [co] = await db.insert(company).values({ name: suffix, email: `${suffix}@example.test` }).returning();
  companyId = co!.id;
  const [department] = await db.insert(departments).values({ companyId, name: suffix }).returning();
  const member = await bearer({ email: `member-${suffix}@example.test`, role: "interviewer" });
  const outsider = await bearer({ email: `outside-${suffix}@example.test`, role: "interviewer" });
  memberAuth = member.authorization; memberId = member.user.id;
  outsiderAuth = outsider.authorization; outsiderId = outsider.user.id;
  const [job] = await db.insert(jobs).values({ title: "Notes test", slug: suffix, departmentId: department!.id, employmentType: "full_time", createdBy: memberId }).returning();
  jobId = job!.id;
  await db.insert(jobHiringTeam).values({ jobId, userId: memberId });
  const [stage] = await db.insert(jobPipelineStages).values({ jobId, name: "Screening", position: 0 }).returning();
  stageId = stage!.id;
  const rows = await db.insert(candidates).values([
    { firstName: "Test", lastName: "One", email: `one-${suffix}@example.test`, jobId, currentStageId: stageId },
    { firstName: "Test", lastName: "Two", email: `two-${suffix}@example.test`, jobId, currentStageId: stageId },
  ]).returning();
  candidateId = rows[0]!.id; otherCandidateId = rows[1]!.id;
});

afterAll(async () => {
  await db.delete(candidates).where(inArray(candidates.id, [candidateId, otherCandidateId]));
  await db.delete(jobs).where(eq(jobs.id, jobId));
  await db.delete(company).where(eq(company.id, companyId));
  await db.delete(users).where(inArray(users.id, [memberId, outsiderId]));
});

describe("candidate notes routes", () => {
  it("protects candidate notes and retains the stage at creation through edits and stage renames", async () => {
    const base = `/api/candidates/${candidateId}/notes`;
    expect((await request(app).get(base)).status).toBe(401);
    expect((await request(app).get(base).set("Authorization", outsiderAuth)).status).toBe(403);
    expect((await request(app).post(base).set("Authorization", outsiderAuth).send({ body: "Private" })).status).toBe(403);
    expect((await request(app).post(base).set("Authorization", memberAuth).send({ body: " " })).status).toBe(400);

    const created = await request(app).post(base).set("Authorization", memberAuth).send({ body: "**First note**" });
    expect(created.status).toBe(201);
    const noteId = created.body.data.id;
    const list = await request(app).get(base).set("Authorization", memberAuth);
    expect(list.body.data).toEqual([expect.objectContaining({ id: noteId, authorId: memberId, body: "**First note**", stageName: "Screening" })]);
    expect(list.body.data[0].authorName).toBeTruthy();
    expect(list.body.data[0].createdAt).toBeTruthy();

    await db.update(jobPipelineStages).set({ name: "Renamed" }).where(eq(jobPipelineStages.id, stageId));
    expect((await request(app).patch(`${base}/${noteId}`).set("Authorization", memberAuth).send({ body: "Updated" })).status).toBe(200);
    expect((await request(app).get(base).set("Authorization", memberAuth)).body.data[0]).toMatchObject({ body: "Updated", stageName: "Screening" });
    expect((await request(app).patch(`${base}/${noteId}`).set("Authorization", outsiderAuth).send({ body: "Intrusion" })).status).toBe(403);
    expect((await request(app).delete(`/api/candidates/${otherCandidateId}/notes/${noteId}`).set("Authorization", memberAuth)).status).toBe(404);
    expect((await request(app).delete(`${base}/${noteId}`).set("Authorization", memberAuth)).status).toBe(200);
    expect((await request(app).get(base).set("Authorization", memberAuth)).body.data).toEqual([]);
  });
});
