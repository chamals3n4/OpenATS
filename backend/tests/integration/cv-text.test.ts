import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, sql } from "drizzle-orm";

import { db } from "../../src/db";
import { company, departments } from "../../src/db/schema/company";
import { jobs } from "../../src/db/schema/jobs";
import { candidateCvText, candidates } from "../../src/db/schema/candidates";
import { users } from "../../src/db/schema/users";
import { cvTextService } from "../../src/modules/candidate/cv-text.service";
import { extractCvText } from "../../src/modules/candidate/cv-text";
import { normalizeForSearch } from "../../src/modules/candidate/cv-text/normalize-search";
import { buildPdf } from "../helpers/pdf";

const SUFFIX = `cvt${Date.now()}`;
const OLD_URL = `https://files.example.test/resumes/old-${SUFFIX}.pdf`;
const NEW_URL = `https://files.example.test/resumes/new-${SUFFIX}.pdf`;
let companyId: number, departmentId: number, userId: number, jobId: number, candidateId: number;

/** Whether the candidate's stored CV text matches a search typed by a recruiter. */
async function matches(query: string): Promise<boolean> {
  const rows = await db
    .select({ id: candidateCvText.id })
    .from(candidateCvText)
    .where(
      sql`${candidateCvText.candidateId} = ${candidateId}
        and ${candidateCvText.searchVector} @@ websearch_to_tsquery('english', ${normalizeForSearch(query)})`,
    );
  return rows.length > 0;
}

const cvFile = () =>
  buildPdf([
    [
      { text: "Nimal Fernando", x: 50, y: 800 },
      { text: "Registered Nurse, Kandy General Hospital", x: 50, y: 780 },
      { text: "Eight years of experience in intensive care and emergency wards.", x: 50, y: 750 },
      { text: "Triage, wound care, patient records and ventilator management.", x: 50, y: 735 },
      { text: "Trained junior staff on infection control and medication rounds.", x: 50, y: 720 },
      { text: "Built ward reporting tools in C++ and Node.js.", x: 50, y: 690 },
    ],
  ]);

beforeAll(async () => {
  const [co] = await db.insert(company).values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` }).returning();
  companyId = co!.id;
  const [dept] = await db.insert(departments).values({ name: `Dept ${SUFFIX}`, companyId }).returning();
  departmentId = dept!.id;
  const [user] = await db
    .insert(users)
    .values({ email: `owner.${SUFFIX}@example.test`, role: "hiring_manager", name: "Job Owner", firstName: "Job", lastName: "Owner" })
    .returning();
  userId = user!.id;
  const [job] = await db
    .insert(jobs)
    .values({
      title: `Nurse ${SUFFIX}`,
      slug: `nurse-${SUFFIX}`,
      description: "Test job",
      employmentType: "full_time",
      departmentId,
      status: "published",
      createdBy: userId,
    })
    .returning();
  jobId = job!.id;
  const [candidate] = await db
    .insert(candidates)
    .values({ firstName: "Nimal", lastName: "Fernando", email: `nimal.${SUFFIX}@example.test`, jobId, resumeUrl: OLD_URL })
    .returning();
  candidateId = candidate!.id;
});

afterAll(async () => {
  await db.delete(candidates).where(eq(candidates.jobId, jobId));
  await db.delete(jobs).where(eq(jobs.id, jobId));
  await db.delete(users).where(eq(users.id, userId));
  await db.delete(departments).where(eq(departments.id, departmentId));
  await db.delete(company).where(eq(company.id, companyId));
});

describe("stored CV text", () => {
  it("starts as pending, then holds the text once the file has been read", async () => {
    await cvTextService.markPending(candidateId, OLD_URL);
    expect((await cvTextService.getForCandidate(candidateId))?.status).toBe("pending");

    await cvTextService.save(candidateId, OLD_URL, await extractCvText(cvFile()));

    const stored = await cvTextService.getForCandidate(candidateId);
    expect(stored?.status).toBe("done");
    expect(stored?.method).toBe("text");
    expect(stored?.pageCount).toBe(1);
    expect(stored?.text).toContain("Kandy General Hospital");
  });

  it("is searchable by words that appear only in the CV", async () => {
    expect(await matches("nurse kandy")).toBe(true);
    expect(await matches("ventilator")).toBe(true);
    // Stemming: the CV says "wards" and "Trained".
    expect(await matches("ward training")).toBe(true);
    expect(await matches('"intensive care"')).toBe(true);
    expect(await matches("nurse -kandy")).toBe(false);
    expect(await matches("welder")).toBe(false);
  });

  it("keeps C++ apart from C#, and finds Node.js however it is typed", async () => {
    expect(await matches("C++")).toBe(true);
    expect(await matches("C#")).toBe(false);
    expect(await matches("node")).toBe(true);
    expect(await matches("nodejs")).toBe(true);
    expect(await matches("node.js")).toBe(true);
  });

  it("drops a result for a CV that has since been replaced", async () => {
    await cvTextService.markPending(candidateId, NEW_URL);
    expect(await matches("nurse")).toBe(false);

    // The job for the old file finishes late: nothing may be written.
    await cvTextService.save(candidateId, OLD_URL, await extractCvText(cvFile()));
    await cvTextService.markFailed(candidateId, OLD_URL, "late failure");

    const stored = await cvTextService.getForCandidate(candidateId);
    expect(stored?.status).toBe("pending");
    expect(stored?.text).toBeNull();
  });

  it("records a failure and keeps nothing searchable", async () => {
    await cvTextService.markFailed(candidateId, NEW_URL, "The PDF is password protected");
    expect((await cvTextService.getForCandidate(candidateId))?.status).toBe("failed");
    expect(await matches("nurse")).toBe(false);
  });

  it("works the details out again from the stored text, without the file", async () => {
    await cvTextService.markPending(candidateId, OLD_URL);
    await cvTextService.save(candidateId, OLD_URL, await extractCvText(cvFile()));
    await db
      .update(candidateCvText)
      .set({ sections: null, searchText: "stale" })
      .where(eq(candidateCvText.candidateId, candidateId));
    expect(await matches("nurse")).toBe(false);

    expect(await cvTextService.reparseAll()).toBeGreaterThanOrEqual(1);

    expect(await matches("nurse")).toBe(true);
    expect((await cvTextService.getForCandidate(candidateId))?.sections?.[0]?.key).toBe("header");
  });

  it("goes when the candidate is deleted", async () => {
    await db.delete(candidates).where(eq(candidates.id, candidateId));
    expect(await cvTextService.getForCandidate(candidateId)).toBeNull();
  });
});
