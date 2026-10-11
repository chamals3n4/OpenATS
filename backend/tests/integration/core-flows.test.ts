import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import request from "supertest";

// Serve the locally generated key instead of fetching a real JWKS. Everything
// else in `jose` stays real, so tokens are genuinely verified.
vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  // Import the holder, not the jwt helper: that helper imports `jose` itself,
  // which would deadlock the module graph from inside this factory.
  const { jwks } = await import("../helpers/jwks-holder");
  return {
    ...actual,
    createRemoteJWKSet: () => async () => jwks.publicKey,
  };
});

// No real email in tests. Every email goes through sendEmail, so it is asserted on below.
const sendEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("../../src/shared/services/mail.service", () => ({
  mailService: { sendEmail: (...args: unknown[]) => sendEmail(...args) },
}));
const offerEmails = () =>
  sendEmail.mock.calls
    .map((call) => call[0] as { to: string; subject: string })
    .filter((email) => email.subject.startsWith("Offer for"));

import app from "../../src/app";
import { db } from "../../src/db";
import { company, departments } from "../../src/db/schema/company";
import { jobs } from "../../src/db/schema/jobs";
import { jobPipelineStages, jobHiringTeam } from "../../src/db/schema/pipeline";
import { candidates } from "../../src/db/schema/candidates";
import { candidateInterviews } from "../../src/db/schema/interviews";
import { offers } from "../../src/db/schema/offers";
import { templates } from "../../src/db/schema/templates";
import { emailMessages } from "../../src/db/schema/communications";
import { users } from "../../src/db/schema/users";
import { initTestKeys, bearer } from "../helpers/jwt";

const SUFFIX = `flow-${Date.now()}`;

let auth: string;
let managerId: number;
let companyId: number;
let departmentId: number;
let jobId: number;
let appliedStageId: number;
let interviewStageId: number;
let offerStageId: number;
let candidateId: number;
let offerId: number;

