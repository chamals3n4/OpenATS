import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  const { jwks } = await import("../helpers/jwks-holder");
  return { ...actual, createRemoteJWKSet: () => async () => jwks.publicKey };
});

// No real email or Google calls. The fakes record what the booking asked for.
vi.mock("../../src/shared/services/mail.service", () => ({
  mailService: { sendEmail: vi.fn().mockResolvedValue(undefined) },
}));
const getValidAccessToken = vi.fn();
vi.mock("../../src/shared/integrations/connection.service", () => ({
  integrationConnectionService: { getValidAccessToken: (...a: unknown[]) => getValidAccessToken(...a) },
}));
const createMeeting = vi.fn();
vi.mock("../../src/shared/integrations/registry", () => ({
  getProviderClient: () => ({ createMeeting: (...a: unknown[]) => createMeeting(...a) }),
}));
import { db } from "../../src/db";
import { company, departments } from "../../src/db/schema/company";
import { jobs } from "../../src/db/schema/jobs";
import { jobPipelineStages } from "../../src/db/schema/pipeline";
import { candidates } from "../../src/db/schema/candidates";
import { candidateInterviews } from "../../src/db/schema/interviews";
import { users } from "../../src/db/schema/users";
import { initTestKeys, bearer } from "../helpers/jwt";
import { completeInterviewBooking } from "../../src/modules/interview/interview-confirm";

const SUFFIX = `cal${Date.now()}`;
const AT = new Date(Date.now() + 3 * 86_400_000);
let companyId: number, departmentId: number, jobId: number, stageId: number, candidateId: number, userId: number;

beforeAll(async () => {
  await initTestKeys();
  const [co] = await db.insert(company).values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` }).returning();
  companyId = co!.id;
  const [dept] = await db.insert(departments).values({ name: `Dept ${SUFFIX}`, companyId }).returning();
  departmentId = dept!.id;
  userId = (await bearer({ email: `iv.${SUFFIX}@example.test`, role: "super_admin", firstName: "Ivy", lastName: "Viewer" })).user.id;
  const [job] = await db
    .insert(jobs)
    .values({
      title: `Engineer ${SUFFIX}`,
      slug: `engineer-${SUFFIX}`,
      description: "Test job",
      employmentType: "full_time",
      departmentId,
      status: "published",
      createdBy: userId,
    })
    .returning();
  jobId = job!.id;
  const [stage] = await db
    .insert(jobPipelineStages)
    .values({ jobId, name: "Interview", position: 1, stageType: "interview" })
    .returning();
  stageId = stage!.id;
  const [candidate] = await db
    .insert(candidates)
    .values({ firstName: "Ada", lastName: "Lovelace", email: `ada.${SUFFIX}@example.test`, jobId, currentStageId: stageId })
    .returning();
  candidateId = candidate!.id;
});

afterAll(async () => {
  await db.delete(candidateInterviews).where(eq(candidateInterviews.jobId, jobId));
  await db.delete(candidates).where(eq(candidates.jobId, jobId));
  await db.delete(jobPipelineStages).where(eq(jobPipelineStages.jobId, jobId));
  await db.delete(jobs).where(eq(jobs.id, jobId));
  await db.delete(departments).where(eq(departments.id, departmentId));
  await db.delete(company).where(eq(company.id, companyId));
  await db.delete(users).where(eq(users.id, userId));
});

beforeEach(() => {
  vi.clearAllMocks();
  getValidAccessToken.mockResolvedValue(null);
  createMeeting.mockResolvedValue({ meetingUrl: "https://meet.google.com/new", providerMeetingId: "evt_1" });
});

async function book(values: Partial<typeof candidateInterviews.$inferInsert>) {
  const [iv] = await db
    .insert(candidateInterviews)
    .values({
      candidateId,
      stageId,
      jobId,
      eventName: "Technical interview",
      eventType: "virtual",
      interviewerId: userId,
      durationMinutes: 45,
      status: "scheduled",
      scheduledAt: AT,
      ...values,
    })
    .returning();
  await completeInterviewBooking(iv!, AT);
  const [saved] = await db.select().from(candidateInterviews).where(eq(candidateInterviews.id, iv!.id));
  return saved!;
}

describe("where a booked interview goes", () => {
  it("goes in the connected interviewer's calendar with a Meet link", async () => {
    getValidAccessToken.mockResolvedValue("token");

    const saved = await book({ meetingProvider: "google_meet" });

    expect(createMeeting).toHaveBeenCalledTimes(1);
    expect(createMeeting.mock.calls[0]![1]).toMatchObject({
      withVideoLink: true,
      durationMinutes: 45,
      attendeeEmails: [`ada.${SUFFIX}@example.test`],
    });
    expect(saved).toMatchObject({ meetingUrl: "https://meet.google.com/new", providerMeetingId: "evt_1" });
  });

  it("goes in the connected interviewer's calendar without a Meet link when they use their own", async () => {
    getValidAccessToken.mockResolvedValue("token");
    createMeeting.mockResolvedValue({ meetingUrl: null, providerMeetingId: "evt_2" });

    const saved = await book({ meetingUrl: "https://zoom.example/1" });

    expect(createMeeting.mock.calls[0]![1]).toMatchObject({ withVideoLink: false, location: "https://zoom.example/1" });
    expect(saved).toMatchObject({ meetingUrl: "https://zoom.example/1", providerMeetingId: "evt_2" });
  });

  it("adds no calendar entry for an interviewer who has not connected Google", async () => {
    const saved = await book({ meetingUrl: "https://zoom.example/1" });

    expect(createMeeting).not.toHaveBeenCalled();
    expect(saved).toMatchObject({ providerMeetingId: null, meetingUrl: "https://zoom.example/1", status: "scheduled" });
  });

  it("keeps the booking when the interviewer's calendar refuses the event", async () => {
    getValidAccessToken.mockResolvedValue("token");
    createMeeting.mockRejectedValue(new Error("Google is down"));

    const saved = await book({ meetingProvider: "google_meet" });

    expect(saved).toMatchObject({ providerMeetingId: null, status: "scheduled" });
  });

  it("books an on-site interview with no Google at all", async () => {
    const saved = await book({ eventType: "onsite", location: "12 Park Street" });

    expect(createMeeting).not.toHaveBeenCalled();
    expect(saved).toMatchObject({ providerMeetingId: null, status: "scheduled" });
  });
});
