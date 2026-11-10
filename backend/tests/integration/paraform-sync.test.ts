import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { randomBytes } from "crypto";
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
import {
  ParaformNotConnectedError,
  paraformConnectionService,
} from "../../src/modules/paraform/paraform-connection.service";
import { McpAuthError } from "../../src/shared/integrations/paraform/mcp-client";
import { ParaformOAuthError } from "../../src/shared/integrations/paraform/oauth";
import { encrypt } from "../../src/shared/integrations/crypto";
import type {
  ParaformApi,
  ParaformSubmission,
} from "../../src/shared/integrations/paraform/paraform-api";
import { initTestKeys, bearer } from "../helpers/jwt";

// The sync against a real database, with Paraform replaced by a fake that answers like it would.

const SUFFIX = `paraform${Date.now()}`;
let adminAuth: string, managerAuth: string;
const userIds: number[] = [];
let companyId: number, departmentId: number, jobId: number, otherJobId: number;
let firstStageId: number;

class FakeParaform implements ParaformApi {
  submissions: ParaformSubmission[] = [];
  /** Ids whose full record Paraform fails to give, with the error it gives instead. */
  readFails = new Map<string, Error>();
  reads: string[] = [];
  failWith: Error | null = null;
  async checkAccess() {}
  async listRoles() {
    return [{ id: "role-1", title: "Founding Engineer" }];
  }
  async listSubmissionIds() {
    if (this.failWith) throw this.failWith;
    return this.submissions.map((s) => s.id);
  }
  async getSubmission(id: string) {
    this.reads.push(id);
    const fail = this.readFails.get(id);
    if (fail) throw fail;
    const found = this.submissions.find((s) => s.id === id);
    if (!found) throw new Error(`no submission ${id}`);
    return found;
  }
}

/** Paraform shares no email field: the email, when there is one, is in the CV text. */
function submission(
  id: string,
  first: string,
  email: string | null,
): ParaformSubmission {
  return {
    id: `${SUFFIX}-${id}`,
    roleId: "role-1",
    name: `${first} Test`,
    resumeText: `${first.toUpperCase()} TEST London${email ? ` | ${email}` : ""} EXPERIENCE Engines 2019 - 2024`,
    note: "Strong TypeScript background",
    url: `https://www.paraform.com/client/role-1?app_id=${SUFFIX}-${id}`,
  };
}

const emailFor = (name: string) => `${name}.${SUFFIX}@example.test`;

