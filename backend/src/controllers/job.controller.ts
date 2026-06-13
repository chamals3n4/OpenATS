import { Request, Response } from "express";
import { z } from "zod";
import { jobService } from "../services/job.service";
import { cleanObject as clean } from "../utils/object.utils";
import logger from "../utils/logger";

const employmentTypeEnum = z.enum([
  "full_time",
  "part_time",
  "contract",
  "internship",
  "freelance",
]);

const payFrequencyEnum = z.enum([
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

const salarySchema = z
  .discriminatedUnion("salaryType", [
    z.object({
      salaryType: z.literal("fixed"),
      currency: z.string().length(3, "Currency must be a 3-letter ISO code"),
      payFrequency: payFrequencyEnum,
      salaryFixed: z.number().positive("Salary must be a positive number"),
      salaryMin: z.undefined(),
      salaryMax: z.undefined(),
    }),
    z.object({
      salaryType: z.literal("range"),
      currency: z.string().length(3, "Currency must be a 3-letter ISO code"),
      payFrequency: payFrequencyEnum,
      salaryFixed: z.undefined(),
      salaryMin: z.number().positive("Min salary must be a positive number"),
      salaryMax: z.number().positive("Max salary must be a positive number"),
    }),
  ])
  .optional();

const createJobSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(255),
    departmentId: z.number().int().positive("Department is required"),
    employmentType: employmentTypeEnum,
    location: z.string().max(255).optional().nullable(),
    description: z.string().optional().nullable(),
    skills: z.array(z.string().min(1).max(100)).optional(),
    salaryType: z.enum(["fixed", "range"]).optional().nullable(),
    currency: z.string().length(3).optional().nullable(),
    payFrequency: payFrequencyEnum.optional().nullable(),
    salaryFixed: z.number().positive().optional().nullable(),
    salaryMin: z.number().positive().optional().nullable(),
    salaryMax: z.number().positive().optional().nullable(),
    status: z
      .enum(["draft", "inactive", "published", "closed", "archived"])
      .optional(),
  })
  .refine(
    (data) => {
      if (data.salaryType && (!data.currency || !data.payFrequency))
        return false;
      if (data.salaryType === "range" && (!data.salaryMin || !data.salaryMax))
        return false;
      if (data.salaryType === "fixed" && !data.salaryFixed) return false;
      if (data.salaryMin && data.salaryMax && data.salaryMax < data.salaryMin)
        return false;
      return true;
    },
    {
      message: "Invalid salary configuration",
    },
  );

const updateJobSchema = z.object({
  title: z.union([z.string().min(1).max(255), z.undefined()]).optional(),
  departmentId: z
    .union([z.number().int().positive(), z.undefined()])
    .optional(),
  employmentType: employmentTypeEnum.optional(),
  location: z.union([z.string().max(255), z.null(), z.undefined()]).optional(),
  description: z.union([z.string(), z.null(), z.undefined()]).optional(),
  skills: z.array(z.string().min(1).max(100)).optional(),
  salaryType: z.enum(["fixed", "range"]).optional().nullable(),
  currency: z.string().length(3).optional().nullable(),
  payFrequency: payFrequencyEnum.optional().nullable(),
  salaryFixed: z.number().positive().optional().nullable(),
  salaryMin: z.number().positive().optional().nullable(),
  salaryMax: z.number().positive().optional().nullable(),
  status: z
    .enum(["draft", "inactive", "published", "closed", "archived"])
    .optional(),
});

export const listPublishedCareersJobs = async (
  _req: Request,
  res: Response,
) => {
  try {
    const result = await jobService.listPublishedForCareers();
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to fetch published careers jobs: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
};

export const getAllJobs = async (req: Request, res: Response) => {
  try {
    const { page, limit, search, status, departmentId } = req.query;

    if (page !== undefined) {
      const result = await jobService.getPaginated({
        page: parseInt(page as string) || 1,
        limit: parseInt((limit as string) ?? "15") || 15,
        search: (search as string) || undefined,
        status: (status as string) || undefined,
        departmentId: departmentId ? parseInt(departmentId as string) : undefined,
      });
      res.status(200).json({
        data: result.rows,
        pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
      });
      return;
    }

    const result = await jobService.getAll();
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to fetch all jobs: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
};

const bulkDeleteJobsSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
});

export const bulkDeleteJobs = async (req: Request, res: Response) => {
  try {
    const parsed = bulkDeleteJobsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
      return;
    }
    logger.warn(`Bulk job deletion requested: ids=${parsed.data.ids.join(",")} by user ${req.user?.id}`);
    const deleted = await jobService.deleteMany(parsed.data.ids);
    res.status(200).json({ data: deleted, count: deleted.length });
  } catch (error) {
    logger.error(`Failed to bulk delete jobs - user ${req.user?.id}: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to delete jobs" });
  }
};

export const getJobById = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const result = await jobService.getById(id);
    if (!result) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to fetch job id=${req.params.id}: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to fetch job" });
  }
};

export const getPublicJobById = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const result = await jobService.getById(id);
    if (!result) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const { hiringTeam, pipelineStages, createdBy, ...data } = result;
    res.status(200).json({ data });
  } catch (error) {
    logger.error(`Failed to fetch public job id=${req.params.id}: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to fetch job" });
  }
};

