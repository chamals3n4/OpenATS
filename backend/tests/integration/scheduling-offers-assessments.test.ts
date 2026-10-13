import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
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
import { jobPipelineStages } from "../../src/db/schema/pipeline";
import { assessmentQuestions, assessments } from "../../src/db/schema/assessments";
import { candidateAssessmentAttempts, candidates } from "../../src/db/schema/candidates";
import { candidateActivities } from "../../src/db/schema/candidate-activities";
import { candidateInterviews } from "../../src/db/schema/interviews";
import { offers } from "../../src/db/schema/offers";
import { users } from "../../src/db/schema/users";
import { assessmentExecutionService } from "../../src/modules/assessment-execution/assessment-execution.service";
import { offerService } from "../../src/modules/offer/offer.service";
import { initTestKeys, bearer } from "../helpers/jwt";

// Things that go wrong when two requests arrive together, or when nobody comes back: a slot booked
// twice, an offer both accepted and declined, an assessment left open for ever.

const SUFFIX = `sched${Date.now()}`;
const HOUR = 3_600_000;
let adminAuth: string, adminId: number, interviewerId: number, otherInterviewerId: number;
let companyId: number, departmentId: number, jobId: number, stageId: number;
let assessmentId: number;
const candidateIds: number[] = [];
let n = 0;

const mailTo = (email: string) => sendEmail.mock.calls.map(([mail]) => mail).filter((mail) => mail.to === email);

async function addCandidate(tag: string) {
  const [row] = await db
    .insert(candidates)
    .values({ firstName: tag, lastName: "Tester", email: `${tag}.${++n}.${SUFFIX}@example.test`.toLowerCase(), jobId })
    .returning({ id: candidates.id, email: candidates.email });
  candidateIds.push(row!.id);
  return row!;
}

