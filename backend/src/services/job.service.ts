import { eq, desc, ilike, inArray, and, sql } from "drizzle-orm";
import { db, NewJob } from "../db";
import {
  jobs,
  jobSkills,
  pipelineStageTemplates,
  jobPipelineStages,
  jobHiringTeam,
  jobAssessmentAttachments,
  offers,
  candidates,
  departments,
} from "../db/schema";

export type JobListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  departmentId?: number;
  userId?: number;
};

export type CreateJobInput = {
  title: string;
  departmentId: number;
  employmentType:
    | "full_time"
    | "part_time"
    | "contract"
    | "internship"
    | "freelance";
  location?: string | null;
  description?: string | null;
  skills?: string[];
  salaryType?: "range" | "fixed" | null;
  currency?: string | null;
  payFrequency?: "hourly" | "daily" | "weekly" | "monthly" | "yearly" | null;
  salaryFixed?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  status?: "draft" | "inactive" | "published" | "closed" | "archived";
  createdBy: number;
};

export type UpdateJobInput = {
  title?: string;
  departmentId?: number;
  employmentType?:
    | "full_time"
    | "part_time"
    | "contract"
    | "internship"
    | "freelance";
  location?: string | null;
  description?: string | null;
  skills?: string[];
  salaryType?: "range" | "fixed" | null;
  currency?: string | null;
  payFrequency?: "hourly" | "daily" | "weekly" | "monthly" | "yearly" | null;
  salaryFixed?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  status?: "draft" | "inactive" | "published" | "closed" | "archived";
};

function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") +
    "-" +
    Date.now()
  );
}

