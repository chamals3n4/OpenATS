import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import request from "supertest";

vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  const { jwks } = await import("../helpers/jwks-holder");
  return { ...actual, createRemoteJWKSet: () => async () => jwks.publicKey };
});

import app from "../../src/app";
import { db } from "../../src/db";
import { company, departments } from "../../src/db/schema/company";
import { jobs } from "../../src/db/schema/jobs";
import { users } from "../../src/db/schema/users";
import { initTestKeys, bearer } from "../helpers/jwt";

// A job description is HTML that reaches the public careers page and every signed-in user. A
// hiring manager must not be able to store a script in it that then runs in an admin's session.

const SUFFIX = `jobdesc${Date.now()}`;
const ATTACK = '<p>Join us</p><img src=x onerror=alert(1)><script>fetch("/api/users")</script>';
let managerAuth: string, managerId: number;
let companyId: number, departmentId: number;
const jobIds: number[] = [];

const storedDescription = async (id: number) =>
  (await db.select({ description: jobs.description }).from(jobs).where(eq(jobs.id, id)))[0]?.description;

beforeAll(async () => {
  await initTestKeys();
  const [co] = await db.insert(company).values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` }).returning();
  companyId = co!.id;
  const [dept] = await db.insert(departments).values({ name: `Dept ${SUFFIX}`, companyId }).returning();
  departmentId = dept!.id;
  const manager = await bearer({ email: `manager.${SUFFIX}@example.test`, role: "hiring_manager" });
  managerAuth = manager.authorization;
  managerId = manager.user.id;
});

afterAll(async () => {
  await db.delete(jobs).where(inArray(jobs.id, jobIds));
  await db.delete(departments).where(eq(departments.id, departmentId));
  await db.delete(company).where(eq(company.id, companyId));
  await db.delete(users).where(eq(users.id, managerId));
});

describe("saving a job description", () => {
  it("stores a new job's description without the handler or the script", async () => {
    const res = await request(app)
      .post("/api/jobs")
      .set("Authorization", managerAuth)
      .send({ title: `Created ${SUFFIX}`, departmentId, employmentType: "full_time", description: ATTACK });

    expect(res.status).toBe(201);
    jobIds.push(res.body.data.id);
    expect(res.body.data.description).toBe("<p>Join us</p>");
    expect(await storedDescription(res.body.data.id)).toBe("<p>Join us</p>");
  });

  it("cleans the description when a job is edited", async () => {
    const jobId = jobIds[0]!;

    const res = await request(app)
      .put(`/api/jobs/${jobId}`)
      .set("Authorization", managerAuth)
      .send({ description: `<h2>Role</h2>${ATTACK}` });

    expect(res.status).toBe(200);
    expect(await storedDescription(jobId)).toBe("<h2>Role</h2><p>Join us</p>");
  });

  it("leaves the description alone when an edit does not send one", async () => {
    const jobId = jobIds[0]!;

    await request(app).put(`/api/jobs/${jobId}`).set("Authorization", managerAuth).send({ location: "Colombo" });

    expect(await storedDescription(jobId)).toBe("<h2>Role</h2><p>Join us</p>");
  });
});

describe("a description saved before cleaning existed", () => {
  it("is cleaned on its way to the careers page", async () => {
    // Written straight into the table, as an old row or a restored backup would be.
    const [legacy] = await db
      .insert(jobs)
      .values({
        title: `Legacy ${SUFFIX}`,
        slug: `legacy-${SUFFIX}`,
        departmentId,
        employmentType: "full_time",
        status: "published",
        description: ATTACK,
        createdBy: managerId,
      })
      .returning({ id: jobs.id });
    jobIds.push(legacy!.id);

    const res = await request(app).get(`/public/jobs/${legacy!.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe("<p>Join us</p>");
  });
});
