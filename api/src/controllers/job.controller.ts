import { Request, Response } from "express";
import { z } from "zod";
import { jobService } from "../services/job.service";
import { cleanObject as clean } from "../utils/object.utils";

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
    createdBy: z.number().int().positive().default(1),
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

export const getAllJobs = async (req: Request, res: Response) => {
  try {
    const result = await jobService.getAll();
    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch jobs" });
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
    res.status(500).json({ error: "Failed to fetch job" });
  }
};

export const createJob = async (req: Request, res: Response) => {
  try {
    const parsed = createJobSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const data = {
      ...parsed.data,
      location: parsed.data.location ?? null,
      description: parsed.data.description ?? null,
      skills: parsed.data.skills ?? [],
      salaryType: parsed.data.salaryType ?? null,
      currency: parsed.data.currency ?? null,
      payFrequency: parsed.data.payFrequency ?? null,
      salaryFixed: parsed.data.salaryFixed ?? null,
      salaryMin: parsed.data.salaryMin ?? null,
      salaryMax: parsed.data.salaryMax ?? null,
    };
    const result = await jobService.create(data);
    res.status(201).json({ data: result });
  } catch (error: any) {
    if (error?.code === "23503") {
      res.status(400).json({ error: "Department not found" });
      return;
    }
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

    res.status(200).json({ data: result });
  } catch (error: any) {
    if (error?.code === "23503") {
      res.status(400).json({ error: "Department not found" });
      return;
    }
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

    const result = await jobService.delete(id);
    if (!result) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error: any) {
    if (error?.code === "23503") {
      res.status(409).json({
        error:
          "Cannot delete a job that has candidates. Close or archive it instead.",
      });
      return;
    }
    res.status(500).json({ error: "Failed to delete job" });
  }
};
