import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import request from "supertest";

vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  const { jwks } = await import("../helpers/jwks-holder");
  return { ...actual, createRemoteJWKSet: () => async () => jwks.publicKey };
});
vi.mock("../../src/shared/services/mail.service", () => ({
  mailService: { sendEmail: vi.fn().mockResolvedValue(undefined) },
}));

import app from "../../src/app";
import { db } from "../../src/db";
import { company, departments } from "../../src/db/schema/company";
import { jobs } from "../../src/db/schema/jobs";
import { candidates } from "../../src/db/schema/candidates";
import { assignments, candidateAssignments, jobAssignmentAttachments, jobPipelineStages } from "../../src/db/schema";
import { candidateService } from "../../src/modules/candidate/candidate.service";
import { users } from "../../src/db/schema/users";
import { initTestKeys, bearer } from "../helpers/jwt";
import { mailService } from "../../src/shared/services/mail.service";
import { assignmentService } from "../../src/modules/assignment/assignment.service";

const SUFFIX = `as${Date.now()}`;
let managerAuth: string, interviewerAuth: string;
let managerId: number, interviewerId: number;
let companyId: number, departmentId: number, jobId: number, candidateId: number;
let assignmentId: number;
let token: string;

beforeAll(async () => {
  await initTestKeys();
  const [co] = await db.insert(company).values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` }).returning();
  companyId = co!.id;
  const [dept] = await db.insert(departments).values({ name: `Dept ${SUFFIX}`, companyId }).returning();
  departmentId = dept!.id;

  const manager = await bearer({ email: `manager.${SUFFIX}@example.test`, role: "hiring_manager", firstName: "Mia", lastName: "Manager" });
  const interviewer = await bearer({ email: `interviewer.${SUFFIX}@example.test`, role: "interviewer", firstName: "Ivan", lastName: "Interviewer" });
  managerAuth = manager.authorization;
  interviewerAuth = interviewer.authorization;
  managerId = manager.user.id;
  interviewerId = interviewer.user.id;

  const [job] = await db
    .insert(jobs)
    .values({
      title: `Engineer ${SUFFIX}`,
      slug: `engineer-${SUFFIX}`,
      description: "Test job",
      employmentType: "full_time",
      departmentId,
      status: "published",
      createdBy: managerId,
    })
    .returning();
  jobId = job!.id;

  const [candidate] = await db
    .insert(candidates)
    .values({ firstName: "Ada", lastName: "Lovelace", email: `ada.${SUFFIX}@example.test`, jobId })
    .returning();
  candidateId = candidate!.id;
});

afterAll(async () => {
  if (assignmentId) await db.delete(assignments).where(eq(assignments.id, assignmentId));
  await db.delete(candidates).where(eq(candidates.jobId, jobId));
  await db.delete(jobs).where(eq(jobs.id, jobId));
  await db.delete(departments).where(eq(departments.id, departmentId));
  await db.delete(company).where(eq(company.id, companyId));
  await db.delete(users).where(inArray(users.id, [managerId, interviewerId]));
});

describe("setting up an assignment", () => {
  const body = { title: `Build a job board ${SUFFIX}`, description: "Use any stack.", dueDays: 5, resources: [{ label: "Spec", url: "https://example.com/spec" }],
    submissionFields: [
      { id: "repo", label: "Repository", type: "link", required: true },
      { id: "hours", label: "Hours spent", type: "short_text", required: true },
    ],
  };

  it("lets a manager create one", async () => {
    const res = await request(app).post("/api/assignments").set("Authorization", managerAuth).send(body);
    expect(res.status).toBe(201);
    expect(res.body.data.dueDays).toBe(5);
    assignmentId = res.body.data.id;
  });

  it("refuses a resource link that is not a web address", async () => {
    const res = await request(app)
      .post("/api/assignments")
      .set("Authorization", managerAuth)
      .send({ ...body, resources: [{ label: "x", url: "javascript:alert(1)" }] });
    expect(res.status).toBe(400);
  });

  it("refuses an interviewer, who can read but not change", async () => {
    expect((await request(app).post("/api/assignments").set("Authorization", interviewerAuth).send(body)).status).toBe(403);
    expect((await request(app).get("/api/assignments").set("Authorization", interviewerAuth)).status).toBe(200);
  });
});

describe("sending and handing in", () => {
  const send = (auth: string, candidateIds: number[] = [candidateId]) =>
    request(app).post("/api/assignments/send").set("Authorization", auth).send({ candidateIds, assignmentId });

  it("emails the candidate once and reuses the same link on a second send", async () => {
    vi.mocked(mailService.sendEmail).mockClear();
    const first = await send(managerAuth);
    expect(first.status).toBe(200);
    expect(first.body.data).toEqual({ sent: 1, alreadyHad: 0, failed: [] });
    expect(mailService.sendEmail).toHaveBeenCalledTimes(1);
    const [row] = await db.select().from(candidateAssignments).where(eq(candidateAssignments.candidateId, candidateId));
    token = row!.token;

    const second = await send(managerAuth);
    expect(second.body.data).toEqual({ sent: 0, alreadyHad: 1, failed: [] });
    expect(mailService.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("sets the deadline from the assignment's days", async () => {
    const [row] = await db.select().from(candidateAssignments).where(eq(candidateAssignments.token, token));
    const days = (row!.dueAt.getTime() - row!.createdAt.getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(5);
  });

  it("does not let an interviewer send", async () => {
    expect((await send(interviewerAuth)).status).toBe(403);
  });

  it("sends to several at once, and reports the one that could not be sent", async () => {
    const [other] = await db
      .insert(candidates)
      .values({ firstName: "Grace", lastName: "Hopper", email: `grace.${SUFFIX}@example.test`, jobId })
      .returning();
    vi.mocked(mailService.sendEmail).mockClear();
    const res = await send(managerAuth, [candidateId, other!.id, 999_999_999]);
    expect(res.status).toBe(200);
    expect(res.body.data.sent).toBe(1);
    expect(res.body.data.alreadyHad).toBe(1);
    expect(res.body.data.failed).toHaveLength(1);
    expect(res.body.data.failed[0].candidateId).toBe(999_999_999);
    expect(mailService.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("does not leave a link behind when the email fails, so sending again works", async () => {
    const [third] = await db
      .insert(candidates)
      .values({ firstName: "Alan", lastName: "Turing", email: `alan.${SUFFIX}@example.test`, jobId })
      .returning();
    vi.mocked(mailService.sendEmail).mockRejectedValueOnce(new Error("mail is down"));
    const failed = await send(managerAuth, [third!.id]);
    expect(failed.body.data.sent).toBe(0);
    expect(failed.body.data.failed).toHaveLength(1);
    expect(await db.select().from(candidateAssignments).where(eq(candidateAssignments.candidateId, third!.id))).toHaveLength(0);

    const again = await send(managerAuth, [third!.id]);
    expect(again.body.data.sent).toBe(1);
  });

  it("shows the candidate the brief and nothing internal", async () => {
    const res = await request(app).get(`/public/assignment/${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.title).toContain("Build a job board");
    expect(res.body.data.firstName).toBe("Ada");
    expect(res.body.data).not.toHaveProperty("id");
    expect(res.body.data).not.toHaveProperty("token");
  });

  it("answers 404 for a link that does not exist", async () => {
    expect((await request(app).get("/public/assignment/nope")).status).toBe(404);
  });

  it("sends the form with the brief", async () => {
    const res = await request(app).get(`/public/assignment/${token}`);
    expect(res.body.data.submissionFields.map((f: { id: string }) => f.id)).toEqual(["repo", "hours"]);
  });

  it("refuses work that misses a required field or has an unusable link", async () => {
    const submit = (answers: Record<string, string>) => request(app).post(`/public/assignment/${token}/submit`).send({ answers });
    expect((await submit({})).status).toBe(400);
    expect((await submit({ repo: "https://github.com/a/b" })).status).toBe(400);
    expect((await submit({ repo: "javascript:alert(1)", hours: "3" })).status).toBe(400);
  });

  it("accepts work, and lets it be changed before the deadline", async () => {
    const first = await request(app).post(`/public/assignment/${token}/submit`).send({ answers: { repo: "https://github.com/a/b", hours: "3", stray: "x" } });
    expect(first.status).toBe(200);
    const again = await request(app).post(`/public/assignment/${token}/submit`).send({ answers: { repo: "https://github.com/a/c", hours: "4" } });
    expect(again.status).toBe(200);

    const list = await request(app).get(`/api/assignments/candidate/${candidateId}`).set("Authorization", managerAuth);
    expect(list.status).toBe(200);
    expect(list.body.data[0].status).toBe("submitted");
    expect(list.body.data[0].submissionAnswers).toEqual({ repo: "https://github.com/a/c", hours: "4" });
  });

  it("checks against the form that was sent, even after the assignment is edited", async () => {
    await request(app)
      .put(`/api/assignments/${assignmentId}`)
      .set("Authorization", managerAuth)
      .send({ submissionFields: [{ id: "other", label: "Something else", type: "short_text", required: true }] });
    const res = await request(app).post(`/public/assignment/${token}/submit`).send({ answers: { repo: "https://github.com/a/d", hours: "5" } });
    expect(res.status).toBe(200);
  });

  it("keeps an interviewer who is not on the job out of what was handed in", async () => {
    const res = await request(app).get(`/api/assignments/candidate/${candidateId}`).set("Authorization", interviewerAuth);
    expect(res.status).toBe(403);
  });

  it("stops accepting work after the deadline", async () => {
    await db.update(candidateAssignments).set({ dueAt: new Date(Date.now() - 1000) }).where(eq(candidateAssignments.token, token));
    const res = await request(app).post(`/public/assignment/${token}/submit`).send({ answers: { repo: "https://github.com/late/work", hours: "1" } });
    expect(res.status).toBe(410);
    expect(res.body.code).toBe("CLOSED");
  });
});

