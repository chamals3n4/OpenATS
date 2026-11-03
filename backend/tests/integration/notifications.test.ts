import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import request from "supertest";

vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  const { jwks } = await import("../helpers/jwks-holder");
  return { ...actual, createRemoteJWKSet: () => async () => jwks.publicKey };
});
const sendEmail = vi.fn(async (_email: { to: string; subject: string; html: string }) => undefined);
vi.mock("../../src/shared/services/mail.service", () => ({
  mailService: { sendEmail: (email: { to: string; subject: string; html: string }) => sendEmail(email) },
}));

import app from "../../src/app";
import { db } from "../../src/db";
import { company, departments } from "../../src/db/schema/company";
import { jobs } from "../../src/db/schema/jobs";
import { jobHiringTeam, jobPipelineStages } from "../../src/db/schema/pipeline";
import { candidates } from "../../src/db/schema/candidates";
import { candidateInterviews } from "../../src/db/schema/interviews";
import { notifications } from "../../src/db/schema/notifications";
import { users } from "../../src/db/schema/users";
import { notificationService } from "../../src/shared/services/notification.service";
import { interviewService } from "../../src/modules/interview/interview.service";
import { initTestKeys, bearer } from "../helpers/jwt";

const SUFFIX = `notif${Date.now()}`;
const DAY = 24 * 3_600_000;
let companyId: number, departmentId: number, jobId: number, stageId: number;
let manager: { id: number; auth: string };
let teammate: { id: number; auth: string };
let outsider: { id: number; auth: string };
let interviewer: { id: number; auth: string };
let inactiveId: number;
let n = 0;

async function person(tag: string, role: string) {
  const { authorization, user } = await bearer({ email: `${tag}.${SUFFIX}@example.test`, role, firstName: tag });
  return { id: user.id, auth: authorization };
}

async function addCandidate(tag: string) {
  const [row] = await db
    .insert(candidates)
    .values({ firstName: tag, lastName: "Tester", email: `${tag}.${++n}.${SUFFIX}@example.test`.toLowerCase(), jobId })
    .returning({ id: candidates.id });
  return row!.id;
}