export const jobService = {
  /** Published jobs for the public careers index (no auth). */
  async listPublishedForCareers() {
    const rows = await db
      .select({
        id: jobs.id,
        slug: jobs.slug,
        title: jobs.title,
        employmentType: jobs.employmentType,
        location: jobs.location,
        departmentName: departments.name,
        createdAt: jobs.createdAt,
      })
      .from(jobs)
      .innerJoin(departments, eq(jobs.departmentId, departments.id))
      .where(eq(jobs.status, "published"))
      .orderBy(desc(jobs.createdAt));

    return rows;
  },

  async getAll(userId?: number) {
    const teamFilter = userId
      ? inArray(jobs.id, db.select({ id: jobHiringTeam.jobId }).from(jobHiringTeam).where(eq(jobHiringTeam.userId, userId)))
      : undefined;
    const allJobs = await db.select().from(jobs).where(teamFilter).orderBy(desc(jobs.createdAt));

    const skillsByJobId = new Map<number, string[]>();
    if (allJobs.length > 0) {
      const allSkills = await db
        .select()
        .from(jobSkills)
        .where(inArray(jobSkills.jobId, allJobs.map((j) => j.id)));
      allSkills.forEach((s) => {
        if (!skillsByJobId.has(s.jobId)) skillsByJobId.set(s.jobId, []);
        skillsByJobId.get(s.jobId)!.push(s.skill);
      });
    }

    return allJobs.map((job) => ({
      ...job,
      skills: skillsByJobId.get(job.id) ?? [],
    }));
  },

  async getPaginated(filters: JobListFilters = {}) {
    const { page = 1, limit = 15, search, status, departmentId, userId } = filters;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) conditions.push(ilike(jobs.title, `%${search}%`));
    if (status) conditions.push(eq(jobs.status, status as any));
    if (departmentId) conditions.push(eq(jobs.departmentId, departmentId));
    if (userId) conditions.push(
      inArray(jobs.id, db.select({ id: jobHiringTeam.jobId }).from(jobHiringTeam).where(eq(jobHiringTeam.userId, userId)))
    );
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [countRow]] = await Promise.all([
      db.select().from(jobs).where(where).orderBy(desc(jobs.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(jobs).where(where),
    ]);

    const skillsByJobId = new Map<number, string[]>();
    if (rows.length > 0) {
      const allSkills = await db
        .select()
        .from(jobSkills)
        .where(inArray(jobSkills.jobId, rows.map((j) => j.id)));
      allSkills.forEach((s) => {
        if (!skillsByJobId.has(s.jobId)) skillsByJobId.set(s.jobId, []);
        skillsByJobId.get(s.jobId)!.push(s.skill);
      });
    }

    const total = countRow?.count ?? 0;
    return {
      rows: rows.map((j) => ({ ...j, skills: skillsByJobId.get(j.id) ?? [] })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async deleteMany(ids: number[]) {
    if (ids.length === 0) return [];
    return db.transaction(async (tx) => {
      await tx.delete(offers).where(inArray(offers.jobId, ids));
      await tx.delete(candidates).where(inArray(candidates.jobId, ids));
      return tx.delete(jobs).where(inArray(jobs.id, ids)).returning();
    });
  },

  async getById(id: number) {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return null;

    const skills = await db
      .select()
      .from(jobSkills)
      .where(eq(jobSkills.jobId, id));

    const team = await db
      .select()
      .from(jobHiringTeam)
      .where(eq(jobHiringTeam.jobId, id));

    const stages = await db
      .select()
      .from(jobPipelineStages)
      .where(eq(jobPipelineStages.jobId, id))
      .orderBy(jobPipelineStages.position);

    return {
      ...job,
      skills: skills.map((s) => s.skill),
      hiringTeam: team,
      pipelineStages: stages,
    };
  },

  async getBySlug(slug: string) {
    const [job] = await db.select().from(jobs).where(eq(jobs.slug, slug));
    if (!job) return null;

    const skills = await db
      .select()
      .from(jobSkills)
      .where(eq(jobSkills.jobId, job.id));

    return {
      ...job,
      skills: skills.map((s) => s.skill),
    };
  },

  async create(input: CreateJobInput) {
    const slug = generateSlug(input.title);
    const { skills, ...jobData } = input;

    return await db.transaction(async (tx) => {
      const newJob: NewJob = {
        title: jobData.title,
        slug,
        departmentId: jobData.departmentId,
        employmentType: jobData.employmentType,
        location: jobData.location ?? null,
        description: jobData.description ?? null,
        salaryType: jobData.salaryType ?? null,
        currency: jobData.currency ?? null,
        payFrequency: jobData.payFrequency ?? null,
        salaryFixed: jobData.salaryFixed ?? null,
        salaryMin: jobData.salaryMin ?? null,
        salaryMax: jobData.salaryMax ?? null,
        status: jobData.status ?? "draft",
        createdBy: jobData.createdBy,
      };

      const [job] = await tx.insert(jobs).values(newJob).returning();

      if (!job) {
        throw new Error("Failed to create job");
      }

      if (skills && skills.length > 0) {
        await tx
          .insert(jobSkills)
          .values(skills.map((skill) => ({ jobId: job.id, skill })));
      }

      const templates = await tx
        .select()
        .from(pipelineStageTemplates)
        .orderBy(pipelineStageTemplates.position);

      if (templates.length > 0) {
        await tx.insert(jobPipelineStages).values(
          templates.map((t) => ({
            jobId: job.id,
            name: t.name,
            position: t.position,
            stageType: t.stageType,
            sourceTemplateId: t.id,
          })),
        );
      }

      await tx.insert(jobHiringTeam).values({
        jobId: job.id,
        userId: input.createdBy,
      });

      return job;
    });
  },

  async update(id: number, input: UpdateJobInput) {
    const { skills, ...jobData } = input;

    return await db.transaction(async (tx) => {
      const updateData: any = { ...jobData, updatedAt: new Date() };
      if (jobData.salaryFixed !== undefined)
        updateData.salaryFixed = jobData.salaryFixed
          ? String(jobData.salaryFixed)
          : null;
      if (jobData.salaryMin !== undefined)
        updateData.salaryMin = jobData.salaryMin
          ? String(jobData.salaryMin)
          : null;
      if (jobData.salaryMax !== undefined)
        updateData.salaryMax = jobData.salaryMax
          ? String(jobData.salaryMax)
          : null;

      const [updated] = await tx
        .update(jobs)
        .set(updateData)
        .where(eq(jobs.id, id))
        .returning();

      if (!updated) return null;

      if (skills !== undefined) {
        await tx.delete(jobSkills).where(eq(jobSkills.jobId, id));
        if (skills.length > 0) {
          await tx
            .insert(jobSkills)
            .values(skills.map((skill) => ({ jobId: id, skill })));
        }
      }

      return updated;
    });
  },

  async delete(id: number) {
    return await db.transaction(async (tx) => {
      await tx.delete(offers).where(eq(offers.jobId, id));
      await tx.delete(candidates).where(eq(candidates.jobId, id));

      const [deleted] = await tx
        .delete(jobs)
        .where(eq(jobs.id, id))
        .returning();

      return deleted ?? null;
    });
  },

  async getAssessments(jobId: number) {
    return db
      .select({
        id: jobAssessmentAttachments.id,
        assessmentId: jobAssessmentAttachments.assessmentId,
        triggerStageId: jobAssessmentAttachments.triggerStageId,
        createdAt: jobAssessmentAttachments.createdAt,
      })
      .from(jobAssessmentAttachments)
      .where(eq(jobAssessmentAttachments.jobId, jobId));
  },

  async attachAssessment(input: {
    jobId: number;
    assessmentId: number;
    triggerStageId: number;
  }) {
    const [attached] = await db
      .insert(jobAssessmentAttachments)
      .values({
        jobId: input.jobId,
        assessmentId: input.assessmentId,
        triggerStageId: input.triggerStageId,
      })
      .returning();
    return attached;
  },

  async detachAssessment(attachmentId: number) {
    const [detached] = await db
      .delete(jobAssessmentAttachments)
      .where(eq(jobAssessmentAttachments.id, attachmentId))
      .returning();
    return detached;
  },
};
