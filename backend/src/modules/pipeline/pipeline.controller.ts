import { Request, Response } from "express";
import { z } from "zod";
import { pipelineService } from "./pipeline.service";
import { jobService } from "../job/job.service";
import { cleanObject as clean } from "../../utils/object.utils";
import logger from "../../utils/logger";
import { getErrorCode, getErrorMessage} from "../../utils/error.utils";

const stageTypeEnum = z.enum(["screening", "interview", "offer"]);

const createStageSchema = z.object({
  name: z.string().min(1, "Stage name is required").max(100),
  position: z
    .number()
    .int()
    .positive("Position must be a positive number")
    .optional(),
  stageType: stageTypeEnum.optional().default("screening"),
});

const updateStageSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  position: z.number().int().positive().optional(),
  stageType: stageTypeEnum.optional(),
});

const reorderStagesSchema = z.object({
  stages: z.array(
    z.object({
      id: z.number().int().positive(),
      position: z.number().int().positive(),
    }),
  ),
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
    logger.error(
      `Failed to fetch pipeline for job id=${req.params.jobId}: ${getErrorMessage(error)}`,
    );
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
    logger.info(
      `Pipeline stage created: id=${result?.id}, name="${result?.name}", jobId=${jobId} by user ${req.user?.id}`,
    );
    res.status(201).json({ data: result });
  } catch (error) {
    logger.error(
      `Failed to create pipeline stage for job id=${req.params.jobId} - user ${req.user?.id}: ${getErrorMessage(error)}`,
    );
    if (getErrorCode(error) === "23505") {
      res
        .status(409)
        .json({ error: "A stage already exists at that position" });
      return;
    }
    res.status(500).json({
      error: "Failed to create stage",
      message: getErrorMessage(error) || "Unknown server error",
    });
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

    const cleanedData = clean(parsed.data);
    const result = await pipelineService.update(jobId, stageId, cleanedData);
    if (!result) {
      res.status(404).json({ error: "Stage not found" });
      return;
    }

    logger.info(
      `Pipeline stage updated: id=${stageId}, jobId=${jobId} by user ${req.user?.id}`,
    );
    res.status(200).json({ data: result });
  } catch (error) {
    if (getErrorCode(error) === "23505") {
      res
        .status(409)
        .json({ error: "A stage already exists at that position" });
      return;
    }
    logger.error(
      `Failed to update pipeline stage id=${req.params.stageId} for job id=${req.params.jobId} - user ${req.user?.id}: ${getErrorMessage(error)}`,
    );
    res.status(500).json({ error: "Failed to update stage" });
  }
};

export const reorderStages = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const job = await getJobOrFail(res, jobId);
    if (!job) return;

    const parsed = reorderStagesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await pipelineService.reorder(jobId, parsed.data.stages);
    logger.info(
      `Pipeline stages reordered: jobId=${jobId}, stageCount=${parsed.data.stages.length} by user ${req.user?.id}`,
    );
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(
      `Failed to reorder pipeline stages for job id=${req.params.jobId} - user ${req.user?.id}: ${getErrorMessage(error)}`,
    );
    res.status(500).json({
      error: "Failed to reorder stages",
      message: getErrorMessage(error) || "Unknown server error",
    });
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

    logger.warn(
      `Pipeline stage deletion requested: stageId=${stageId}, jobId=${jobId} by user ${req.user?.id}`,
    );
    const result = await pipelineService.delete(jobId, stageId);
    if (!result) {
      res.status(404).json({ error: "Stage not found" });
      return;
    }

    logger.info(
      `Pipeline stage deleted: id=${stageId}, name="${stage.name}", jobId=${jobId} by user ${req.user?.id}`,
    );
    res.status(200).json({ data: result });
  } catch (error) {
    if (getErrorCode(error) === "23503") {
      res.status(409).json({
        error:
          "Cannot delete a stage that has candidate history. Move candidates to another stage first.",
      });
      return;
    }
    logger.error(
      `Failed to delete pipeline stage id=${req.params.stageId} for job id=${req.params.jobId} - user ${req.user?.id}: ${getErrorMessage(error)}`,
    );
    res.status(500).json({ error: "Failed to delete stage" });
  }
};
