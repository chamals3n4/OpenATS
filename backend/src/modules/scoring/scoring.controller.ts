import { Request, Response } from "express";
import { z } from "zod";
import { scoringService } from "./scoring.service";
import { jobService } from "../job/job.service";
import logger from "../../utils/logger";
import { getErrorMessage } from "../../utils/error.utils";

export const MAX_CRITERIA = 10;

const criteriaSchema = z.object({
  criteria: z
    .array(
      z.object({
        id: z.number().int().positive().optional(),
        name: z.string().trim().min(1, "Name is required").max(100),
      }),
    )
    .max(MAX_CRITERIA, `At most ${MAX_CRITERIA} criteria`)
    .refine(
      (list) => new Set(list.map((c) => c.name.toLowerCase())).size === list.length,
      "Criteria names must be different",
    ),
});

export const getScorecard = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }
    res.status(200).json({ data: await scoringService.getCriteria(jobId) });
  } catch (error) {
    logger.error(`Failed to fetch scorecard for job id=${req.params.jobId}: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to fetch the scorecard" });
  }
};

export const putScorecard = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }
    if (!(await jobService.getById(jobId))) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    const parsed = criteriaSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const data = await scoringService.setCriteria(jobId, parsed.data.criteria);
    // A removed criterion changes the scorecards it was part of.
    void scoringService
      .recomputeJob(jobId)
      .catch((e) => logger.error(`Failed to re-score job ${jobId}: ${getErrorMessage(e)}`));
    logger.info(`Scorecard updated: jobId=${jobId}, criteria=${data.length} by user ${req.user?.id}`);
    res.status(200).json({ data });
  } catch (error) {
    logger.error(`Failed to update scorecard for job id=${req.params.jobId} - user ${req.user?.id}: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to update the scorecard" });
  }
};

const ratingSchema = z.object({ rating: z.number().int().min(1).max(5).nullable() });

export const setCandidateRating = async (req: Request, res: Response) => {
  try {
    const candidateId = parseInt((req.params.id ?? "").toString());
    if (isNaN(candidateId)) {
      res.status(400).json({ error: "Invalid candidate ID" });
      return;
    }
    const parsed = ratingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Rating must be 1 to 5, or null to clear it" });
      return;
    }
    const updated = await scoringService.setRating(candidateId, req.user.id, parsed.data.rating);
    if (!updated) {
      res.status(404).json({ error: "Candidate not found" });
      return;
    }
    res.status(200).json({ data: updated });
  } catch (error) {
    logger.error(`Failed to rate candidate id=${req.params.id} - user ${req.user?.id}: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to save the rating" });
  }
};