describe("the deadline check", () => {
  it("marks an unanswered assignment expired and leaves a handed-in one alone", async () => {
    const [handedIn] = await db.select().from(candidateAssignments).where(eq(candidateAssignments.token, token));
    const [open] = await db
      .insert(candidateAssignments)
      .values({ candidateId, assignmentId, token: `open-${SUFFIX}`, dueAt: new Date(Date.now() - 1000), submissionFields: handedIn!.submissionFields })
      .returning();

    await assignmentService.expireOverdue();

    const [after] = await db.select().from(candidateAssignments).where(eq(candidateAssignments.id, open!.id));
    expect(after!.status).toBe("expired");
    const [stillHandedIn] = await db.select().from(candidateAssignments).where(eq(candidateAssignments.id, handedIn!.id));
    expect(stillHandedIn!.status).toBe("submitted");
  });
});

describe("sending when a candidate reaches a stage", () => {
  let stageId: number, startStageId: number, otherJobStageId: number, otherJobId: number, attachmentId: number;

  beforeAll(async () => {
    const [start, stage] = await db
      .insert(jobPipelineStages)
      .values([
        { jobId, name: "Start", position: 80 },
        { jobId, name: "Take-home", position: 90 },
      ])
      .returning();
    startStageId = start!.id;
    stageId = stage!.id;
    const [otherJob] = await db
      .insert(jobs)
      .values({ title: `Other ${SUFFIX}`, slug: `other-${SUFFIX}`, description: "x", employmentType: "full_time", departmentId, status: "published", createdBy: managerId })
      .returning();
    otherJobId = otherJob!.id;
    const [otherStage] = await db.insert(jobPipelineStages).values({ jobId: otherJobId, name: "Elsewhere", position: 1 }).returning();
    otherJobStageId = otherStage!.id;
  });

  afterAll(async () => {
    await db.delete(jobAssignmentAttachments).where(eq(jobAssignmentAttachments.jobId, jobId));
    await db.delete(jobs).where(eq(jobs.id, otherJobId));
  });

  const attach = (auth: string, body: object) =>
    request(app).post(`/api/assignments/job/${jobId}`).set("Authorization", auth).send(body);

  it("lets a manager attach an assignment to a stage of the job", async () => {
    const res = await attach(managerAuth, { assignmentId, triggerStageId: stageId });
    expect(res.status).toBe(201);
    attachmentId = res.body.data.id;
  });

  it("refuses a second assignment on the same stage, and a stage from another job", async () => {
    expect((await attach(managerAuth, { assignmentId, triggerStageId: stageId })).status).toBe(409);
    expect((await attach(managerAuth, { assignmentId, triggerStageId: otherJobStageId })).status).toBe(400);
  });

  it("keeps attaching to managers, and reading to people who may see the job", async () => {
    expect((await attach(interviewerAuth, { assignmentId, triggerStageId: stageId })).status).toBe(403);
    expect((await request(app).get(`/api/assignments/job/${jobId}`).set("Authorization", managerAuth)).body.data).toHaveLength(1);
    expect((await request(app).get(`/api/assignments/job/${jobId}`).set("Authorization", interviewerAuth)).status).toBe(403);
  });

  it("emails the assignment when a candidate is moved into the stage, once", async () => {
    const [mover] = await db
      .insert(candidates)
      .values({ firstName: "Edsger", lastName: "Dijkstra", email: `edsger.${SUFFIX}@example.test`, jobId })
      .returning();
    vi.mocked(mailService.sendEmail).mockClear();

    const moved = await candidateService.moveStage(mover!.id, stageId, managerId);
    expect(moved.stageAutomation.assignmentInvite).toBe("sent");
    expect(mailService.sendEmail).toHaveBeenCalledTimes(1);
    expect(await db.select().from(candidateAssignments).where(eq(candidateAssignments.candidateId, mover!.id))).toHaveLength(1);

    // Moving away and back does not send a second one.
    await candidateService.moveStage(mover!.id, startStageId, managerId);
    const again = await candidateService.moveStage(mover!.id, stageId, managerId);
    expect(again.stageAutomation.assignmentInvite).toBe("skipped_active_invite");
    expect(mailService.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("stops sending once it is removed", async () => {
    const res = await request(app).delete(`/api/assignments/job/${jobId}/${attachmentId}`).set("Authorization", managerAuth);
    expect(res.status).toBe(200);
    expect(await assignmentService.getForStage(jobId, stageId)).toBeNull();
  });
});