export const getJobBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    if (typeof slug !== "string" || !slug) {
      res.status(400).json({ error: "Invalid job slug" });
      return;
    }
    const result = await jobService.getBySlug(slug);
    if (!result) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to fetch job by slug="${req.params.slug}": ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to fetch job" });
  }
};

export const createJob = async (req: Request, res: Response) => {
  try {
    const parsed = createJobSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn(`Job creation validation failed - user ${req.user?.id}: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const data = {
      ...parsed.data,
      createdBy: req.user.id,
      location: parsed.data.location ?? null,
      description: parsed.data.description ?? null,
      skills: parsed.data.skills ?? [],
      salaryType: parsed.data.salaryType ?? null,
      currency: parsed.data.currency ?? null,
      payFrequency: parsed.data.payFrequency ?? null,
      salaryFixed: parsed.data.salaryFixed ?? null,
      salaryMin: parsed.data.salaryMin ?? null,
      salaryMax: parsed.data.salaryMax ?? null,
      status: parsed.data.status ?? "draft",
    };
    const result = await jobService.create(data);
    logger.info(`Job created: id=${result.id}, title="${result.title}", status=${result.status}, createdBy=${req.user.id}`);
    res.status(201).json({ data: result });
  } catch (error: any) {
    if (error?.code === "23503") {
      res.status(400).json({ error: "Department not found" });
      return;
    }
    logger.error(`Failed to create job - user ${req.user?.id}: ${error?.message}`);
    res.status(500).json({ error: "Failed to create job" });
  }
};

export const updateJob = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const parsed = updateJobSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn(`Job update validation failed - id=${id}, user ${req.user?.id}: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const filteredData = clean(parsed.data);
    const result = await jobService.update(id, filteredData);
    if (!result) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    logger.info(`Job updated: id=${id}, status=${result.status}, updatedBy=${req.user?.id}`);
    res.status(200).json({ data: result });
  } catch (error: any) {
    if (error?.code === "23503") {
      res.status(400).json({ error: "Department not found" });
      return;
    }
    logger.error(`Failed to update job id=${req.params.id} - user ${req.user?.id}: ${error?.message}`);
    res.status(500).json({ error: "Failed to update job" });
  }
};

export const deleteJob = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    logger.warn(`Job deletion requested: id=${id} by user ${req.user?.id}`);
    const result = await jobService.delete(id);
    if (!result) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    logger.info(`Job deleted: id=${id}, title="${result.title}" by user ${req.user?.id}`);
    res.status(200).json({ data: result });
  } catch (error: any) {
    if (error?.code === "23503") {
      res.status(409).json({
        error:
          "Cannot delete a job that has candidates. Close or archive it instead.",
      });
      return;
    }
    logger.error(`Failed to delete job id=${req.params.id} - user ${req.user?.id}: ${error?.message}`);
    res.status(500).json({ error: "Failed to delete job" });
  }
};

export const getAssessments = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.id ?? "").toString());
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }
    const result = await jobService.getAssessments(jobId);
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to fetch assessments for job id=${req.params.id}: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to fetch job assessments" });
  }
};

export const attachAssessment = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.id ?? "").toString());
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const { assessmentId, triggerStageId } = req.body;
    if (!assessmentId || !triggerStageId) {
      res
        .status(400)
        .json({ error: "assessmentId and triggerStageId are required" });
      return;
    }

    const result = await jobService.attachAssessment({
      jobId,
      assessmentId: parseInt(assessmentId),
      triggerStageId: parseInt(triggerStageId),
    });

    logger.info(`Assessment attached to job: jobId=${jobId}, assessmentId=${assessmentId}, triggerStageId=${triggerStageId} by user ${req.user?.id}`);
    res.status(201).json({ data: result });
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({
        error: "An assessment is already attached to this stage for this job",
      });
      return;
    }
    logger.error(`Failed to attach assessment to job id=${req.params.id} - user ${req.user?.id}: ${error?.message}`);
    res.status(500).json({ error: "Failed to attach assessment" });
  }
};

export const detachAssessment = async (req: Request, res: Response) => {
  try {
    const attachmentId = parseInt((req.params.attachmentId ?? "").toString());
    if (isNaN(attachmentId)) {
      res.status(400).json({ error: "Invalid attachment ID" });
      return;
    }
    const result = await jobService.detachAssessment(attachmentId);
    if (!result) {
      res.status(404).json({ error: "Attachment not found" });
      return;
    }
    logger.info(`Assessment detached: attachmentId=${attachmentId} by user ${req.user?.id}`);
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to detach assessment attachmentId=${req.params.attachmentId} - user ${req.user?.id}: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to detach assessment" });
  }
};
