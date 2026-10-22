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
vi.mock("../../src/queues/cv-extract/queue", () => ({ requestCvExtraction: vi.fn(async () => undefined) }));
vi.mock("../../src/queues/cv-analysis/queue", () => ({ requestCvAnalysis: vi.fn(async () => false) }));

import app from "../../src/app";
import { db } from "../../src/db";
import { company, departments } from "../../src/db/schema/company";
import { jobs } from "../../src/db/schema/jobs";
import { jobHiringTeam, jobPipelineStages } from "../../src/db/schema/pipeline";
import {
  assessmentQuestions,
  assessments,
  jobCustomQuestionOptions,
  jobCustomQuestions,
} from "../../src/db/schema/assessments";
import { candidateAssessmentAttempts, candidates } from "../../src/db/schema/candidates";
import { offers } from "../../src/db/schema/offers";
import { users } from "../../src/db/schema/users";
import { initTestKeys, bearer } from "../helpers/jwt";

// What the public endpoints send back. Anyone can call them, so each reply is checked to hold
// what the person's page needs and nothing else about what is stored.

const SUFFIX = `pubres${Date.now()}`;
let managerAuth: string, managerId: number;
let companyId: number, departmentId: number, jobId: number;
let knockoutQuestion: number, knockoutOption: number;
let assessmentId: number, assessmentQuestionId: number;
const attemptToken = `attempt-${SUFFIX}`;
const offerToken = `offer-${SUFFIX}`;

beforeAll(async () => {
  await initTestKeys();
  const [co] = await db.insert(company).values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` }).returning();
  companyId = co!.id;
  const [dept] = await db.insert(departments).values({ name: `Dept ${SUFFIX}`, companyId }).returning();
  departmentId = dept!.id;
  const manager = await bearer({ email: `manager.${SUFFIX}@example.test`, role: "hiring_manager" });
  managerAuth = manager.authorization;
  managerId = manager.user.id;

  const [job] = await db
    .insert(jobs)
    .values({
      title: `Engineer ${SUFFIX}`,
      slug: `engineer-${SUFFIX}`,
      description: "<p>Build things</p>",
      employmentType: "full_time",
      departmentId,
      status: "published",
      createdBy: managerId,
    })
    .returning();
  jobId = job!.id;
  await db.insert(jobHiringTeam).values({ jobId, userId: managerId });
  await db.insert(jobPipelineStages).values({ jobId, name: "Applied", position: 0 });

  const [question] = await db
    .insert(jobCustomQuestions)
    .values({ jobId, title: "Right to work?", questionType: "radio", position: 1 })
    .returning();
  knockoutQuestion = question!.id;
  const options = await db
    .insert(jobCustomQuestionOptions)
    .values([
      { questionId: knockoutQuestion, label: "Yes", position: 1, points: 10 },
      { questionId: knockoutQuestion, label: "No", position: 2, isKnockout: true },
    ])
    .returning();
  knockoutOption = options[1]!.id;

  const [candidate] = await db
    .insert(candidates)
    .values({ firstName: "Ada", lastName: "Lovelace", email: `ada.${SUFFIX}@example.test`, jobId })
    .returning();

  const [assessment] = await db
    .insert(assessments)
    .values({ title: `Test ${SUFFIX}`, timeLimit: 30, createdBy: managerId })
    .returning();
  assessmentId = assessment!.id;
  const [aq] = await db
    .insert(assessmentQuestions)
    .values({ assessmentId, title: "Explain.", questionType: "short_answer", position: 1 })
    .returning();
  assessmentQuestionId = aq!.id;
  await db.insert(candidateAssessmentAttempts).values({
    candidateId: candidate!.id,
    assessmentId,
    token: attemptToken,
    expiresAt: new Date(Date.now() + 7 * 86_400_000),
  });

  await db.insert(offers).values({
    candidateId: candidate!.id,
    jobId,
    status: "sent",
    salary: 250000,
    currency: "LKR",
    reviewToken: offerToken,
    createdBy: managerId,
  });
});

afterAll(async () => {
  await db.delete(offers).where(eq(offers.jobId, jobId));
  await db.delete(candidateAssessmentAttempts).where(eq(candidateAssessmentAttempts.assessmentId, assessmentId));
  await db.delete(assessments).where(eq(assessments.id, assessmentId));
  await db.delete(candidates).where(eq(candidates.jobId, jobId));
  await db.delete(jobs).where(eq(jobs.id, jobId));
  await db.delete(departments).where(eq(departments.id, departmentId));
  await db.delete(company).where(eq(company.id, companyId));
  await db.delete(users).where(inArray(users.id, [managerId]));
});

describe("applying", () => {
  const body = (tag: string) => ({
    firstName: "New",
    lastName: "Applicant",
    email: `${tag}.${SUFFIX}@example.test`,
    customAnswers: [{ questionId: knockoutQuestion, optionIds: [knockoutOption] }],
  });

  it("tells a knocked-out applicant only that the application arrived", async () => {
    const res = await request(app).post(`/public/jobs/${jobId}/apply`).send(body("knocked"));

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: { applied: true } });

    // It was recorded; the applicant just is not told.
    const [saved] = await db
      .select({ knockedOut: candidates.knockedOut })
      .from(candidates)
      .where(eq(candidates.email, `knocked.${SUFFIX}@example.test`));
    expect(saved?.knockedOut).toBe(true);
  });

  it("gives a manager adding an application the new candidate's id, and still no score", async () => {
    const res = await request(app)
      .post(`/api/candidates/jobs/${jobId}/apply`)
      .set("Authorization", managerAuth)
      .send(body("bymanager"));

    expect(res.status).toBe(201);
    expect(Object.keys(res.body.data).sort()).toEqual(["applied", "id", "jobId"]);
  });
});

describe("a published job", () => {
  it("is sent with its public fields only", async () => {
    const res = await request(app).get(`/public/jobs/${jobId}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: jobId, title: `Engineer ${SUFFIX}`, description: "<p>Build things</p>" });
    for (const hidden of [
      "createdBy",
      "hiringTeam",
      "pipelineStages",
      "applicationEmailTemplateId",
      "scoreWeightQuestions",
      "scoreWeightAssessment",
      "scoreWeightRating",
      "scoreWeightInterview",
    ]) {
      expect(res.body.data, hidden).not.toHaveProperty(hidden);
    }
  });
});

describe("a candidate's assessment", () => {
  const post = (step: string, body: object = {}) =>
    request(app).post(`/public/assessment/${attemptToken}/${step}`).send(body);

  it("starts with only the status and the start time", async () => {
    const res = await post("start");

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data).sort()).toEqual(["startedAt", "status"]);
    expect(res.body.data.status).toBe("started");
  });

  it("confirms a saved answer without sending the stored row", async () => {
    const res = await post("answer", { questionId: assessmentQuestionId, answerText: "Because." });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ questionId: assessmentQuestionId, saved: true });
  });

  it("does not tell the candidate their score or whether they passed", async () => {
    const res = await post("complete");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ completed: true });
    expect(JSON.stringify(res.body)).not.toMatch(/passed|score/i);
  });
});

describe("a candidate's offer", () => {
  it("is accepted with only the new status in reply", async () => {
    const res = await request(app).post(`/public/offers/${offerToken}/accept`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { status: "accepted" } });
  });
});
