import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import type { Request, Response } from "express";
import { randomUUID } from "crypto";

// No storage in tests: the private bucket is replaced by one file held in memory.
const STORED_KEY = "resumes/11111111-2222-4333-8444-555555555555.pdf";
const STORED_FILE = Buffer.from("%PDF-1.4 a stored cv");

vi.mock("../../src/shared/services/r2.service", () => ({
  r2Service: {
    getResume: vi.fn(async (key: string) => (key === STORED_KEY ? STORED_FILE : null)),
    uploadResume: vi.fn(),
    deleteResume: vi.fn(),
  },
}));

vi.mock("../../src/queues/cv-extract/queue", () => ({ requestCvExtraction: vi.fn(async () => undefined) }));
vi.mock("../../src/queues/cv-analysis/queue", () => ({ requestCvAnalysis: vi.fn(async () => false) }));
vi.mock("../../src/shared/services/mail.service", () => ({
  mailService: { sendEmail: vi.fn(async () => ({ id: "test" })) },
}));

import { db } from "../../src/db";
import { company, departments } from "../../src/db/schema/company";
import { jobs } from "../../src/db/schema/jobs";
import { jobHiringTeam, jobPipelineStages } from "../../src/db/schema/pipeline";
import { candidates, resumeUploads } from "../../src/db/schema/candidates";
import { users } from "../../src/db/schema/users";
import {
  applyForJob,
  getCandidates,
  getCandidateById,
  getCandidateResume,
} from "../../src/modules/candidate/candidate.controller";
import { resumeUploadService } from "../../src/modules/upload/resume-upload.service";
import { r2Service } from "../../src/shared/services/r2.service";
import type { AuthenticatedUser } from "../../src/shared/auth/verify-token";

// CVs are kept in a bucket with no public access. These cover the two things that keep it that
// way: the file is only sent after the access check, and no response says where it is stored.

const SUFFIX = `cv-storage-${Date.now()}`;

let admin: AuthenticatedUser;
let interviewerOnTeam: AuthenticatedUser;
let interviewerOffTeam: AuthenticatedUser;
let jobId: number;
let candidateId: number;
let candidateWithoutCvId: number;

async function makeUser(tag: string, role: AuthenticatedUser["role"]): Promise<AuthenticatedUser> {
  const [row] = await db
    .insert(users)
    .values({ name: `${tag} Tester`, firstName: tag, lastName: "Tester", email: `${tag}.${SUFFIX}@example.test`, role })
    .returning();
  return { ...row!, role };
}

// Driven directly: the real route needs a signed token we cannot issue here.
function run(
  controller: (req: Request, res: Response) => unknown,
  req: Partial<Request> & { user?: AuthenticatedUser },
) {
  return new Promise<{ status: number; body: unknown; headers: Record<string, string> }>((resolve) => {
    let status = 200;
    const headers: Record<string, string> = {};
    const res = {
      status(code: number) {
        status = code;
        return this;
      },
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
        return this;
      },
      json(body: unknown) {
        resolve({ status, body, headers });
        return this;
      },
      send(body: unknown) {
        resolve({ status, body, headers });
        return this;
      },
    } as unknown as Response;

    void controller({ query: {}, params: {}, body: {}, ...req } as unknown as Request, res);
  });
}

