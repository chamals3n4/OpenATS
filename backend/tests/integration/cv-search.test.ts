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
import { jobHiringTeam } from "../../src/db/schema/pipeline";
import { candidates } from "../../src/db/schema/candidates";
import { users } from "../../src/db/schema/users";
import { cvTextService } from "../../src/modules/candidate/cv-text.service";
import { normalizeForSearch } from "../../src/modules/candidate/cv-text/normalize-search";
import { initTestKeys, bearer } from "../helpers/jwt";

// A word no other test's data contains, so results are only this file's candidates.
const SUFFIX = `cvs${Date.now()}`;
const TOWN = `kandy${SUFFIX}`;

let managerAuth: string, interviewerAuth: string, outsiderAuth: string;
const userIds: number[] = [];
let companyId: number, departmentId: number, teamJobId: number, otherJobId: number;
let nurseId: number, namesakeId: number, otherJobNurseId: number;

const NURSE_CV = [
  "Nimal Fernando",
  `Registered Nurse at ${TOWN} General Hospital`,
  "Eight years of experience in intensive care and emergency wards.",
  "Triage, wound care, patient records and ventilator management.",
  "Built ward reporting tools in C++.",
].join("\n");
const WELDER_CV = "Certified welder. MIG and TIG welding, structural steel, blueprint reading. Ten years on site.";

async function addCandidate(jobId: number, firstName: string, lastName: string, cv: string) {
  const resumeUrl = `https://files.example.test/resumes/${firstName}-${SUFFIX}.pdf`.toLowerCase();
  const [candidate] = await db
    .insert(candidates)
    .values({ firstName, lastName, email: `${firstName}.${jobId}.${SUFFIX}@example.test`.toLowerCase(), jobId, resumeUrl })
    .returning();
  await cvTextService.markPending(candidate!.id, resumeUrl);
  await cvTextService.save(candidate!.id, resumeUrl, {
    status: "done",
    fileType: "pdf",
    method: "text",
    text: cv,
    searchText: normalizeForSearch(cv),
    pageCount: 1,
  });
  return candidate!.id;
}

const search = (auth: string, query: string, path = "/api/candidates") =>
  request(app).get(path).query({ search: query }).set("Authorization", auth);