beforeAll(async () => {
  await initTestKeys();
  const [co] = await db
    .insert(company)
    .values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` })
    .returning();
  companyId = co!.id;
  const [dept] = await db.insert(departments).values({ name: `Dept ${SUFFIX}`, companyId }).returning();
  departmentId = dept!.id;

  const admin = await bearer({ email: `admin.${SUFFIX}@example.test`, role: "super_admin" });
  const interviewer = await bearer({ email: `iv.${SUFFIX}@example.test`, role: "interviewer" });
  const other = await bearer({ email: `iv2.${SUFFIX}@example.test`, role: "interviewer" });
  adminAuth = admin.authorization;
  adminId = admin.user.id;
  interviewerId = interviewer.user.id;
  otherInterviewerId = other.user.id;

  const [job] = await db
    .insert(jobs)
    .values({ title: `Job ${SUFFIX}`, slug: `job-${SUFFIX}`, employmentType: "full_time", departmentId, createdBy: adminId })
    .returning();
  jobId = job!.id;
  const [stage] = await db.insert(jobPipelineStages).values({ jobId, name: "Interview", position: 0 }).returning();
  stageId = stage!.id;

  const [assessment] = await db
    .insert(assessments)
    .values({ title: `Test ${SUFFIX}`, timeLimit: 30, createdBy: adminId })
    .returning();
  assessmentId = assessment!.id;
  await db
    .insert(assessmentQuestions)
    .values({ assessmentId, title: "Explain.", questionType: "short_answer", position: 1 });
});

beforeEach(() => {
  sendEmail.mockClear();
});

afterAll(async () => {
  await db.delete(offers).where(eq(offers.jobId, jobId));
  await db.delete(candidateAssessmentAttempts).where(eq(candidateAssessmentAttempts.assessmentId, assessmentId));
  await db.delete(assessments).where(eq(assessments.id, assessmentId));
  await db.delete(candidates).where(eq(candidates.jobId, jobId));
  await db.delete(jobs).where(eq(jobs.id, jobId));
  await db.delete(departments).where(eq(departments.id, departmentId));
  await db.delete(company).where(eq(company.id, companyId));
  await db.delete(users).where(inArray(users.id, [adminId, interviewerId, otherInterviewerId]));
});

// ── Interviews ────────────────────────────────────────────────────────────────

describe("booking an interview", () => {
  let day = 20;
  // A fresh day for each test, so one test's bookings never get in the way of the next.
  const nextDay = () => new Date(Date.UTC(2031, 0, day++, 10, 0, 0));
  const plus = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60_000);

  async function invite(slots: Date[], interviewer = interviewerId, durationMinutes = 60) {
    const candidate = await addCandidate("slot");
    const token = `iv-${SUFFIX}-${++n}`;
    const [iv] = await db
      .insert(candidateInterviews)
      .values({
        candidateId: candidate.id,
        jobId,
        stageId,
        eventName: "Interview",
        eventType: "onsite",
        location: "Office",
        interviewerId: interviewer,
        durationMinutes,
        status: "pending_schedule",
        publicToken: token,
        tokenExpiresAt: new Date(Date.now() + 5 * 24 * HOUR),
        timeSlots: slots.map((slot) => ({ datetime: slot.toISOString(), selected: false })),
      })
      .returning({ id: candidateInterviews.id });
    return { id: iv!.id, token };
  }

  const pick = (token: string, slotIndex = 0) =>
    request(app).patch(`/public/interview/${token}/select`).send({ slotIndex });
  const slotsShown = async (token: string) =>
    ((await request(app).get(`/public/interview/${token}`)).body.data.timeSlots as Array<{ taken: boolean }>).map(
      (slot) => slot.taken,
    );

  it("gives a slot to only one of two candidates who pick it at the same moment", async () => {
    const slot = nextDay();
    const first = await invite([slot]);
    const second = await invite([slot]);

    const results = await Promise.all([pick(first.token), pick(second.token)]);

    expect(results.map((res) => res.status).sort()).toEqual([200, 409]);
    expect(results.find((res) => res.status === 409)?.body.code).toBe("SLOT_TAKEN");
    const booked = await db
      .select({ id: candidateInterviews.id })
      .from(candidateInterviews)
      .where(and(inArray(candidateInterviews.id, [first.id, second.id]), eq(candidateInterviews.status, "scheduled")));
    expect(booked).toHaveLength(1);
  });

  it("refuses a slot that starts while the interviewer's other interview is still running", async () => {
    const ten = nextDay();
    const first = await invite([ten]);
    const second = await invite([plus(ten, 30), plus(ten, 60)]);
    expect((await pick(first.token)).status).toBe(200);

    // 10:30 is inside the 10:00 to 11:00 interview; 11:00 is free.
    expect(await slotsShown(second.token)).toEqual([true, false]);
    const halfPast = await pick(second.token, 0);
    expect(halfPast.status).toBe(409);
    expect(halfPast.body.code).toBe("SLOT_TAKEN");
    expect((await pick(second.token, 1)).status).toBe(200);
  });

  it("lets two different interviewers be booked at the same time", async () => {
    const slot = nextDay();
    const first = await invite([slot], interviewerId);
    const second = await invite([slot], otherInterviewerId);

    expect((await pick(first.token)).status).toBe(200);
    expect((await pick(second.token)).status).toBe(200);
  });

  it("is refused by the database itself, whatever wrote the row", async () => {
    const slot = nextDay();
    const candidate = await addCandidate("direct");
    const row = {
      candidateId: candidate.id,
      jobId,
      stageId,
      interviewerId,
      durationMinutes: 60,
      status: "scheduled",
    };
    await db.insert(candidateInterviews).values({ ...row, scheduledAt: slot });

    await expect(db.insert(candidateInterviews).values({ ...row, scheduledAt: plus(slot, 30) })).rejects.toThrow();
    // Back to back is fine, and so is a cancelled interview at the same time.
    await db.insert(candidateInterviews).values({ ...row, scheduledAt: plus(slot, 60) });
    await db.insert(candidateInterviews).values({ ...row, scheduledAt: slot, status: "cancelled" });
  });

  it("tells a manager who sets a clashing time themselves", async () => {
    const slot = nextDay();
    const booked = await invite([slot]);
    await pick(booked.token);
    const candidate = await addCandidate("fixed");

    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/schedule`)
      .set("Authorization", adminAuth)
      .send({
        eventName: "Interview",
        eventType: "onsite",
        location: "Office",
        interviewerId,
        stageId,
        scheduledAt: plus(slot, 15).toISOString(),
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already has an interview/);
  });
});

// ── Offers ────────────────────────────────────────────────────────────────────

