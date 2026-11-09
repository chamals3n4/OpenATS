import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import { eq, inArray } from "drizzle-orm";
import request from "supertest";

vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  const { jwks } = await import("../helpers/jwks-holder");
  return { ...actual, createRemoteJWKSet: () => async () => jwks.publicKey };
});
const requestParaformSync = vi.fn(async () => true);
vi.mock("../../src/queues/paraform-sync/queue", () => ({
  requestParaformSync: () => requestParaformSync(),
}));

import app from "../../src/app";
import { db } from "../../src/db";
import { company, departments } from "../../src/db/schema/company";
import { jobs } from "../../src/db/schema/jobs";
import { jobPipelineStages } from "../../src/db/schema/pipeline";
import { candidates } from "../../src/db/schema/candidates";
import { users } from "../../src/db/schema/users";
import {
  paraformCandidateLinks,
  paraformConnection,
  paraformRoleLinks,
  paraformSyncRuns,
} from "../../src/db/schema/paraform";
import { paraformSyncService } from "../../src/modules/paraform/paraform-sync.service";
import { McpAuthError } from "../../src/shared/integrations/paraform/mcp-client";
import type {
  ParaformApi,
  ParaformDecision,
  ParaformSubmission,
} from "../../src/shared/integrations/paraform/paraform-api";
import { initTestKeys, bearer } from "../helpers/jwt";

// The sync against a real database, with Paraform replaced by a fake that answers like it would.

const SUFFIX = `paraform${Date.now()}`;
let adminAuth: string, managerAuth: string;
const userIds: number[] = [];
let companyId: number, departmentId: number, jobId: number, otherJobId: number;
let firstStageId: number, secondStageId: number;

class FakeParaform implements ParaformApi {
  submissions: ParaformSubmission[] = [];
  decisions: Array<{ submissionId: string; decision: ParaformDecision }> = [];
  failWith: Error | null = null;
  async checkAccess() {}
  async listRoles() {
    return [{ id: "role-1", title: "Founding Engineer" }];
  }
  async listSubmissions() {
    if (this.failWith) throw this.failWith;
    return this.submissions;
  }
  async decide(submissionId: string, decision: ParaformDecision) {
    this.decisions.push({ submissionId, decision });
  }
}

function submission(
  id: string,
  first: string,
  email: string | null,
): ParaformSubmission {
  return {
    id: `${SUFFIX}-${id}`,
    roleId: "role-1",
    firstName: first,
    lastName: "Test",
    email,
    phone: null,
    recruiterName: "Rita Recruiter",
    note: "Strong TypeScript background",
    url: null,
  };
}

const emailFor = (name: string) => `${name}.${SUFFIX}@example.test`;

async function connect(sendDecisions = false) {
  await db.delete(paraformConnection);
  await db.insert(paraformConnection).values({
    clientId: "client_test",
    accessTokenEncrypted: "unused-in-these-tests",
    refreshTokenEncrypted: "unused-in-these-tests",
    expiresAt: new Date(Date.now() + 3_600_000),
    accountEmail: "cj@example.test",
    sendDecisions,
  });
}

async function jobCandidates() {
  return db.select().from(candidates).where(eq(candidates.jobId, jobId));
}