beforeAll(async () => {
  await initTestKeys();
  const [co] = await db
    .insert(company)
    .values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` })
    .returning({ id: company.id });
  companyId = co!.id;

  const [dept] = await db
    .insert(departments)
    .values({ name: `Dept ${SUFFIX}`, companyId })
    .returning({ id: departments.id });
  departmentId = dept!.id;

  // bearer() inserts the user row, which then owns the job.
  const manager = await bearer({
    email: `manager.${SUFFIX}@example.test`,
    role: "super_admin",
    firstName: "Flow",
    lastName: "Manager",
  });
  auth = manager.authorization;
  managerId = manager.user.id;

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
    .returning({ id: jobs.id });
  jobId = job!.id;

  await db.insert(jobHiringTeam).values({ jobId, userId: managerId });

  const stages = await db
    .insert(jobPipelineStages)
    .values([
      { jobId, name: "Applied", position: 1, stageType: "screening" },
      { jobId, name: "Interview", position: 2, stageType: "interview" },
      { jobId, name: "Offer", position: 3, stageType: "offer" },
    ])
    .returning({ id: jobPipelineStages.id });

  appliedStageId = stages[0]!.id;
  interviewStageId = stages[1]!.id;
  offerStageId = stages[2]!.id;
});

afterAll(async () => {
  await db
    .delete(candidateInterviews)
    .where(eq(candidateInterviews.jobId, jobId));
  await db.delete(offers).where(eq(offers.jobId, jobId));
  await db.delete(candidates).where(eq(candidates.jobId, jobId));
  await db.delete(jobHiringTeam).where(eq(jobHiringTeam.jobId, jobId));
  await db
    .delete(jobPipelineStages)
    .where(eq(jobPipelineStages.jobId, jobId));
  await db.delete(jobs).where(eq(jobs.id, jobId));
  await db.delete(departments).where(eq(departments.id, departmentId));
  await db.delete(company).where(eq(company.id, companyId));
  await db.delete(templates).where(eq(templates.createdBy, managerId));
  await db
    .delete(users)
    .where(inArray(users.email, [`manager.${SUFFIX}@example.test`]));
});

// Ordered on purpose: each step uses the record the previous one created,
// which is what makes this a flow rather than four isolated cases.
describe("core hiring flow", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await request(app).get(`/api/candidates/jobs/${jobId}`);
    expect(res.status).toBe(401);
  });

  it("accepts an application and puts the candidate in the first stage", async () => {
    const res = await request(app)
      .post(`/api/candidates/jobs/${jobId}/apply`)
      .set("Authorization", auth)
      .send({
        firstName: "Ada",
        lastName: "Lovelace",
        email: `ada.${SUFFIX}@example.test`,
        phone: "+10000000000",
      });

    expect(res.status).toBe(201);
    candidateId = res.body.data.id;

    const [row] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, candidateId));

    expect(row!.jobId).toBe(jobId);
    expect(row!.currentStageId).toBe(appliedStageId);
    expect(row!.status).toBe("active");
  });

  it("rejects a duplicate application to the same job", async () => {
    const res = await request(app)
      .post(`/api/candidates/jobs/${jobId}/apply`)
      .set("Authorization", auth)
      .send({
        firstName: "Ada",
        lastName: "Lovelace",
        email: `ada.${SUFFIX}@example.test`,
      });

    expect(res.status).toBe(409);
  });

  it("moves the candidate to another stage", async () => {
    const res = await request(app)
      .put(`/api/candidates/${candidateId}/stage`)
      .set("Authorization", auth)
      .send({ newStageId: interviewStageId });

    expect(res.status).toBe(200);

    const [row] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, candidateId));
    expect(row!.currentStageId).toBe(interviewStageId);
  });

  it("schedules an interview", async () => {
    const scheduledAt = new Date(Date.now() + 86_400_000).toISOString();
    const res = await request(app)
      .post(`/api/candidates/${candidateId}/interviews`)
      .set("Authorization", auth)
      .send({
        stageId: interviewStageId,
        scheduledAt,
        durationMinutes: 45,
        interviewerId: managerId,
      });

    expect([200, 201]).toContain(res.status);

    const rows = await db
      .select()
      .from(candidateInterviews)
      .where(eq(candidateInterviews.candidateId, candidateId));

    expect(rows).toHaveLength(1);
    expect(rows[0]!.durationMinutes).toBe(45);
  });

  it("creates an offer as a draft", async () => {
    const res = await request(app)
      .post("/api/offers")
      .set("Authorization", auth)
      .send({
        candidateId,
        jobId,
        salary: 120000,
        currency: "USD",
        employmentType: "full_time",
        // The schema uses z.string().date(), so this must be YYYY-MM-DD.
        startDate: new Date(Date.now() + 7 * 86_400_000)
          .toISOString()
          .slice(0, 10),
      });

    expect(res.status).toBe(201);
    offerId = res.body.data.id;
    expect(res.body.data.status).toBe("draft");
  });

  it("refuses to send an offer that is missing required fields", async () => {
    const res = await request(app)
      .post(`/api/offers/${offerId}/send`)
      .set("Authorization", auth)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reportingManager/);
    expect(offerEmails()).toHaveLength(0);
  });

  it("accepts the remaining offer details", async () => {
    const res = await request(app)
      .patch(`/api/offers/${offerId}`)
      .set("Authorization", auth)
      .send({
        reportingManager: "Grace Hopper",
        benefits: "Health, dental, 25 days leave",
        offerLetterHtml: "<p>Welcome aboard.</p>",
      });

    expect(res.status).toBe(200);
  });

  // Regression: a partial update used to null out startDate because it was
  // normalized to null before being handed to clean(), which only drops
  // undefined. The offer then became unsendable.
  it("leaves fields the update did not mention alone", async () => {
    const [row] = await db.select().from(offers).where(eq(offers.id, offerId));
    expect(row!.startDate).not.toBeNull();
    expect(row!.currency).toBe("USD");
  });

  it("sends the offer and emails the candidate", async () => {
    const res = await request(app)
      .post(`/api/offers/${offerId}/send`)
      .set("Authorization", auth)
      .send({});

    expect(res.status).toBe(200);
    expect(offerEmails()).toHaveLength(1);
    expect(offerEmails()[0]!.to).toBe(`ada.${SUFFIX}@example.test`);

    // The send is written to the candidate's email history.
    const history = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.candidateId, candidateId));
    expect(history.some((m) => m.kind === "offer" && m.status === "sent")).toBe(true);

    const [row] = await db.select().from(offers).where(eq(offers.id, offerId));
    expect(row!.status).toBe("sent");
    expect(row!.sentAt).not.toBeNull();
  });

  it("moves the candidate to the offer stage", async () => {
    const res = await request(app)
      .put(`/api/candidates/${candidateId}/stage`)
      .set("Authorization", auth)
      .send({ newStageId: offerStageId });

    expect(res.status).toBe(200);

    const [row] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, candidateId));
    expect(row!.currentStageId).toBe(offerStageId);
  });

  describe("scheduling an interview", () => {
    const schedule = (body: object) =>
      request(app)
        .post(`/api/candidates/${candidateId}/schedule`)
        .set("Authorization", auth)
        .send({
          eventName: "Technical interview",
          eventType: "onsite",
          location: "12 Park Street",
          interviewerId: managerId,
          ...body,
        });
    const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

    it("needs either slots or a set time", async () => {
      const res = await schedule({});
      expect(res.status).toBe(400);
      expect(res.body.details.timeSlots).toBeDefined();
    });

    it("offers slots and keeps the chosen length", async () => {
      const res = await schedule({ durationMinutes: 45, timeSlots: [{ datetime: inDays(3) }] });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ status: "pending_schedule", durationMinutes: 45 });
      expect(res.body.data.publicToken).toBeTruthy();
    });

    it("books a time the team set, with no link for the candidate to pick from", async () => {
      const at = inDays(4);
      const res = await schedule({ durationMinutes: 30, scheduledAt: at });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ status: "scheduled", durationMinutes: 30, publicToken: null });
      expect(new Date(res.body.data.scheduledAt).toISOString()).toBe(at);

      // The confirmation is sent in the background.
      await vi.waitFor(async () => {
        const history = await db
          .select()
          .from(emailMessages)
          .where(eq(emailMessages.candidateId, candidateId));
        expect(history.some((m) => m.kind === "interview_confirmed")).toBe(true);
      });
    });
  });

  describe("rejecting with an email", () => {
    let templateId: number;
    const reject = (id: number) =>
      request(app)
        .post(`/api/candidates/${candidateId}/reject`)
        .set("Authorization", auth)
        .send({ reason: "Not a fit", templateId: id, emailStatus: "sent" });
    const status = async () =>
      (await db.select().from(candidates).where(eq(candidates.id, candidateId)))[0]!.status;

    it("refuses a template that uses offer details, and rejects nobody", async () => {
      const [offerOnly] = await db
        .insert(templates)
        .values({
          name: `Offer-only ${SUFFIX}`,
          type: "email",
          subject: "Update",
          bodyJson: "<p>Your salary is {{salary}}</p>",
          createdBy: managerId,
        })
        .returning({ id: templates.id });

      const res = await reject(offerOnly!.id);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/\{\{salary\}\}/);
      expect(await status()).not.toBe("rejected");
    });

    it("keeps the rejection when the email cannot be sent, and says so", async () => {
      const [template] = await db
        .insert(templates)
        .values({
          name: `Rejection ${SUFFIX}`,
          type: "email",
          subject: "Your application for {{job_title}}",
          bodyJson: "<p>Dear {{candidate_name}}, thank you.</p>",
          createdBy: managerId,
        })
        .returning({ id: templates.id });
      templateId = template!.id;
      sendEmail.mockRejectedValueOnce(new Error("provider down"));

      const res = await reject(templateId);

      expect(res.status).toBe(201);
      expect(res.body.data.emailFailed).toBe(true);
      expect(res.body.data.emailStatus).toBe("not_sent");
      expect(await status()).toBe("rejected");

      const history = await db
        .select()
        .from(emailMessages)
        .where(eq(emailMessages.candidateId, candidateId));
      expect(history.some((m) => m.kind === "rejection" && m.status === "failed")).toBe(true);
    });
  });

  describe("automatic emails", () => {
    const put = (purpose: string, body: object) =>
      request(app).put(`/api/templates/system/${purpose}`).set("Authorization", auth).send(body);
    const offerRow = async () =>
      (await request(app).get("/api/templates/system").set("Authorization", auth)).body.data.find(
        (e: { purpose: string }) => e.purpose === "offer",
      );

    it("lists every automatic email with its built-in wording", async () => {
      const row = await offerRow();
      expect(row.customised).toBe(false);
      expect(row.subject).toBe("Offer for {{job_title}}");
    });

    it("refuses a variable the email has no value for", async () => {
      const res = await put("offer", { subject: "Hi", bodyHtml: "<p>{{salary}}</p>" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/\{\{salary\}\}/);
    });

    it("saves a company's own wording, then resets it", async () => {
      const saved = await put("offer", { subject: "Good news", bodyHtml: "<p>Hi {{candidate_name}}</p>" });
      expect(saved.status).toBe(200);
      expect(await offerRow()).toMatchObject({ customised: true, subject: "Good news" });

      const reset = await request(app).delete("/api/templates/system/offer").set("Authorization", auth);
      expect(reset.status).toBe(200);
      expect(await offerRow()).toMatchObject({ customised: false, subject: "Offer for {{job_title}}" });
    });

    it("answers 404 for an email that does not exist", async () => {
      expect((await put("nope", { subject: "a", bodyHtml: "b" })).status).toBe(404);
    });
  });
});
