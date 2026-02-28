import { eq, ilike, and, desc } from "drizzle-orm";
import { db, NewJob } from "../db";
import {
  jobs,
  jobSkills,
  pipelineStageTemplates,
  jobPipelineStages,
  jobHiringTeam,
} from "../db";

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
  async getAll() {
    const allJobs = await db.select().from(jobs).orderBy(desc(jobs.createdAt));

    const jobsWithSkills = await Promise.all(
      allJobs.map(async (job) => {
        const skills = await db
          .select()
          .from(jobSkills)
          .where(eq(jobSkills.jobId, job.id));

        return {
          ...job,
          skills: skills.map((s) => s.skill),
        };
      }),
    );

    return jobsWithSkills;
  },

  async getById(id: number) {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    if (!job) return null;

    const skills = await db
      .select()
      .from(jobSkills)
      .where(eq(jobSkills.jobId, id));

    return {
      ...job,
      skills: skills.map((s) => s.skill),
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
    const [deleted] = await db.delete(jobs).where(eq(jobs.id, id)).returning();
    return deleted ?? null;
  },
};
