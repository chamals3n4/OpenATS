import { Request, Response } from "express";
import { z } from "zod";
import { candidateService } from "../services/candidate.service";
import { jobService } from "../services/job.service";

// ── Zod Schemas ───────────────────────────────────────────────────────────────

const customAnswerSchema = z.object({
  questionId: z.number().int().positive(),
  answerText: z.string().optional().nullable(),
  optionIds: z.array(z.number().int().positive()).optional(),
});

const candidateApplySchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address").max(255),
  phone: z.string().max(50).optional().nullable(),
  resumeUrl: z.string().url("Invalid resume URL").max(1000).optional().nullable(),
  customAnswers: z.array(customAnswerSchema).optional(),
});

const moveStageSchema = z.object({
  stageId: z.number().int().positive("Target stage ID is required"),
  // TODO: remove default when auth is ready
  movedBy: z.number().int().positive().default(1),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getJobOrFail(res: Response, jobId: number) {
  const job = await jobService.getById(jobId);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return null;
  }
  return job;
}

// ── Candidate Controllers ────────────────────────────────────────────────────

export const applyForJob = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const job = await getJobOrFail(res, jobId);
    if (!job) return;

    const parsed = candidateApplySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await candidateService.apply(jobId, parsed.data);
    res.status(201).json({ data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to submit application" });
  }
};

export const getCandidates = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const filters = {
      stageId: req.query.stageId ? parseInt(req.query.stageId.toString()) : undefined,
      search: req.query.search?.toString(),
    };

    const result = await candidateService.getAll(jobId, filters);
    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
};

export const getCandidateById = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid candidate ID" });
      return;
    }

    const result = await candidateService.getById(id);
    if (!result) {
      res.status(404).json({ error: "Candidate not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch candidate" });
  }
};

export const moveCandidateStage = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid candidate ID" });
      return;
    }

    const parsed = moveStageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await candidateService.moveStage(
      id,
      parsed.data.stageId,
      parsed.data.movedBy,
    );
    res.status(200).json({ data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to move candidate" });
  }
};

export const deleteCandidate = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid candidate ID" });
      return;
    }

    const result = await candidateService.delete(id);
    if (!result) {
      res.status(404).json({ error: "Candidate not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete candidate" });
  }
};