describe("an offer", () => {
  async function makeOffer(values: Partial<typeof offers.$inferInsert> = {}) {
    const candidate = await addCandidate("offer");
    const token = `offer-${SUFFIX}-${++n}`;
    const [offer] = await db
      .insert(offers)
      .values({ candidateId: candidate.id, jobId, status: "sent", salary: 250000, currency: "LKR", reviewToken: token, createdBy: adminId, ...values })
      .returning({ id: offers.id });
    return { id: offer!.id, token, candidateId: candidate.id };
  }
  const stored = async (id: number) => (await db.select().from(offers).where(eq(offers.id, id)))[0]!;
  const pub = (token: string, action: "accept" | "decline" | "viewed") =>
    request(app).post(`/public/offers/${token}/${action}`);
  const edit = (id: number, body: object) =>
    request(app).patch(`/api/offers/${id}`).set("Authorization", adminAuth).send(body);

  it("takes one answer when accept and decline arrive together", async () => {
    const offer = await makeOffer();

    const [accept, decline] = await Promise.all([pub(offer.token, "accept"), pub(offer.token, "decline")]);

    expect([accept.status, decline.status].sort()).toEqual([200, 409]);
    const winner = accept.status === 200 ? "accepted" : "declined";
    const final = await stored(offer.id);
    expect(final.status).toBe(winner);
    // Only the answer that counted is on the record.
    expect(final.acceptedAt === null).toBe(winner !== "accepted");
    expect(final.declinedAt === null).toBe(winner !== "declined");
  });

  it("records a double click on accept once", async () => {
    const offer = await makeOffer();

    const results = await Promise.all([pub(offer.token, "accept"), pub(offer.token, "accept")]);

    expect(results.map((res) => res.status).sort()).toEqual([200, 409]);
    const accepted = await db
      .select()
      .from(candidateActivities)
      .where(and(eq(candidateActivities.offerId, offer.id), eq(candidateActivities.eventType, "offer_accepted")));
    expect(accepted).toHaveLength(1);
  });

  it("cannot be edited once the candidate has accepted it", async () => {
    const offer = await makeOffer();
    await pub(offer.token, "accept");

    const res = await edit(offer.id, { salary: 100000 });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("OFFER_CLOSED");
    expect(Number((await stored(offer.id)).salary)).toBe(250000);
  });

  it("cannot be edited once declined either, but can still be edited while it is open", async () => {
    const open = await makeOffer();
    expect((await edit(open.id, { salary: 300000 })).status).toBe(200);
    expect(Number((await stored(open.id)).salary)).toBe(300000);

    await pub(open.token, "decline");
    expect((await edit(open.id, { benefits: "More leave" })).status).toBe(409);
  });

  it("cannot be accepted or declined after its expiry date", async () => {
    const offer = await makeOffer({ expiresAt: new Date(Date.now() - HOUR) });

    const res = await pub(offer.token, "accept");

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("This offer has expired");
    expect((await stored(offer.id)).status).toBe("expired");
    expect((await pub(offer.token, "decline")).status).toBe(409);
  });

  it("can be accepted before its expiry date, and shows the date to the candidate", async () => {
    const expiresAt = new Date(Date.now() + 24 * HOUR);
    const offer = await makeOffer({ expiresAt });

    const shown = await request(app).get(`/public/offers/${offer.token}`);
    expect(new Date(shown.body.data.expiresAt).getTime()).toBe(expiresAt.getTime());
    expect((await pub(offer.token, "accept")).status).toBe(200);
  });

  it("is closed by the periodic check when nobody answered in time", async () => {
    const overdue = await makeOffer({ status: "viewed", expiresAt: new Date(Date.now() - HOUR) });
    const stillOpen = await makeOffer({ expiresAt: new Date(Date.now() + HOUR) });
    const noDate = await makeOffer();
    const alreadyAccepted = await makeOffer({ status: "accepted", expiresAt: new Date(Date.now() - HOUR) });

    await offerService.expireOverdue();

    expect((await stored(overdue.id)).status).toBe("expired");
    expect((await stored(stillOpen.id)).status).toBe("sent");
    expect((await stored(noDate.id)).status).toBe("sent");
    expect((await stored(alreadyAccepted.id)).status).toBe("accepted");
  });

  it("cannot be given an expiry date that has already passed", async () => {
    const offer = await makeOffer({ status: "draft" });

    const res = await edit(offer.id, { expiresAt: new Date(Date.now() - HOUR).toISOString() });

    expect(res.status).toBe(400);
    expect((await stored(offer.id)).expiresAt).toBeNull();
  });

  it("is not marked as viewed by loading it, only by the page saying it was shown", async () => {
    const offer = await makeOffer();

    // What an email scanner does: fetch the link.
    await request(app).get(`/public/offers/${offer.token}`);
    await request(app).get(`/public/offers/${offer.token}`);
    expect((await stored(offer.id)).status).toBe("sent");

    const res = await pub(offer.token, "viewed");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("viewed");
    expect((await stored(offer.id)).viewedAt).not.toBeNull();

    // Saying so again changes nothing and adds nothing to the timeline.
    await pub(offer.token, "viewed");
    const viewed = await db
      .select()
      .from(candidateActivities)
      .where(and(eq(candidateActivities.offerId, offer.id), eq(candidateActivities.eventType, "offer_viewed")));
    expect(viewed).toHaveLength(1);
  });

  it("stays accepted when the page reports a view afterwards", async () => {
    const offer = await makeOffer();
    await pub(offer.token, "accept");

    await pub(offer.token, "viewed");

    expect((await stored(offer.id)).status).toBe("accepted");
  });
});

