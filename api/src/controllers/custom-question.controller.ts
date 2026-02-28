import { Request, Response } from "express";
import { z } from "zod";
import { customQuestionService } from "../services/custom-question.service";
import { jobService } from "../services/job.service";

// ── Zod Schemas ───────────────────────────────────────────────────────────────

const optionSchema = z.object({
  label: z.string().min(1, "Option label is required").max(500),
  isCorrect: z.boolean().default(false),
  position: z.number().int().positive(),
});

const baseCustomQuestionSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  questionType: z.enum(["short_answer", "long_answer", "checkbox", "radio"]),
  isRequired: z.boolean().default(false),
  position: z.number().int().positive(),
  options: z.array(optionSchema).optional(),
});

const createCustomQuestionSchema = baseCustomQuestionSchema.refine(
  (data) => {
    // checkbox and radio must have at least 2 options
    if (data.questionType === "checkbox" || data.questionType === "radio") {
      return data.options && data.options.length >= 2;
    }
    return true;
  },
  { message: "Checkbox and radio questions must have at least 2 options" },
);

const updateCustomQuestionSchema = baseCustomQuestionSchema.partial();

const attachAssessmentSchema = z.object({
  assessmentId: z.number().int().positive("Assessment ID is required"),
  triggerStageId: z.number().int().positive("Trigger stage ID is required"),
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

// ── Custom Question Controllers ───────────────────────────────────────────────

export const getCustomQuestions = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const job = await getJobOrFail(res, jobId);
    if (!job) return;

    const result = await customQuestionService.getByJobId(jobId);
    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch custom questions" });
  }
};

export const createCustomQuestion = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const job = await getJobOrFail(res, jobId);
    if (!job) return;

    const parsed = createCustomQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await customQuestionService.create(jobId, parsed.data);
    res.status(201).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to create custom question" });
  }
};

export const updateCustomQuestion = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    const questionId = parseInt((req.params.questionId ?? "").toString());
    if (isNaN(jobId) || isNaN(questionId)) {
      res.status(400).json({ error: "Invalid job ID or question ID" });
      return;
    }

    const job = await getJobOrFail(res, jobId);
    if (!job) return;

    const parsed = updateCustomQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await customQuestionService.update(
      jobId,
      questionId,
      parsed.data,
    );
    if (!result) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to update custom question" });
  }
};

export const deleteCustomQuestion = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    const questionId = parseInt((req.params.questionId ?? "").toString());
    if (isNaN(jobId) || isNaN(questionId)) {
      res.status(400).json({ error: "Invalid job ID or question ID" });
      return;
    }

    const job = await getJobOrFail(res, jobId);
    if (!job) return;

    const result = await customQuestionService.delete(jobId, questionId);
    if (!result) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete custom question" });
  }
};

// ── Assessment Attachment Controllers ─────────────────────────────────────────

export const getAssessmentAttachment = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const job = await getJobOrFail(res, jobId);
    if (!job) return;

    const result = await customQuestionService.getAttachment(jobId);
    // null is fine — means no assessment attached yet
    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch assessment attachment" });
  }
};

export const attachAssessment = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const job = await getJobOrFail(res, jobId);
    if (!job) return;

    const parsed = attachAssessmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await customQuestionService.attachAssessment(
      jobId,
      parsed.data,
    );
    res.status(201).json({ data: result });
  } catch (error: any) {
    if (error?.message?.includes("Stage not found")) {
      res.status(400).json({ error: error.message });
      return;
    }
    // FK violation — assessmentId doesn't exist
    if (error?.code === "23503") {
      res.status(400).json({ error: "Assessment not found" });
      return;
    }
    res.status(500).json({ error: "Failed to attach assessment" });
  }
};

export const detachAssessment = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    const triggerStageId = parseInt((req.params.stageId ?? "").toString());
    if (isNaN(jobId) || isNaN(triggerStageId)) {
      res.status(400).json({ error: "Invalid job ID or stage ID" });
      return;
    }

    const job = await getJobOrFail(res, jobId);
    if (!job) return;

    const result = await customQuestionService.detachAssessment(
      jobId,
      triggerStageId,
    );
    if (!result) {
      res.status(404).json({ error: "No assessment attached to that stage" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to detach assessment" });
  }
};
