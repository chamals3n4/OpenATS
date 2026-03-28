import { Request, Response } from "express";
import { z } from "zod";
import {
  candidateService,
  DuplicateApplicationError,
} from "../services/candidate.service";
import { jobService } from "../services/job.service";
import { cvAnalysisService } from "../services/cv-analysis.service";
import { r2Service } from "../services/r2.service";

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
  resumeUrl: z
    .string()
    .url("Invalid resume URL")
    .max(1000)
    .optional()
    .nullable(),
  customAnswers: z.array(customAnswerSchema).optional(),
});

const moveStageSchema = z.object({
  newStageId: z.number().int().positive("Target stage ID is required"),

  movedBy: z.number().int().positive().default(1),
});

const updateCandidateBasicSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100).optional(),
  lastName: z.string().min(1, "Last name is required").max(100).optional(),
  email: z.string().email("Invalid email address").max(255).optional(),
  phone: z.union([z.string().max(50), z.null()]).optional(),
});

async function getJobOrFail(res: Response, jobId: number) {
  const job = await jobService.getById(jobId);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return null;
  }
  return job;
}

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

    if (result.resumeUrl) {
      cvAnalysisService
        .analyze(result.id, result.jobId, result.resumeUrl)
        .catch((err) => console.error("CV analysis error:", err));
    }

    res.status(201).json({ data: result });
  } catch (error: unknown) {
    if (error instanceof DuplicateApplicationError) {
      res.status(409).json({
        error: "You have already applied to this job with this email.",
        code: "DUPLICATE_APPLICATION",
      });
      return;
    }
    console.error("applyForJob:", error);
    res.status(500).json({ error: "Failed to submit application" });
  }
};

export const getCandidates = async (req: Request, res: Response) => {
  try {
    const jobIdParam = req.params.jobId;
    const jobId = jobIdParam ? parseInt(String(jobIdParam)) : undefined;

    if (jobIdParam && isNaN(jobId!)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const filters = {
      stageId: req.query.stageId
        ? parseInt(req.query.stageId.toString())
        : undefined,
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
      parsed.data.newStageId,
      parsed.data.movedBy,
    );
    res.status(200).json({ data: result });
  } catch (error: any) {
    res
      .status(400)
      .json({ error: error.message || "Failed to move candidate" });
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

export const updateCandidateBasicDetails = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid candidate ID" });
      return;
    }

    const existing = await candidateService.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Candidate not found" });
      return;
    }

    const normalizedBody = {
      firstName: req.body?.firstName,
      lastName: req.body?.lastName,
      email: req.body?.email,
      phone:
        req.body?.phone === "" || req.body?.phone === undefined
          ? req.body?.phone === ""
            ? null
            : undefined
          : req.body?.phone,
    };

    const parsed = updateCandidateBasicSchema.safeParse(normalizedBody);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const hasAnyBodyField = Object.values(parsed.data).some(
      (value) => value !== undefined,
    );
    if (!hasAnyBodyField && !req.file) {
      res.status(400).json({
        error: "Provide at least one field or upload a resume PDF",
      });
      return;
    }

    let newResumeUrl: string | undefined;
    if (req.file) {
      if (req.file.mimetype !== "application/pdf") {
        res.status(400).json({ error: "Only PDF files are allowed" });
        return;
      }

      newResumeUrl = await r2Service.uploadFile(req.file, "resumes");
    }

    const updated = await candidateService.updateBasicDetails(id, {
      ...parsed.data,
      ...(newResumeUrl ? { resumeUrl: newResumeUrl } : {}),
    });

    if (!updated) {
      if (newResumeUrl) {
        await r2Service.deleteByUrl(newResumeUrl).catch(() => undefined);
      }
      res.status(404).json({ error: "Candidate not found" });
      return;
    }

    if (
      newResumeUrl &&
      existing.resumeUrl &&
      existing.resumeUrl !== newResumeUrl
    ) {
      await r2Service.deleteByUrl(existing.resumeUrl).catch((err) => {
        console.error("Failed to delete old resume from storage:", err);
      });
    }

    if (newResumeUrl) {
      cvAnalysisService
        .analyze(updated.id, updated.jobId, newResumeUrl)
        .catch((err) => console.error("CV analysis error:", err));
    }

    res.status(200).json({ data: updated });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: error.message || "Failed to update candidate details" });
  }
};
