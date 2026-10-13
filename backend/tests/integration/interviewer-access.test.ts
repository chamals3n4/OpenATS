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
import { jobHiringTeam, jobPipelineStages } from "../../src/db/schema/pipeline";
import { candidates } from "../../src/db/schema/candidates";
import { candidateInterviews } from "../../src/db/schema/interviews";
import { offers } from "../../src/db/schema/offers";
import { users } from "../../src/db/schema/users";
import { initTestKeys, bearer } from "../helpers/jwt";

// An interviewer works on the jobs they are on the hiring team for. These cover what they could
// reach beyond that through the API: offers (with salaries), every interview, and the make-up of
// any job.

const SUFFIX = `ivacc${Date.now()}`;
let managerAuth: string, onTeamAuth: string, assignedAuth: string, outsiderAuth: string;
const userIds: number[] = [];
let companyId: number, departmentId: number;
let teamJob: number, otherJob: number, teamJobSlug: string;
let teamInterview: number, otherInterview: number, assignedInterview: number;
let offerId: number;

const as = (auth: string) => ({
  get: (path: string) => request(app).get(`/api${path}`).set("Authorization", auth),
  post: (path: string, body: object = {}) =>
    request(app).post(`/api${path}`).set("Authorization", auth).send(body),
});

beforeAll(async () => {
  await initTestKeys();
  const [co] = await db.insert(company).values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` }).returning();
  companyId = co!.id;
  const [dept] = await db.insert(departments).values({ name: `Dept ${SUFFIX}`, companyId }).returning();
  departmentId = dept!.id;

  // A hiring manager who is on no hiring team: managers are not limited by it.
  const manager = await bearer({ email: `manager.${SUFFIX}@example.test`, role: "hiring_manager" });
  const onTeam = await bearer({ email: `onteam.${SUFFIX}@example.test`, role: "interviewer" });
  // Picked to run one interview on the team job, without being on its hiring team.
  const assigned = await bearer({ email: `assigned.${SUFFIX}@example.test`, role: "interviewer" });
  const outsider = await bearer({ email: `outsider.${SUFFIX}@example.test`, role: "interviewer" });
  managerAuth = manager.authorization;
  onTeamAuth = onTeam.authorization;
  assignedAuth = assigned.authorization;
  outsiderAuth = outsider.authorization;
  userIds.push(manager.user.id, onTeam.user.id, assigned.user.id, outsider.user.id);

  teamJobSlug = `team-${SUFFIX}`;
  const jobRows = await db
    .insert(jobs)
    .values(
      [teamJobSlug, `other-${SUFFIX}`].map((slug) => ({
        title: `Job ${slug}`,
        slug,
        employmentType: "full_time" as const,
        departmentId,
        createdBy: manager.user.id,
      })),
    )
    .returning({ id: jobs.id });
  teamJob = jobRows[0]!.id;
  otherJob = jobRows[1]!.id;
  await db.insert(jobHiringTeam).values({ jobId: teamJob, userId: onTeam.user.id });

  const stages = await db
    .insert(jobPipelineStages)
    .values([teamJob, otherJob].map((jobId) => ({ jobId, name: "Interview", position: 0 })))
    .returning({ id: jobPipelineStages.id });

  const people = await db
    .insert(candidates)
    .values([
      { firstName: "Tia", lastName: "Team", email: `tia.${SUFFIX}@example.test`, jobId: teamJob },
      { firstName: "Otto", lastName: "Other", email: `otto.${SUFFIX}@example.test`, jobId: otherJob },
    ])
    .returning({ id: candidates.id });

  const interviews = await db
    .insert(candidateInterviews)
    .values([
      { candidateId: people[0]!.id, jobId: teamJob, stageId: stages[0]!.id, eventName: "Team interview" },
      { candidateId: people[1]!.id, jobId: otherJob, stageId: stages[1]!.id, eventName: "Other interview" },
      { candidateId: people[0]!.id, jobId: teamJob, stageId: stages[0]!.id, eventName: "Assigned interview", interviewerId: assigned.user.id },
    ])
    .returning({ id: candidateInterviews.id });
  teamInterview = interviews[0]!.id;
  otherInterview = interviews[1]!.id;
  assignedInterview = interviews[2]!.id;

  const [offer] = await db
    .insert(offers)
    .values({ candidateId: people[0]!.id, jobId: teamJob, status: "sent", salary: 250000, currency: "LKR", createdBy: manager.user.id })
    .returning({ id: offers.id });
  offerId = offer!.id;
});

afterAll(async () => {
  await db.delete(offers).where(eq(offers.id, offerId));
  await db.delete(candidates).where(inArray(candidates.jobId, [teamJob, otherJob]));
  await db.delete(jobs).where(inArray(jobs.id, [teamJob, otherJob]));
  await db.delete(departments).where(eq(departments.id, departmentId));
  await db.delete(company).where(eq(company.id, companyId));
  await db.delete(users).where(inArray(users.id, userIds));
});

describe("offers", () => {
  it("cannot be read by an interviewer, even one on the job's hiring team", async () => {
    for (const path of ["/offers", `/offers/${offerId}`, `/offers/job/${teamJob}`]) {
      expect((await as(onTeamAuth).get(path)).status, path).toBe(403);
      expect((await as(outsiderAuth).get(path)).status, path).toBe(403);
    }
  });

  it("cannot be accepted or declined by an interviewer", async () => {
    expect((await as(onTeamAuth).post(`/offers/${offerId}/accept`)).status).toBe(403);
    expect((await as(outsiderAuth).post(`/offers/${offerId}/decline`)).status).toBe(403);

    const [offer] = await db.select({ status: offers.status }).from(offers).where(eq(offers.id, offerId));
    expect(offer?.status).toBe("sent");
  });

  it("are open to a hiring manager", async () => {
    expect((await as(managerAuth).get("/offers")).status).toBe(200);
    expect((await as(managerAuth).get(`/offers/${offerId}`)).status).toBe(200);
  });
});

describe("the interviews list", () => {
  const listed = async (auth: string) =>
    ((await as(auth).get("/interviews")).body.data as Array<{ id: number }>).map((row) => row.id);

  it("shows an interviewer the interviews of their own jobs only", async () => {
    const ids = await listed(onTeamAuth);
    expect(ids).toEqual(expect.arrayContaining([teamInterview, assignedInterview]));
    expect(ids).not.toContain(otherInterview);
  });

  it("shows an interviewer the interviews assigned to them, and no others on that job", async () => {
    expect(await listed(assignedAuth)).toEqual([assignedInterview]);
  });

  it("shows nothing to an interviewer with no job and no interview", async () => {
    expect(await listed(outsiderAuth)).toEqual([]);
  });

  it("shows a hiring manager every interview", async () => {
    expect(await listed(managerAuth)).toEqual(
      expect.arrayContaining([teamInterview, otherInterview, assignedInterview]),
    );
  });

  it("does not give an interviewer everyone's booked times", async () => {
    expect((await as(onTeamAuth).get("/interviews/allocated-slots")).status).toBe(403);
    expect((await as(managerAuth).get("/interviews/allocated-slots")).status).toBe(200);
  });
});

describe("scorecards on an interview", () => {
  const scorecard = { content: "Clear communicator", recommendation: "yes" };

  it("can be read and written by an interviewer on the job, and by the one it is assigned to", async () => {
    expect((await as(onTeamAuth).get(`/interviews/${teamInterview}/feedback`)).status).toBe(200);
    expect((await as(assignedAuth).get(`/interviews/${assignedInterview}/feedback`)).status).toBe(200);
    expect((await as(assignedAuth).post(`/interviews/${assignedInterview}/feedback`, scorecard)).status).toBe(201);
  });

  it("cannot be read or written by another interviewer", async () => {
    expect((await as(outsiderAuth).get(`/interviews/${teamInterview}/feedback`)).status).toBe(403);
    expect((await as(outsiderAuth).post(`/interviews/${teamInterview}/feedback`, scorecard)).status).toBe(403);
    // Assigned to one interview on the job is not being on the job.
    expect((await as(assignedAuth).get(`/interviews/${teamInterview}/feedback`)).status).toBe(403);
    expect((await as(onTeamAuth).get(`/interviews/${otherInterview}/feedback`)).status).toBe(403);
  });

  it("stays open to a hiring manager on any job", async () => {
    expect((await as(managerAuth).get(`/interviews/${otherInterview}/feedback`)).status).toBe(200);
  });
});

describe("what a job is made of", () => {
  const paths = (jobId: number) => [
    `/jobs/${jobId}`,
    `/jobs/${jobId}/pipeline`,
    `/jobs/${jobId}/team`,
    `/jobs/${jobId}/assessments`,
    `/jobs/${jobId}/scorecard`,
    `/jobs/${jobId}/questions`,
    `/jobs/${jobId}/questions/assessment-attachment`,
  ];

  it("is open to an interviewer on the job", async () => {
    for (const path of [...paths(teamJob), `/jobs/slug/${teamJobSlug}`]) {
      expect((await as(onTeamAuth).get(path)).status, path).toBe(200);
    }
  });

  it("is closed to an interviewer who is not on the job", async () => {
    for (const path of [...paths(teamJob), `/jobs/slug/${teamJobSlug}`]) {
      expect((await as(outsiderAuth).get(path)).status, path).toBe(403);
    }
    for (const path of paths(otherJob)) {
      expect((await as(onTeamAuth).get(path)).status, path).toBe(403);
    }
  });

  it("is open to a hiring manager who is not on the job", async () => {
    for (const path of paths(otherJob)) {
      expect((await as(managerAuth).get(path)).status, path).toBe(200);
    }
  });
});

describe("adding an application from the dashboard", () => {
  it("is not for interviewers", async () => {
    const res = await as(onTeamAuth).post(`/candidates/jobs/${teamJob}/apply`, {
      firstName: "Made",
      lastName: "Up",
      email: `madeup.${SUFFIX}@example.test`,
    });

    expect(res.status).toBe(403);
    expect(await db.select().from(candidates).where(eq(candidates.email, `madeup.${SUFFIX}@example.test`))).toHaveLength(0);
  });
});