// ── Assessments ───────────────────────────────────────────────────────────────

describe("an assessment that was started", () => {
  async function attempt(values: Partial<typeof candidateAssessmentAttempts.$inferInsert>) {
    const candidate = await addCandidate("attempt");
    const token = `attempt-${SUFFIX}-${++n}`;
    const [row] = await db
      .insert(candidateAssessmentAttempts)
      .values({
        candidateId: candidate.id,
        assessmentId,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * HOUR),
        status: "started",
        startedAt: new Date(),
        ...values,
      })
      .returning({ id: candidateAssessmentAttempts.id });
    return { id: row!.id, token, email: candidate.email };
  }
  const statusOf = async (id: number) =>
    (await db.select().from(candidateAssessmentAttempts).where(eq(candidateAssessmentAttempts.id, id)))[0]!;

  it("is finished and graded once its time has long run out", async () => {
    // Started two hours ago on a 30 minute test, then the tab was closed.
    const abandoned = await attempt({ startedAt: new Date(Date.now() - 2 * HOUR) });
    const inProgress = await attempt({ startedAt: new Date(Date.now() - 10 * 60_000) });
    const notStarted = await attempt({ status: "pending", startedAt: null });

    await assessmentExecutionService.completeAbandonedAttempts();

    const finished = await statusOf(abandoned.id);
    expect(finished.status).toBe("completed");
    expect(finished.completedAt).not.toBeNull();
    // Nothing was answered, so it scores 0 instead of having no score.
    expect(Number(finished.scorePercentage)).toBe(0);
    expect((await statusOf(inProgress.id)).status).toBe("started");
    expect((await statusOf(notStarted.id)).status).toBe("pending");
  });

  it("is left alone just after the time is up, so the browser's own submit can arrive", async () => {
    const justOver = await attempt({ startedAt: new Date(Date.now() - 32 * 60_000) });

    await assessmentExecutionService.completeAbandonedAttempts();

    expect((await statusOf(justOver.id)).status).toBe("started");
  });

  it("is finished when its link has expired, even with time left on the clock", async () => {
    const linkGone = await attempt({ startedAt: new Date(Date.now() - 60_000), expiresAt: new Date(Date.now() - 1000) });

    await assessmentExecutionService.completeAbandonedAttempts();

    expect((await statusOf(linkGone.id)).status).toBe("completed");
  });

  it("is completed once, with one email, when submit is sent twice at the same moment", async () => {
    const live = await attempt({});
    const submit = () => request(app).post(`/public/assessment/${live.token}/complete`).send({});

    const results = await Promise.all([submit(), submit()]);
    // The email is sent after the reply, without being waited for.
    await vi.waitFor(() => expect(mailTo(live.email).length).toBeGreaterThan(0));
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Neither is an error for the candidate: their assessment is in.
    expect(results.map((res) => res.status)).toEqual([200, 200]);
    expect((await statusOf(live.id)).status).toBe("completed");
    expect(mailTo(live.email)).toHaveLength(1);
  });
});

// ── Company time zone ─────────────────────────────────────────────────────────

describe("the company time zone", () => {
  const save = (timeZone: unknown) =>
    request(app)
      .put("/api/company")
      .set("Authorization", adminAuth)
      .send({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test`, timeZone });

  it("refuses a value that is not a time zone", async () => {
    expect((await save("Colombo")).status).toBe(400);
    expect((await save("Mars/Olympus")).status).toBe(400);
  });
});