beforeAll(async () => {
  const [co] = await db
    .insert(company)
    .values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` })
    .returning();
  const [dept] = await db
    .insert(departments)
    .values({ companyId: co!.id, name: `Dept ${SUFFIX}` })
    .returning();

  admin = await makeUser("admin", "super_admin");
  interviewerOnTeam = await makeUser("on-team", "interviewer");
  interviewerOffTeam = await makeUser("off-team", "interviewer");

  const [job] = await db
    .insert(jobs)
    .values({
      slug: `job-${SUFFIX}`,
      title: "Storage Job",
      departmentId: dept!.id,
      employmentType: "full_time",
      status: "published",
      createdBy: admin.id,
    })
    .returning({ id: jobs.id });
  jobId = job!.id;

  await db.insert(jobPipelineStages).values({ jobId, name: "Applied", position: 0 });
  await db.insert(jobHiringTeam).values({ jobId, userId: interviewerOnTeam.id });

  const rows = await db
    .insert(candidates)
    .values([
      { firstName: "With", lastName: "Cv", email: `with.${SUFFIX}@example.test`, jobId, resumeKey: STORED_KEY },
      { firstName: "Without", lastName: "Cv", email: `without.${SUFFIX}@example.test`, jobId },
    ])
    .returning({ id: candidates.id });
  candidateId = rows[0]!.id;
  candidateWithoutCvId = rows[1]!.id;
});

afterAll(async () => {
  await db.delete(candidates).where(eq(candidates.jobId, jobId));
  await db.delete(jobs).where(eq(jobs.id, jobId));
  await db.delete(users).where(inArray(users.id, [admin.id, interviewerOnTeam.id, interviewerOffTeam.id]));
  await db.delete(company).where(eq(company.email, `co.${SUFFIX}@example.test`));
});

describe("GET /candidates/:id/resume", () => {
  it("sends the file to someone on the hiring team", async () => {
    const result = await run(getCandidateResume, { user: interviewerOnTeam, params: { id: String(candidateId) } });

    expect(result.status).toBe(200);
    expect(result.body).toEqual(STORED_FILE);
    expect(result.headers["content-type"]).toBe("application/pdf");
    expect(result.headers["content-disposition"]).toContain(`filename="with-cv-cv.pdf"`);
    // A signed-in browser may keep it for a few minutes; a shared cache never may.
    expect(result.headers["cache-control"]).toContain("private");
  });

  it("refuses an interviewer who is not on the hiring team", async () => {
    const result = await run(getCandidateResume, { user: interviewerOffTeam, params: { id: String(candidateId) } });

    expect(result.status).toBe(403);
    expect(result.body).not.toEqual(STORED_FILE);
  });

  it("answers 404 when the candidate has no CV", async () => {
    const result = await run(getCandidateResume, { user: admin, params: { id: String(candidateWithoutCvId) } });
    expect(result.status).toBe(404);
  });
});

describe("where a CV is stored is not sent to the dashboard", () => {
  it("says only whether the candidate has a CV, on the candidate page", async () => {
    const result = await run(getCandidateById, { user: admin, params: { id: String(candidateId) } });
    const data = (result.body as { data: Record<string, unknown> }).data;

    expect(data.hasResume).toBe(true);
    expect(JSON.stringify(result.body)).not.toContain("resumes/");
    expect(data).not.toHaveProperty("resumeKey");
    expect(data).not.toHaveProperty("resumeUrl");
  });

  it("says only whether each candidate has a CV, in the list", async () => {
    const result = await run(getCandidates, { user: admin, query: { jobId: String(jobId) } });
    const rows = (result.body as { data: Array<Record<string, unknown>> }).data;

    expect(rows.find((row) => row.id === candidateId)?.hasResume).toBe(true);
    expect(rows.find((row) => row.id === candidateWithoutCvId)?.hasResume).toBe(false);
    expect(JSON.stringify(result.body)).not.toContain("resumes/");
  });
});

describe("applying with a CV", () => {
  const application = (extra: Record<string, unknown>, tag: string) => ({
    params: { jobId: String(jobId) },
    body: { firstName: "New", lastName: "Applicant", email: `${tag}.${SUFFIX}@example.test`, ...extra },
  });
  const storedKeyOf = async (tag: string) => {
    const [row] = await db
      .select({ resumeKey: candidates.resumeKey })
      .from(candidates)
      .where(eq(candidates.email, `${tag}.${SUFFIX}@example.test`));
    return row?.resumeKey;
  };
  const newKey = () => `resumes/${randomUUID()}.pdf`;

  it("attaches the file of the upload that is named", async () => {
    const key = newKey();
    const uploadId = await resumeUploadService.create(key);

    const result = await run(applyForJob, application({ resumeUploadId: uploadId }, "first"));

    expect(result.status).toBe(201);
    expect(await storedKeyOf("first")).toBe(key);
  });

  it("refuses an upload that was already used on another application", async () => {
    const uploadId = await resumeUploadService.create(newKey());
    await run(applyForJob, application({ resumeUploadId: uploadId }, "once"));

    const again = await run(applyForJob, application({ resumeUploadId: uploadId }, "twice"));

    expect(again.status).toBe(400);
    expect((again.body as { code?: string }).code).toBe("RESUME_UPLOAD_INVALID");
    // Nothing is half saved: the second application does not exist.
    expect(await storedKeyOf("twice")).toBeUndefined();
  });

  it("refuses an upload that has expired", async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const uploadId = await resumeUploadService.create(newKey(), twoHoursAgo);

    const result = await run(applyForJob, application({ resumeUploadId: uploadId }, "late"));

    expect(result.status).toBe(400);
    expect(await storedKeyOf("late")).toBeUndefined();
  });

  it("refuses an id that was never given out", async () => {
    const result = await run(applyForJob, application({ resumeUploadId: randomUUID() }, "unknown"));
    expect(result.status).toBe(400);
  });

  it("keeps the upload for another try when the application itself fails", async () => {
    const key = newKey();
    const uploadId = await resumeUploadService.create(key);
    await run(applyForJob, application({}, "taken"));

    const duplicate = await run(applyForJob, application({ resumeUploadId: uploadId }, "taken"));
    expect(duplicate.status).toBe(409);

    const retry = await run(applyForJob, application({ resumeUploadId: uploadId }, "retry"));
    expect(retry.status).toBe(201);
    expect(await storedKeyOf("retry")).toBe(key);
  });

  it.each([
    ["a URL", "https://files.example.test/resumes/99999999-aaaa-4bbb-8ccc-dddddddddddd.pdf"],
    ["another candidate's file key", STORED_KEY],
    ["a logo", "logos/99999999-aaaa-4bbb-8ccc-dddddddddddd.png"],
  ])("refuses %s in place of an upload id", async (_name, value) => {
    const result = await run(applyForJob, application({ resumeUploadId: value }, "bad"));
    expect(result.status).toBe(400);
    expect(await storedKeyOf("bad")).toBeUndefined();
  });

  it.each(["resumeUrl", "resumeKey"])("ignores %s, which the applicant cannot set", async (field) => {
    const result = await run(applyForJob, application({ [field]: STORED_KEY }, field.toLowerCase()));

    expect(result.status).toBe(201);
    expect(await storedKeyOf(field.toLowerCase())).toBeNull();
  });
});

describe("uploads that were never used", () => {
  it("have their file and their record removed once expired, and no others", async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const expiredKey = `resumes/${randomUUID()}.pdf`;
    const waitingKey = `resumes/${randomUUID()}.pdf`;
    const expiredId = await resumeUploadService.create(expiredKey, twoHoursAgo);
    const waitingId = await resumeUploadService.create(waitingKey);

    await resumeUploadService.removeExpired();

    expect(r2Service.deleteResume).toHaveBeenCalledWith(expiredKey);
    expect(r2Service.deleteResume).not.toHaveBeenCalledWith(waitingKey);
    const left = await db
      .select({ id: resumeUploads.id })
      .from(resumeUploads)
      .where(inArray(resumeUploads.id, [expiredId, waitingId]));
    expect(left.map((row) => row.id)).toEqual([waitingId]);

    await db.delete(resumeUploads).where(eq(resumeUploads.id, waitingId));
  });
});