/** Notifications are created after the response, so wait for them. */
async function rowsFor(userId: number, expected: number) {
  for (let i = 0; i < 50; i++) {
    const rows = await db.select().from(notifications).where(eq(notifications.userId, userId));
    if (rows.length >= expected) return rows;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return db.select().from(notifications).where(eq(notifications.userId, userId));
}

const list = async (auth: string) => (await request(app).get("/api/notifications").set("Authorization", auth)).body;

beforeAll(async () => {
  await initTestKeys();
  const [co] = await db.insert(company).values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` }).returning();
  companyId = co!.id;
  const [dept] = await db.insert(departments).values({ name: `Dept ${SUFFIX}`, companyId }).returning();
  departmentId = dept!.id;

  manager = await person("manager", "hiring_manager");
  teammate = await person("teammate", "hiring_manager");
  outsider = await person("outsider", "hiring_manager");
  interviewer = await person("interviewer", "interviewer");
  const inactive = await person("inactive", "hiring_manager");
  inactiveId = inactive.id;
  await db.update(users).set({ isActive: false }).where(eq(users.id, inactiveId));

  const [job] = await db
    .insert(jobs)
    .values({ title: `Job ${SUFFIX}`, slug: `job-${SUFFIX}`, employmentType: "full_time", departmentId, createdBy: manager.id })
    .returning();
  jobId = job!.id;
  await db.insert(jobHiringTeam).values([manager.id, teammate.id, inactiveId].map((userId) => ({ jobId, userId })));
  const [stage] = await db.insert(jobPipelineStages).values({ jobId, name: "Interview", position: 0 }).returning();
  stageId = stage!.id;
});

afterAll(async () => {
  await db.delete(candidates).where(eq(candidates.jobId, jobId));
  await db.delete(jobs).where(eq(jobs.id, jobId));
  await db.delete(departments).where(eq(departments.id, departmentId));
  await db.delete(company).where(eq(company.id, companyId));
  await db
    .delete(users)
    .where(inArray(users.id, [manager.id, teammate.id, outsider.id, interviewer.id, inactiveId]));
});

describe("who is told", () => {
  it("tells the active hiring team, not whoever did it, and nobody outside the team", async () => {
    const candidateId = await addCandidate("applied");
    await notificationService.notifyJobTeam({
      type: "application_received",
      jobId,
      candidateId,
      exclude: manager.id,
    });

    expect((await rowsFor(teammate.id, 1)).map((r) => r.type)).toContain("application_received");
    expect(await db.select().from(notifications).where(eq(notifications.userId, manager.id))).toHaveLength(0);
    expect(await db.select().from(notifications).where(eq(notifications.userId, inactiveId))).toHaveLength(0);
    expect(await db.select().from(notifications).where(eq(notifications.userId, outsider.id))).toHaveLength(0);

    const body = await list(teammate.auth);
    const item = body.data.find((row: { candidateId: number }) => row.candidateId === candidateId);
    expect(item).toMatchObject({ type: "application_received", candidateName: "applied Tester", jobTitle: `Job ${SUFFIX}` });
    expect(body.meta.unread).toBeGreaterThanOrEqual(1);
  });

  it("stops showing a job's notifications to someone taken off its team", async () => {
    const candidateId = await addCandidate("removed");
    await db.insert(jobHiringTeam).values({ jobId, userId: outsider.id });
    await notificationService.notifyJobTeam({ type: "offer_accepted", jobId, candidateId });
    await rowsFor(outsider.id, 1);
    expect((await list(outsider.auth)).data.some((r: { candidateId: number }) => r.candidateId === candidateId)).toBe(true);

    await db.delete(jobHiringTeam).where(eq(jobHiringTeam.userId, outsider.id));
    const after = await list(outsider.auth);
    expect(after.data).toHaveLength(0);
    expect(after.meta.unread).toBe(0);
  });

  it("removes a candidate's notifications when the candidate is deleted", async () => {
    const candidateId = await addCandidate("erased");
    await notificationService.notifyJobTeam({ type: "assignment_submitted", jobId, candidateId });
    await rowsFor(teammate.id, 1);
    await db.delete(candidates).where(eq(candidates.id, candidateId));
    expect(await db.select().from(notifications).where(eq(notifications.candidateId, candidateId))).toHaveLength(0);
  });
});

describe("marking read", () => {
  it("marks one, then all, and only ever the user's own", async () => {
    const candidateId = await addCandidate("reading");
    await notificationService.notifyJobTeam({ type: "offer_declined", jobId, candidateId });
    await notificationService.notifyJobTeam({ type: "assessment_completed", jobId, candidateId });
    const mine = (await rowsFor(teammate.id, 2)).filter((r) => r.candidateId === candidateId);
    const managersRow = (await rowsFor(manager.id, 1)).find((r) => r.candidateId === candidateId)!;

    // Someone else's id is ignored.
    await request(app)
      .post("/api/notifications/read")
      .set("Authorization", teammate.auth)
      .send({ ids: [mine[0]!.id, managersRow.id] })
      .expect(200);
    const [managerStill] = await db.select().from(notifications).where(eq(notifications.id, managersRow.id));
    expect(managerStill!.readAt).toBeNull();
    const [first] = await db.select().from(notifications).where(eq(notifications.id, mine[0]!.id));
    expect(first!.readAt).not.toBeNull();

    await request(app).post("/api/notifications/read").set("Authorization", teammate.auth).send({}).expect(200);
    expect((await list(teammate.auth)).meta.unread).toBe(0);
  });

  it("refuses ids that are not numbers", async () => {
    await request(app)
      .post("/api/notifications/read")
      .set("Authorization", teammate.auth)
      .send({ ids: ["1; drop table"] })
      .expect(400);
  });
});

describe("interviews", () => {
  it("tells the team and the interviewer, and emails the interviewer, when the candidate picks a time", async () => {
    const candidateId = await addCandidate("picked");
    const token = `iv-${SUFFIX}-${++n}`;
    const slot = new Date(Date.UTC(2032, 2, 3, 9, 0, 0));
    await db.insert(candidateInterviews).values({
      candidateId,
      jobId,
      stageId,
      eventName: "Interview",
      eventType: "onsite",
      location: "Office",
      interviewerId: interviewer.id,
      durationMinutes: 30,
      status: "pending_schedule",
      publicToken: token,
      tokenExpiresAt: new Date(Date.now() + 5 * DAY),
      timeSlots: [{ datetime: slot.toISOString(), selected: false }],
    });

    await request(app).patch(`/public/interview/${token}/select`).send({ slotIndex: 0 }).expect(200);

    const forInterviewer = await rowsFor(interviewer.id, 1);
    expect(forInterviewer.some((r) => r.type === "interview_booked" && r.candidateId === candidateId)).toBe(true);
    // Not on the team, but picked to interview, so it is shown to them.
    expect((await list(interviewer.auth)).data.some((r: { candidateId: number }) => r.candidateId === candidateId)).toBe(true);
    expect((await rowsFor(teammate.id, 1)).some((r) => r.type === "interview_booked" && r.candidateId === candidateId)).toBe(true);

    for (let i = 0; i < 50 && !sendEmail.mock.calls.some(([m]) => m.to === `interviewer.${SUFFIX}@example.test`); i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const mail = sendEmail.mock.calls.map(([m]) => m).find((m) => m.to === `interviewer.${SUFFIX}@example.test`);
    expect(mail?.subject).toContain("picked Tester");
    expect(mail?.html).toContain(`/candidates/${candidateId}`);
  });

  it("marks an unanswered time-picking link expired and tells the team, leaving live ones alone", async () => {
    const stale = await addCandidate("stale");
    const live = await addCandidate("live");
    const base = {
      jobId,
      stageId,
      eventName: "Interview",
      eventType: "onsite",
      interviewerId: interviewer.id,
      status: "pending_schedule",
      timeSlots: [],
    };
    const [old] = await db
      .insert(candidateInterviews)
      .values({ ...base, candidateId: stale, publicToken: `old-${SUFFIX}`, tokenExpiresAt: new Date(Date.now() - DAY) })
      .returning();
    const [fresh] = await db
      .insert(candidateInterviews)
      .values({ ...base, candidateId: live, publicToken: `new-${SUFFIX}`, tokenExpiresAt: new Date(Date.now() + DAY) })
      .returning();

    expect(await interviewService.expireStaleSlotLinks()).toBeGreaterThanOrEqual(1);

    const [oldNow] = await db.select().from(candidateInterviews).where(eq(candidateInterviews.id, old!.id));
    const [freshNow] = await db.select().from(candidateInterviews).where(eq(candidateInterviews.id, fresh!.id));
    expect(oldNow!.status).toBe("expired");
    expect(freshNow!.status).toBe("pending_schedule");
    expect((await rowsFor(teammate.id, 1)).some((r) => r.type === "interview_link_expired" && r.candidateId === stale)).toBe(
      true,
    );

    // Running it again changes nothing.
    const again = await db.select().from(notifications).where(eq(notifications.candidateId, stale));
    await interviewService.expireStaleSlotLinks();
    expect(await db.select().from(notifications).where(eq(notifications.candidateId, stale))).toHaveLength(again.length);
  });

  it("lists only the chosen interviewer's busy times, with no other details", async () => {
    const candidateId = await addCandidate("busy");
    const at = new Date(Date.UTC(2033, 4, 6, 14, 0, 0));
    await db.insert(candidateInterviews).values({
      candidateId,
      jobId,
      stageId,
      eventName: "Interview",
      interviewerId: interviewer.id,
      durationMinutes: 45,
      status: "scheduled",
      scheduledAt: at,
    });

    const mine = await request(app)
      .get(`/api/interviews/allocated-slots?interviewerId=${interviewer.id}`)
      .set("Authorization", manager.auth)
      .expect(200);
    expect(mine.body.data).toContainEqual({
      start: at.toISOString(),
      end: new Date(at.getTime() + 45 * 60_000).toISOString(),
    });

    const someoneElse = await request(app)
      .get(`/api/interviews/allocated-slots?interviewerId=${teammate.id}`)
      .set("Authorization", manager.auth)
      .expect(200);
    expect(someoneElse.body.data).toEqual([]);

    const none = await request(app).get("/api/interviews/allocated-slots").set("Authorization", manager.auth).expect(200);
    expect(none.body.data).toEqual([]);
  });
});