beforeAll(async () => {
  await initTestKeys();
  const [co] = await db
    .insert(company)
    .values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` })
    .returning();
  companyId = co!.id;
  const [dept] = await db
    .insert(departments)
    .values({ name: `Dept ${SUFFIX}`, companyId })
    .returning();
  departmentId = dept!.id;

  const admin = await bearer({
    email: `admin.${SUFFIX}@example.test`,
    role: "super_admin",
  });
  const manager = await bearer({
    email: `manager.${SUFFIX}@example.test`,
    role: "hiring_manager",
  });
  adminAuth = admin.authorization;
  managerAuth = manager.authorization;
  userIds.push(admin.user.id, manager.user.id);

  const rows = await db
    .insert(jobs)
    .values(
      ["main", "other"].map((tag) => ({
        title: `Engineer ${tag} ${SUFFIX}`,
        slug: `engineer-${tag}-${SUFFIX}`,
        employmentType: "full_time" as const,
        departmentId,
        createdBy: admin.user.id,
      })),
    )
    .returning({ id: jobs.id });
  jobId = rows[0]!.id;
  otherJobId = rows[1]!.id;

  const stages = await db
    .insert(jobPipelineStages)
    .values([
      { jobId, name: "Applied", position: 1, stageType: "screening" as const },
      {
        jobId,
        name: "Interview",
        position: 2,
        stageType: "interview" as const,
      },
    ])
    .returning({ id: jobPipelineStages.id });
  firstStageId = stages[0]!.id;
  secondStageId = stages[1]!.id;
});

beforeEach(async () => {
  requestParaformSync.mockClear();
  await db.delete(paraformSyncRuns);
  await db
    .delete(candidates)
    .where(inArray(candidates.jobId, [jobId, otherJobId]));
  await db.delete(paraformRoleLinks);
  await db.delete(paraformConnection);
});

afterAll(async () => {
  await db.delete(paraformSyncRuns);
  await db.delete(paraformConnection);
  await db.delete(paraformRoleLinks);
  await db
    .delete(candidates)
    .where(inArray(candidates.jobId, [jobId, otherJobId]));
  await db.delete(jobPipelineStages).where(eq(jobPipelineStages.jobId, jobId));
  await db.delete(jobs).where(inArray(jobs.id, [jobId, otherJobId]));
  await db.delete(departments).where(eq(departments.id, departmentId));
  await db.delete(company).where(eq(company.id, companyId));
  await db.delete(users).where(inArray(users.id, userIds));
});

async function linkRole() {
  await db.insert(paraformRoleLinks).values({
    paraformRoleId: "role-1",
    paraformRoleTitle: "Founding Engineer",
    jobId,
  });
}

describe("importing submissions", () => {
  it("does nothing, and logs nothing, while Paraform is not connected", async () => {
    expect(
      await paraformSyncService.run("scheduled", new FakeParaform()),
    ).toBeNull();
    expect(await db.select().from(paraformSyncRuns)).toHaveLength(0);
  });

  it("puts new submissions in the job's first stage, once, however often it runs", async () => {
    await connect();
    await linkRole();
    const paraform = new FakeParaform();
    paraform.submissions = [
      submission("1", "Ada", emailFor("ada")),
      submission("2", "Bo", emailFor("bo")),
    ];

    const first = await paraformSyncService.run("manual", paraform);
    expect(first).toMatchObject({
      status: "succeeded",
      candidatesImported: 2,
      problems: [],
    });

    const second = await paraformSyncService.run("scheduled", paraform);
    expect(second).toMatchObject({
      status: "succeeded",
      candidatesImported: 0,
    });

    const rows = await jobCandidates();
    expect(rows).toHaveLength(2);
    expect(rows.every((c) => c.currentStageId === firstStageId)).toBe(true);

    const [link] = await db
      .select()
      .from(paraformCandidateLinks)
      .where(eq(paraformCandidateLinks.paraformSubmissionId, `${SUFFIX}-1`));
    expect(link).toMatchObject({
      recruiterName: "Rita Recruiter",
      submissionNote: "Strong TypeScript background",
    });
  });

  it("skips a submission without an email and says so in the log", async () => {
    await connect();
    await linkRole();
    const paraform = new FakeParaform();
    paraform.submissions = [submission("3", "Cy", null)];

    const run = await paraformSyncService.run("manual", paraform);
    expect(run?.candidatesImported).toBe(0);
    expect(run?.problems[0]).toContain("did not share an email");
  });

  it("links someone who already applied directly instead of adding them twice", async () => {
    await connect();
    await linkRole();
    const [direct] = await db
      .insert(candidates)
      .values({
        firstName: "Di",
        lastName: "Rect",
        email: emailFor("di"),
        jobId,
        currentStageId: firstStageId,
      })
      .returning();
    const paraform = new FakeParaform();
    paraform.submissions = [
      submission("4", "Di", emailFor("di").toUpperCase()),
    ];

    const run = await paraformSyncService.run("manual", paraform);
    expect(run).toMatchObject({ status: "succeeded", candidatesImported: 0 });
    expect(await jobCandidates()).toHaveLength(1);
    const [link] = await db
      .select()
      .from(paraformCandidateLinks)
      .where(eq(paraformCandidateLinks.candidateId, direct!.id));
    expect(link?.paraformSubmissionId).toBe(`${SUFFIX}-4`);
  });

  it("fails the run with words an admin can act on when Paraform refuses access", async () => {
    await connect();
    await linkRole();
    const paraform = new FakeParaform();
    paraform.failWith = new McpAuthError(
      "This account has no HM or recruiter MCP access",
    );

    const run = await paraformSyncService.run("manual", paraform);
    expect(run?.status).toBe("failed");
    expect(run?.error).toContain("hiring-manager access");
  });
});

describe("sending decisions back", () => {
  async function importAda(sendDecisions: boolean) {
    await connect(sendDecisions);
    await linkRole();
    const paraform = new FakeParaform();
    paraform.submissions = [submission("5", "Ada", emailFor("ada5"))];
    await paraformSyncService.run("manual", paraform);
    const [ada] = await jobCandidates();
    return { paraform, ada: ada! };
  }

  it("sends nothing while the admin has not turned it on", async () => {
    const { paraform, ada } = await importAda(false);
    await db
      .update(candidates)
      .set({ currentStageId: secondStageId })
      .where(eq(candidates.id, ada.id));

    await paraformSyncService.run("scheduled", paraform);
    expect(paraform.decisions).toEqual([]);
  });

  it("advances a candidate moved on, rejects a rejected one, and sends each once", async () => {
    const { paraform, ada } = await importAda(true);
    expect(paraform.decisions).toEqual([]);

    await db
      .update(candidates)
      .set({ currentStageId: secondStageId })
      .where(eq(candidates.id, ada.id));
    await paraformSyncService.run("scheduled", paraform);
    await paraformSyncService.run("scheduled", paraform);
    expect(paraform.decisions).toEqual([
      { submissionId: `${SUFFIX}-5`, decision: "advance" },
    ]);

    await db
      .update(candidates)
      .set({ status: "rejected" })
      .where(eq(candidates.id, ada.id));
    const run = await paraformSyncService.run("scheduled", paraform);
    expect(run?.decisionsSent).toBe(1);
    expect(paraform.decisions.at(-1)).toEqual({
      submissionId: `${SUFFIX}-5`,
      decision: "reject",
    });
  });
});

describe("the settings API", () => {
  it("is for super admins only", async () => {
    const res = await request(app)
      .get("/api/integrations/paraform")
      .set("Authorization", managerAuth);
    expect(res.status).toBe(403);
  });

  it("shows the connection and the linked roles", async () => {
    await connect();
    await linkRole();
    const res = await request(app)
      .get("/api/integrations/paraform")
      .set("Authorization", adminAuth);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      connected: true,
      accountEmail: "cj@example.test",
      sendDecisions: false,
      roleLinks: [
        {
          paraformRoleTitle: "Founding Engineer",
          jobId,
          candidatesImported: 0,
        },
      ],
    });
  });

  it("refuses to link a job that is already linked", async () => {
    await connect();
    await linkRole();
    const res = await request(app)
      .post("/api/integrations/paraform/role-links")
      .set("Authorization", adminAuth)
      .send({ paraformRoleId: "role-2", paraformRoleTitle: "Designer", jobId });
    expect(res.status).toBe(409);
  });

  it("turns decisions on, but only once Paraform is connected", async () => {
    const before = await request(app)
      .put("/api/integrations/paraform/settings")
      .set("Authorization", adminAuth)
      .send({ sendDecisions: true });
    expect(before.status).toBe(409);

    await connect();
    const after = await request(app)
      .put("/api/integrations/paraform/settings")
      .set("Authorization", adminAuth)
      .send({ sendDecisions: true });
    expect(after.status).toBe(200);
    const [row] = await db.select().from(paraformConnection);
    expect(row?.sendDecisions).toBe(true);
  });

  it("queues a sync when asked", async () => {
    const res = await request(app)
      .post("/api/integrations/paraform/sync")
      .set("Authorization", adminAuth);
    expect(res.status).toBe(202);
    expect(requestParaformSync).toHaveBeenCalledOnce();
  });
});