beforeAll(async () => {
  await initTestKeys();
  const [co] = await db.insert(company).values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` }).returning();
  companyId = co!.id;
  const [dept] = await db.insert(departments).values({ name: `Dept ${SUFFIX}`, companyId }).returning();
  departmentId = dept!.id;

  const manager = await bearer({ email: `manager.${SUFFIX}@example.test`, role: "hiring_manager", firstName: "On", lastName: "Team" });
  const interviewer = await bearer({ email: `interviewer.${SUFFIX}@example.test`, role: "interviewer", firstName: "Inter", lastName: "Viewer" });
  const outsider = await bearer({ email: `outsider.${SUFFIX}@example.test`, role: "hiring_manager", firstName: "Off", lastName: "Team" });
  managerAuth = manager.authorization;
  interviewerAuth = interviewer.authorization;
  outsiderAuth = outsider.authorization;
  userIds.push(manager.user.id, interviewer.user.id, outsider.user.id);

  const job = (name: string) => ({
    title: `${name} ${SUFFIX}`,
    slug: `${name}-${SUFFIX}`.toLowerCase(),
    description: "Test job",
    employmentType: "full_time" as const,
    departmentId,
    status: "published" as const,
    createdBy: manager.user.id,
  });
  const [teamJob] = await db.insert(jobs).values(job("Nurse")).returning();
  const [otherJob] = await db.insert(jobs).values(job("Other")).returning();
  teamJobId = teamJob!.id;
  otherJobId = otherJob!.id;
  await db.insert(jobHiringTeam).values([
    { jobId: teamJobId, userId: manager.user.id },
    { jobId: teamJobId, userId: interviewer.user.id },
  ]);

  nurseId = await addCandidate(teamJobId, "Nimal", "Fernando", NURSE_CV);
  // Found by name only: the search word is their surname, and their CV is about something else.
  namesakeId = await addCandidate(teamJobId, "Asha", TOWN, WELDER_CV);
  otherJobNurseId = await addCandidate(otherJobId, "Ruwan", "Silva", NURSE_CV);
});

afterAll(async () => {
  await db.delete(candidates).where(inArray(candidates.jobId, [teamJobId, otherJobId]));
  await db.delete(jobHiringTeam).where(eq(jobHiringTeam.jobId, teamJobId));
  await db.delete(jobs).where(inArray(jobs.id, [teamJobId, otherJobId]));
  await db.delete(users).where(inArray(users.id, userIds));
  await db.delete(departments).where(eq(departments.id, departmentId));
  await db.delete(company).where(eq(company.id, companyId));
});

describe("searching candidates by what is in their CV", () => {
  it("finds candidates by words that appear only in the CV, with the place marked", async () => {
    const res = await search(managerAuth, `ventilator ${TOWN}`);

    expect(res.status).toBe(200);
    expect(res.body.data.map((c: any) => c.id).sort()).toEqual([nurseId, otherJobNurseId].sort());
    expect(res.body.pagination.total).toBe(2);
    for (const row of res.body.data) {
      expect(row.cvSnippet).toContain("[[ventilator]]");
      expect(row.cvSnippet).not.toContain("\n");
    }
  });

  it("puts a name match first and gives it no CV snippet", async () => {
    const res = await search(managerAuth, TOWN);

    const ids = res.body.data.map((c: any) => c.id);
    expect(ids[0]).toBe(namesakeId);
    expect(ids.slice(1).sort()).toEqual([nurseId, otherJobNurseId].sort());
    expect(res.body.data[0].cvSnippet).toBeNull();
  });

  it("still finds by name and email as before", async () => {
    const byName = await search(managerAuth, "Nimal", `/api/candidates/jobs/${teamJobId}`);
    expect(byName.body.data.map((c: any) => c.id)).toEqual([nurseId]);

    const byEmail = await search(managerAuth, `asha.${teamJobId}.${SUFFIX}`);
    expect(byEmail.body.data.map((c: any) => c.id)).toEqual([namesakeId]);
  });

  it("understands phrases, exclusions and C++", async () => {
    const ids = async (query: string) =>
      (await search(managerAuth, query, `/api/candidates/jobs/${teamJobId}`)).body.data.map((c: any) => c.id);

    expect(await ids('"intensive care"')).toEqual([nurseId]);
    expect(await ids("welding steel")).toEqual([namesakeId]);
    expect(await ids("welding -steel")).toEqual([]);
    expect(await ids("C++")).toEqual([nurseId]);
    expect(await ids("C#")).toEqual([]);
  });

  it("does not fail on input that is not a tidy query", async () => {
    for (const query of ['"unclosed', "a & | !", "the of and", "100% (nurse", "'; drop table candidates; --"]) {
      expect((await search(managerAuth, query, `/api/candidates/jobs/${teamJobId}`)).status).toBe(200);
    }
  });

  it("shows an interviewer only candidates of jobs they are on the hiring team of", async () => {
    const res = await search(interviewerAuth, `nurse ${TOWN}`);
    expect(res.body.data.map((c: any) => c.id)).toEqual([nurseId]);
  });

  it("adds no snippet when nothing was searched for", async () => {
    const res = await request(app).get(`/api/candidates/jobs/${teamJobId}`).set("Authorization", managerAuth);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).not.toHaveProperty("cvSnippet");
  });
});

describe("reading a candidate's CV text", () => {
  it("is returned with the candidate and on its own", async () => {
    const detail = await request(app).get(`/api/candidates/${nurseId}`).set("Authorization", managerAuth);
    expect(detail.status).toBe(200);
    expect(detail.body.data.cvText).toMatchObject({ status: "done", method: "text", pageCount: 1 });
    expect(detail.body.data.cvText.text).toContain("General Hospital");

    const own = await request(app).get(`/api/candidates/${nurseId}/cv-text`).set("Authorization", managerAuth);
    expect(own.status).toBe(200);
    expect(own.body.data.text).toBe(NURSE_CV);
  });

  it("follows the same access rule as opening the candidate", async () => {
    const cvText = (id: number, auth: string) =>
      request(app).get(`/api/candidates/${id}/cv-text`).set("Authorization", auth);

    // An interviewer is limited to jobs they are on the hiring team of.
    expect((await cvText(nurseId, interviewerAuth)).status).toBe(200);
    expect((await cvText(otherJobNurseId, interviewerAuth)).status).toBe(403);
    // A hiring manager sees every candidate, as everywhere else.
    expect((await cvText(otherJobNurseId, outsiderAuth)).status).toBe(200);
  });

  it("says so when there is no CV text", async () => {
    const res = await request(app).get("/api/candidates/999999999/cv-text").set("Authorization", managerAuth);
    expect(res.status).toBe(404);
  });
});
