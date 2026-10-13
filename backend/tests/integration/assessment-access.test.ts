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
import { jobHiringTeam } from "../../src/db/schema/pipeline";
import { candidates } from "../../src/db/schema/candidates";
import {
  assessments,
  assessmentQuestions,
  candidateAssessmentAttempts,
} from "../../src/db/schema";
import { users } from "../../src/db/schema/users";
import { initTestKeys, bearer } from "../helpers/jwt";
import { isPastDeadline } from "../../src/modules/assessment-execution/grading";

const SUFFIX = `aa${Date.now()}`;
let memberAuth: string, outsiderAuth: string, offTeamInterviewerAuth: string;
let memberId: number, outsiderId: number, offTeamInterviewerId: number;
let companyId: number, departmentId: number, jobId: number, candidateId: number, assessmentId: number, questionId: number;
let attemptId: number;
const liveToken = `live-${SUFFIX}`;
const lateToken = `late-${SUFFIX}`;

beforeAll(async () => {
  await initTestKeys();
  const [co] = await db.insert(company).values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` }).returning();
  companyId = co!.id;
  const [dept] = await db.insert(departments).values({ name: `Dept ${SUFFIX}`, companyId }).returning();
  departmentId = dept!.id;

  const member = await bearer({ email: `member.${SUFFIX}@example.test`, role: "hiring_manager", firstName: "On", lastName: "Team" });
  const outsider = await bearer({ email: `outsider.${SUFFIX}@example.test`, role: "hiring_manager", firstName: "Off", lastName: "Team" });
  const offTeamInterviewer = await bearer({ email: `interviewer.${SUFFIX}@example.test`, role: "interviewer", firstName: "Off", lastName: "Interviewer" });
  offTeamInterviewerAuth = offTeamInterviewer.authorization;
  offTeamInterviewerId = offTeamInterviewer.user.id;
  memberAuth = member.authorization;
  outsiderAuth = outsider.authorization;
  memberId = member.user.id;
  outsiderId = outsider.user.id;

  const [job] = await db
    .insert(jobs)
    .values({
      title: `Engineer ${SUFFIX}`,
      slug: `engineer-${SUFFIX}`,
      description: "Test job",
      employmentType: "full_time",
      departmentId,
      status: "published",
      createdBy: memberId,
    })
    .returning();
  jobId = job!.id;
  await db.insert(jobHiringTeam).values({ jobId, userId: memberId });

  const [candidate] = await db
    .insert(candidates)
    .values({ firstName: "Ada", lastName: "Lovelace", email: `ada.${SUFFIX}@example.test`, jobId })
    .returning();
  candidateId = candidate!.id;

  const [assessment] = await db
    .insert(assessments)
    .values({ title: `Test ${SUFFIX}`, timeLimit: 30, createdBy: memberId })
    .returning();
  assessmentId = assessment!.id;
  const [question] = await db
    .insert(assessmentQuestions)
    .values({ assessmentId, title: "Explain.", questionType: "short_answer", position: 1 })
    .returning();
  questionId = question!.id;

  const inAWeek = new Date(Date.now() + 7 * 86_400_000);
  const [live, late] = await db
    .insert(candidateAssessmentAttempts)
    .values([
      // Started a minute ago: well inside the 30 minutes.
      { candidateId, assessmentId, token: liveToken, expiresAt: inAWeek, status: "started", startedAt: new Date(Date.now() - 60_000) },
      // Started two hours ago: long past the limit, though the link itself is still valid.
      { candidateId, assessmentId, token: lateToken, expiresAt: inAWeek, status: "started", startedAt: new Date(Date.now() - 2 * 3_600_000) },
    ])
    .returning();
  attemptId = live!.id;
  void late;
});

afterAll(async () => {
  await db.delete(candidateAssessmentAttempts).where(eq(candidateAssessmentAttempts.assessmentId, assessmentId));
  await db.delete(assessments).where(eq(assessments.id, assessmentId));
  await db.delete(candidates).where(eq(candidates.jobId, jobId));
  await db.delete(jobHiringTeam).where(eq(jobHiringTeam.jobId, jobId));
  await db.delete(jobs).where(eq(jobs.id, jobId));
  await db.delete(departments).where(eq(departments.id, departmentId));
  await db.delete(company).where(eq(company.id, companyId));
  await db.delete(users).where(inArray(users.id, [memberId, outsiderId, offTeamInterviewerId]));
});

describe("who can see a candidate's assessments", () => {
  const get = (path: string, auth: string) => request(app).get(`/api/assessment-execution/${path}`).set("Authorization", auth);

  it("lets someone on the job's hiring team list the attempts and read the results", async () => {
    expect((await get(`candidate/${candidateId}`, memberAuth)).status).toBe(200);
    expect((await get(`attempts/${attemptId}/results`, memberAuth)).status).toBe(200);
  });

  it("lets a hiring manager who is not on that job, as for the rest of the candidate", async () => {
    expect((await get(`candidate/${candidateId}`, outsiderAuth)).status).toBe(200);
    expect((await get(`attempts/${attemptId}/results`, outsiderAuth)).status).toBe(200);
  });

  it("refuses an interviewer who is not on that job", async () => {
    expect((await get(`candidate/${candidateId}`, offTeamInterviewerAuth)).status).toBe(403);
    expect((await get(`attempts/${attemptId}/results`, offTeamInterviewerAuth)).status).toBe(403);
  });
});

describe("the rest of what is stored about a candidate follows the same rule", () => {
  const paths = () => [
    `/api/candidates/${candidateId}`,
    `/api/candidates/${candidateId}/emails`,
    `/api/candidates/${candidateId}/interviews`,
    `/api/candidates/${candidateId}/rejections`,
  ];
  const get = (path: string, auth: string) => request(app).get(path).set("Authorization", auth);

  it("is open to a hiring manager who is not on the job", async () => {
    for (const path of paths()) {
      expect((await get(path, outsiderAuth)).status, path).toBe(200);
    }
  });

  it("is closed to an interviewer who is not on the job", async () => {
    for (const path of paths()) {
      expect((await get(path, offTeamInterviewerAuth)).status, path).toBe(403);
    }
  });

  it("lets a hiring manager who is not on the job rate the candidate", async () => {
    const res = await request(app)
      .put(`/api/candidates/${candidateId}/rating`)
      .set("Authorization", outsiderAuth)
      .send({ rating: 4 });
    expect(res.status).toBe(200);
  });

  it("does not let an interviewer who is not on the job rate the candidate", async () => {
    const res = await request(app)
      .put(`/api/candidates/${candidateId}/rating`)
      .set("Authorization", offTeamInterviewerAuth)
      .send({ rating: 4 });
    expect(res.status).toBe(403);
  });

  it("keeps the team chat to the hiring team, manager or not", async () => {
    expect((await get(`/api/chat/candidate/${candidateId}`, memberAuth)).status).toBe(200);
    expect((await get(`/api/chat/candidate/${candidateId}`, outsiderAuth)).status).toBe(403);
    expect((await get(`/api/chat/job/${jobId}`, outsiderAuth)).status).toBe(403);
  });
});

describe("the time limit, checked by the server", () => {
  const answer = (token: string) =>
    request(app).post(`/public/assessment/${token}/answer`).send({ questionId, answerText: "An answer" });

  it("takes an answer while there is time left", async () => {
    expect((await answer(liveToken)).status).toBe(200);
  });

  it("refuses an answer once the time is up, and says why", async () => {
    const res = await answer(lateToken);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("TIME_UP");
  });

  it("still lets a late attempt be submitted, so it is not left open", async () => {
    const res = await request(app).post(`/public/assessment/${lateToken}/complete`).send({});
    expect(res.status).toBe(200);
  });
});

describe("isPastDeadline", () => {
  const start = new Date("2026-10-12T10:00:00Z");
  const at = (minutes: number, seconds = 0) => new Date(start.getTime() + minutes * 60_000 + seconds * 1000);

  it("allows the whole limit plus a short grace for the last answers", () => {
    expect(isPastDeadline(start, 30, at(29))).toBe(false);
    expect(isPastDeadline(start, 30, at(30, 59))).toBe(false);
    expect(isPastDeadline(start, 30, at(31, 1))).toBe(true);
  });

  it("has no deadline before the attempt starts", () => {
    expect(isPastDeadline(null, 30, at(500))).toBe(false);
  });
});
