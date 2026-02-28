import { Request, Response } from "express";
import { z } from "zod";
import { pipelineService } from "../services/pipeline.service";
import { jobService } from "../services/job.service";

const createStageSchema = z.object({
  name: z.string().min(1, "Stage name is required").max(100),
  position: z.number().int().positive("Position must be a positive number"),
});

const updateStageSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  position: z.number().int().positive().optional(),
  stageType: z.enum(["none", "offer", "rejection"]).optional(),
  offerTemplateId: z.number().int().positive().optional().nullable(),
  offerMode: z.enum(["auto_draft", "auto_send"]).optional().nullable(),
  offerExpiryDays: z.number().int().positive().optional().nullable(),
  rejectionTemplateId: z.number().int().positive().optional().nullable(),
});

async function getJobOrFail(res: Response, jobId: number) {
  const job = await jobService.getById(jobId);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return null;
  }
  return job;
}

export const getPipeline = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const job = await getJobOrFail(res, jobId);
    if (!job) return;

    const stages = await pipelineService.getByJobId(jobId);
    res.status(200).json({ data: stages });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pipeline stages" });
  }
};

export const createStage = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const job = await getJobOrFail(res, jobId);
    if (!job) return;

    const parsed = createStageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await pipelineService.create(jobId, parsed.data);
    res.status(201).json({ data: result });
  } catch (error: any) {
    if (error?.code === "23505") {
      res
        .status(409)
        .json({ error: "A stage already exists at that position" });
      return;
    }
    res.status(500).json({ error: "Failed to create stage" });
  }
};

export const updateStage = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    const stageId = parseInt((req.params.stageId ?? "").toString());
    if (isNaN(jobId) || isNaN(stageId)) {
      res.status(400).json({ error: "Invalid job ID or stage ID" });
      return;
    }

    const job = await getJobOrFail(res, jobId);
    if (!job) return;

    const parsed = updateStageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const cleanedData = Object.fromEntries(
      Object.entries(parsed.data).filter(([_, v]) => v !== undefined),
    );
    const result = await pipelineService.update(jobId, stageId, cleanedData);
    if (!result) {
      res.status(404).json({ error: "Stage not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error: any) {
    if (error?.code === "23505") {
      res
        .status(409)
        .json({ error: "A stage already exists at that position" });
      return;
    }
    res.status(500).json({ error: "Failed to update stage" });
  }
};

export const deleteStage = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    const stageId = parseInt((req.params.stageId ?? "").toString());
    if (isNaN(jobId) || isNaN(stageId)) {
      res.status(400).json({ error: "Invalid job ID or stage ID" });
      return;
    }

    const job = await getJobOrFail(res, jobId);
    if (!job) return;

    const stage = await pipelineService.getById(stageId);
    if (!stage || stage.jobId !== jobId) {
      res.status(404).json({ error: "Stage not found" });
      return;
    }

    const result = await pipelineService.delete(jobId, stageId);
    if (!result) {
      res.status(404).json({ error: "Stage not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error: any) {
    if (error?.code === "23503") {
      res.status(409).json({
        error:
          "Cannot delete a stage that has candidate history. Move candidates to another stage first.",
      });
      return;
    }
    res.status(500).json({ error: "Failed to delete stage" });
  }
};