async function connect() {
  await db.delete(paraformConnection);
  await db.insert(paraformConnection).values({
    clientId: "client_test",
    accessTokenEncrypted: "unused-in-these-tests",
    refreshTokenEncrypted: "unused-in-these-tests",
    expiresAt: new Date(Date.now() + 3_600_000),
    accountEmail: "cj@example.test",
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
    expect(rows.find((c) => c.firstName === "Ada")).toMatchObject({
      lastName: "Test",
      email: emailFor("ada"),
    });
    // Each submission is read in full once; the second run saw both were imported already.
    expect(paraform.reads).toEqual([`${SUFFIX}-1`, `${SUFFIX}-2`]);

    const [link] = await db
      .select()
      .from(paraformCandidateLinks)
      .where(eq(paraformCandidateLinks.paraformSubmissionId, `${SUFFIX}-1`));
    expect(link).toMatchObject({
      submissionNote: "Strong TypeScript background",
      paraformUrl: `https://www.paraform.com/client/role-1?app_id=${SUFFIX}-1`,
    });
  });

  it("skips a submission whose CV text has no email and says so in the log", async () => {
    await connect();
    await linkRole();
    const paraform = new FakeParaform();
    paraform.submissions = [submission("3", "Cy", null)];

    const run = await paraformSyncService.run("manual", paraform);
    expect(run?.candidatesImported).toBe(0);
    expect(run?.problems[0]).toContain("CV text has none");
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

  it("links a direct applicant whose email a staff member saved with capitals", async () => {
    await connect();
    await linkRole();
    const [direct] = await db
      .insert(candidates)
      .values({
        firstName: "Ed",
        lastName: "Ited",
        email: emailFor("Ed.Ited"),
        jobId,
        currentStageId: firstStageId,
      })
      .returning();
    const paraform = new FakeParaform();
    paraform.submissions = [
      submission("6", "Ed", emailFor("ed.ited")),
    ];

    const run = await paraformSyncService.run("manual", paraform);
    expect(run).toMatchObject({ status: "succeeded", candidatesImported: 0 });
    expect(await jobCandidates()).toHaveLength(1);
    const [link] = await db
      .select()
      .from(paraformCandidateLinks)
      .where(eq(paraformCandidateLinks.candidateId, direct!.id));
    expect(link?.paraformSubmissionId).toBe(`${SUFFIX}-6`);
  });

  it("imports nobody, and says why, when the email matches two candidates that differ only in capitals", async () => {
    await connect();
    await linkRole();
    const twins = await db
      .insert(candidates)
      .values([
        { firstName: "Fi", lastName: "One", email: emailFor("fi"), jobId, currentStageId: firstStageId },
        { firstName: "Fi", lastName: "Two", email: emailFor("FI"), jobId, currentStageId: firstStageId },
      ])
      .returning({ id: candidates.id });
    const paraform = new FakeParaform();
    paraform.submissions = [submission("7", "Fi", emailFor("fi"))];

    const run = await paraformSyncService.run("manual", paraform);
    expect(run?.candidatesImported).toBe(0);
    expect(await jobCandidates()).toHaveLength(2);
    expect(await db.select().from(paraformCandidateLinks).where(inArray(paraformCandidateLinks.candidateId, twins.map((t) => t.id)))).toEqual([]);
    expect(run?.problems).toHaveLength(1);
    expect(run?.problems[0]).toContain("more than one candidate");
  });

  it("names ids, never a person, in the sync log, which outlives a deleted candidate", async () => {
    await connect();
    await linkRole();
    const paraform = new FakeParaform();
    paraform.submissions = [
      submission("8", "Gwendolyn", null),
      submission("9", "Hermione", emailFor("hermione")),
      submission("10", "Hermione", emailFor("hermione")),
      submission("12", "Jo", emailFor("jo")),
    ];
    paraform.readFails.set(`${SUFFIX}-12`, new Error("Jo Test is not visible to you"));

    const run = await paraformSyncService.run("manual", paraform);
    expect(run?.candidatesImported).toBe(1);
    expect(run?.problems).toHaveLength(3);
    const runs = await db.select().from(paraformSyncRuns);
    const log = JSON.stringify(runs.map((r) => [r.problems, r.error]));
    expect(log).toContain(`Paraform submission ${SUFFIX}-8`);
    expect(log).toContain(`Paraform submission ${SUFFIX}-12 could not be read`);
    expect(log).not.toMatch(/Gwendolyn|Hermione|Jo Test|@example\.test/);
  });

  it("reads a submission Paraform failed to give again on the next run", async () => {
    await connect();
    await linkRole();
    const paraform = new FakeParaform();
    paraform.submissions = [submission("13", "Kit", emailFor("kit"))];
    paraform.readFails.set(`${SUFFIX}-13`, new Error("timeout"));
    expect((await paraformSyncService.run("manual", paraform))?.candidatesImported).toBe(0);

    paraform.readFails.clear();
    expect((await paraformSyncService.run("manual", paraform))?.candidatesImported).toBe(1);
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

describe("one run at a time", () => {
  it("does not start a run while another is running", async () => {
    await connect();
    await linkRole();
    await db.insert(paraformSyncRuns).values({ trigger: "scheduled" });

    expect(await paraformSyncService.run("manual", new FakeParaform())).toBeNull();
    expect(await db.select().from(paraformSyncRuns)).toHaveLength(1);
  });

  it("gives nothing to a run started while another is still syncing", async () => {
    await connect();
    await linkRole();
    let entered!: () => void;
    let release!: () => void;
    const inside = new Promise<void>((resolve) => (entered = resolve));
    const gate = new Promise<void>((resolve) => (release = resolve));
    const slow = new FakeParaform();
    slow.submissions = [submission("11", "Ivy", emailFor("ivy"))];
    slow.listSubmissionIds = async () => {
      entered();
      await gate;
      return slow.submissions.map((s) => s.id);
    };

    const first = paraformSyncService.run("scheduled", slow);
    await inside;
    expect(await paraformSyncService.run("manual", new FakeParaform())).toBeNull();
    release();
    expect((await first)?.status).toBe("succeeded");
    expect(await db.select().from(paraformSyncRuns)).toHaveLength(1);
    expect(await jobCandidates()).toHaveLength(1);
  });

  it("is enforced by the database, so two workers checking at the same moment cannot both start", async () => {
    await db.insert(paraformSyncRuns).values({ trigger: "scheduled" });
    await expect(
      db.insert(paraformSyncRuns).values({ trigger: "manual" }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });
    // Finished runs are not limited: the log keeps all of them.
    await db.insert(paraformSyncRuns).values([
      { trigger: "manual", status: "succeeded" },
      { trigger: "manual", status: "failed" },
    ]);
  });

  it("starts again once a run left running for too long is written off", async () => {
    await connect();
    await db.insert(paraformSyncRuns).values({
      trigger: "scheduled",
      startedAt: new Date(Date.now() - 31 * 60_000),
    });

    const run = await paraformSyncService.run("manual", new FakeParaform());
    expect(run?.status).toBe("succeeded");
    const runs = await db.select().from(paraformSyncRuns);
    expect(runs.map((r) => r.status).sort()).toEqual(["failed", "succeeded"]);
  });
});

describe("refreshing the Paraform sign-in", () => {
  beforeEach(async () => {
    vi.stubEnv("ENCRYPTION_KEY", randomBytes(32).toString("base64"));
    await db.insert(paraformConnection).values({
      clientId: "client_test",
      accessTokenEncrypted: encrypt("old-access"),
      refreshTokenEncrypted: encrypt("refresh-1"),
      expiresAt: new Date(Date.now() - 1000),
      accountEmail: "cj@example.test",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  function paraformAnswers(status: number, body: unknown) {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
    );
  }

  async function needsReconnect() {
    const [row] = await db.select().from(paraformConnection);
    return row!.needsReconnect;
  }

  it.each([
    [503, { error: "temporarily_unavailable" }],
    [502, null],
    [429, { error: "slow_down" }],
  ])("keeps the connection when Paraform answers %i, so the next run tries again", async (status, body) => {
    paraformAnswers(status, body);
    await expect(paraformConnectionService.getValidAccessToken()).rejects.toBeInstanceOf(ParaformOAuthError);
    expect(await needsReconnect()).toBe(false);
  });

  it.each([400, 401])("asks for a reconnect when Paraform refuses the refresh token (%i)", async (status) => {
    paraformAnswers(status, { error: "invalid_grant" });
    await expect(paraformConnectionService.getValidAccessToken()).rejects.toBeInstanceOf(ParaformNotConnectedError);
    expect(await needsReconnect()).toBe(true);
  });

  it("uses the new token when the refresh works", async () => {
    paraformAnswers(200, { access_token: "new-access", refresh_token: "refresh-2", expires_in: 300 });
    expect(await paraformConnectionService.getValidAccessToken()).toBe("new-access");
    expect(await needsReconnect()).toBe(false);
  });

  it("fails just that run, telling the admin not to reconnect, when the outage hits mid-sync", async () => {
    await linkRole();
    const paraform = new FakeParaform();
    paraform.failWith = new ParaformOAuthError("Paraform refused the request to /oauth2/token: HTTP 503", 503);

    const run = await paraformSyncService.run("manual", paraform);
    expect(run?.status).toBe("failed");
    expect(run?.error).toContain("don't need to reconnect");
    expect(run?.problems).toEqual([]);
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

  it("shows an imported candidate's Paraform link on their page", async () => {
    await connect();
    await linkRole();
    const paraform = new FakeParaform();
    paraform.submissions = [submission("14", "Lu", emailFor("lu"))];
    await paraformSyncService.run("manual", paraform);
    const [lu] = await jobCandidates();

    const res = await request(app)
      .get(`/api/candidates/${lu!.id}`)
      .set("Authorization", adminAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.paraformUrl).toBe(
      `https://www.paraform.com/client/role-1?app_id=${SUFFIX}-14`,
    );
  });

  it("queues a sync when asked", async () => {
    const res = await request(app)
      .post("/api/integrations/paraform/sync")
      .set("Authorization", adminAuth);
    expect(res.status).toBe(202);
    expect(requestParaformSync).toHaveBeenCalledOnce();
  });
});
