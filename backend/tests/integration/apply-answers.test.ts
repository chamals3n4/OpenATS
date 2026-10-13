import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import type { Request, Response } from "express";

vi.mock("../../src/queues/cv-extract/queue", () => ({ requestCvExtraction: vi.fn(async () => undefined) }));
vi.mock("../../src/queues/cv-analysis/queue", () => ({ requestCvAnalysis: vi.fn(async () => false) }));
vi.mock("../../src/shared/services/mail.service", () => ({
  mailService: { sendEmail: vi.fn(async () => ({ id: "test" })) },
}));

import { db } from "../../src/db";
import { company, departments } from "../../src/db/schema/company";
import { jobs } from "../../src/db/schema/jobs";
import { jobPipelineStages } from "../../src/db/schema/pipeline";
import { jobCustomQuestionOptions, jobCustomQuestions } from "../../src/db/schema/assessments";
import { candidates } from "../../src/db/schema/candidates";
import { users } from "../../src/db/schema/users";
import { applyForJob } from "../../src/modules/candidate/candidate.controller";
import { getPublicCustomQuestions } from "../../src/modules/custom-question/custom-question.controller";

// The careers form marks required questions in the browser. These go straight to the handler, the
// way a hand-made request would, to check the server holds the same line.

const SUFFIX = `answers-${Date.now()}`;
let adminId: number, jobId: number, otherJobId: number;
// "Do you have the right to work here?" Yes / No, where No is the knockout. Not ticked as required.
let knockoutQuestion: number, yes: number, no: number;
let requiredText: number, optionalText: number;
let otherJobQuestion: number, otherJobOption: number;

function run(controller: (req: Request, res: Response) => unknown, req: Partial<Request>) {
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve) => {
    let status = 200;
    const res = {
      status(code: number) {
        status = code;
        return this;
      },
      json(body: Record<string, unknown>) {
        resolve({ status, body });
        return this;
      },
    } as unknown as Response;
    void controller({ query: {}, params: {}, body: {}, ...req } as unknown as Request, res);
  });
}

const apply = (tag: string, customAnswers: unknown, job = () => jobId) =>
  run(applyForJob, {
    params: { jobId: String(job()) },
    body: { firstName: "Ada", lastName: "Applicant", email: `${tag}.${SUFFIX}@example.test`, customAnswers },
  });

const saved = async (tag: string) => {
  const [row] = await db
    .select({ knockedOut: candidates.knockedOut })
    .from(candidates)
    .where(eq(candidates.email, `${tag}.${SUFFIX}@example.test`));
  return row;
};

async function addQuestion(job: number, title: string, questionType: "radio" | "short_answer", isRequired: boolean, position: number) {
  const [question] = await db
    .insert(jobCustomQuestions)
    .values({ jobId: job, title, questionType, isRequired, position })
    .returning({ id: jobCustomQuestions.id });
  return question!.id;
}

async function addOption(questionId: number, label: string, position: number, isKnockout = false) {
  const [option] = await db
    .insert(jobCustomQuestionOptions)
    .values({ questionId, label, position, isKnockout })
    .returning({ id: jobCustomQuestionOptions.id });
  return option!.id;
}

beforeAll(async () => {
  const [co] = await db.insert(company).values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` }).returning();
  const [dept] = await db.insert(departments).values({ companyId: co!.id, name: `Dept ${SUFFIX}` }).returning();
  const [admin] = await db
    .insert(users)
    .values({ name: "Admin Tester", firstName: "Admin", lastName: "Tester", email: `admin.${SUFFIX}@example.test`, role: "super_admin" })
    .returning();
  adminId = admin!.id;

  const jobRows = await db
    .insert(jobs)
    .values(
      ["main", "other"].map((tag) => ({
        slug: `${tag}-${SUFFIX}`,
        title: `Job ${tag}`,
        departmentId: dept!.id,
        employmentType: "full_time" as const,
        status: "published" as const,
        createdBy: adminId,
      })),
    )
    .returning({ id: jobs.id });
  jobId = jobRows[0]!.id;
  otherJobId = jobRows[1]!.id;
  await db.insert(jobPipelineStages).values([jobId, otherJobId].map((id) => ({ jobId: id, name: "Applied", position: 0 })));

  knockoutQuestion = await addQuestion(jobId, "Right to work?", "radio", false, 1);
  yes = await addOption(knockoutQuestion, "Yes", 1);
  no = await addOption(knockoutQuestion, "No", 2, true);
  requiredText = await addQuestion(jobId, "Why this role?", "short_answer", true, 2);
  optionalText = await addQuestion(jobId, "Anything else?", "short_answer", false, 3);

  otherJobQuestion = await addQuestion(otherJobId, "Other job question", "radio", false, 1);
  otherJobOption = await addOption(otherJobQuestion, "Harmless", 1);
  await addOption(otherJobQuestion, "Also harmless", 2);
});

afterAll(async () => {
  await db.delete(candidates).where(inArray(candidates.jobId, [jobId, otherJobId]));
  await db.delete(jobs).where(inArray(jobs.id, [jobId, otherJobId]));
  await db.delete(users).where(eq(users.id, adminId));
  await db.delete(company).where(eq(company.email, `co.${SUFFIX}@example.test`));
});

const why = () => ({ questionId: requiredText, answerText: "I like the product" });

describe("applying with answers", () => {
  it("accepts a complete application", async () => {
    const res = await apply("complete", [{ questionId: knockoutQuestion, optionIds: [yes] }, why()]);

    expect(res.status).toBe(201);
    expect((await saved("complete"))?.knockedOut).toBe(false);
  });

  it("flags the candidate who picks the knockout answer", async () => {
    const res = await apply("honest", [{ questionId: knockoutQuestion, optionIds: [no] }, why()]);

    expect(res.status).toBe(201);
    expect((await saved("honest"))?.knockedOut).toBe(true);
  });

  it("refuses an application that leaves out the knockout question", async () => {
    const res = await apply("skipper", [why()]);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Please answer "Right to work?"');
    expect(await saved("skipper")).toBeUndefined();
  });

  it("refuses an application that leaves out a required question", async () => {
    const res = await apply("norequired", [{ questionId: knockoutQuestion, optionIds: [yes] }]);

    expect(res.status).toBe(400);
    expect(await saved("norequired")).toBeUndefined();
  });

  it("refuses an application with no answers at all", async () => {
    expect((await apply("empty", undefined)).status).toBe(400);
    expect((await apply("empty", [])).status).toBe(400);
    expect(await saved("empty")).toBeUndefined();
  });

  it("refuses an option that belongs to another question", async () => {
    // Answering the knockout question with an option from another job's question.
    const res = await apply("foreign", [{ questionId: knockoutQuestion, optionIds: [otherJobOption] }, why()]);

    expect(res.status).toBe(400);
    expect(await saved("foreign")).toBeUndefined();
  });

  it("refuses an answer to another job's question, and does not skip it quietly", async () => {
    const res = await apply("otherjob", [
      { questionId: knockoutQuestion, optionIds: [yes] },
      why(),
      { questionId: otherJobQuestion, optionIds: [otherJobOption] },
    ]);

    expect(res.status).toBe(400);
    expect(await saved("otherjob")).toBeUndefined();
  });

  it("lets an optional question be left blank", async () => {
    const res = await apply("blank", [
      { questionId: knockoutQuestion, optionIds: [yes] },
      why(),
      { questionId: optionalText, answerText: "" },
    ]);
    expect(res.status).toBe(201);
  });

  it("asks for nothing on a job with no questions that must be answered", async () => {
    expect((await apply("noquestions", undefined, () => otherJobId)).status).toBe(201);
  });
});

describe("the questions an applicant is shown", () => {
  it("mark the knockout question as required, without saying which answer knocks out", async () => {
    const res = await run(getPublicCustomQuestions, { params: { jobId: String(jobId) } });
    const questions = res.body.data as Array<{ id: number; isRequired: boolean; options: Array<Record<string, unknown>> }>;
    const shown = questions.find((question) => question.id === knockoutQuestion)!;

    expect(shown.isRequired).toBe(true);
    expect(questions.find((question) => question.id === optionalText)?.isRequired).toBe(false);
    for (const option of shown.options) {
      expect(option).not.toHaveProperty("isKnockout");
      expect(option).not.toHaveProperty("points");
    }
  });
});
