import { Request, Response } from "express";
import { z } from "zod";
import { customQuestionService } from "./custom-question.service";
import { jobService } from "../job/job.service";
import logger from "../../utils/logger";

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

async function getJobOrFail(res: Response, jobId: number) {
  const job = await jobService.getById(jobId);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return null;
  }
  return job;
}

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
    logger.error(`Failed to fetch custom questions for job id=${req.params.jobId}: ${(error as any)?.message}`);
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
      logger.warn(`Custom question creation validation failed - jobId=${jobId}, user ${req.user?.id}: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await customQuestionService.create(jobId, parsed.data);
    logger.info(`Custom question created: id=${result.id}, type="${result.questionType}", jobId=${jobId} by user ${req.user?.id}`);
    res.status(201).json({ data: result });
  } catch (error) {
    logger.error(`Failed to create custom question for job id=${req.params.jobId} - user ${req.user?.id}: ${(error as any)?.message}`);
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

    logger.info(`Custom question updated: id=${questionId}, jobId=${jobId} by user ${req.user?.id}`);
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to update custom question id=${req.params.questionId} for job id=${req.params.jobId} - user ${req.user?.id}: ${(error as any)?.message}`);
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

    logger.warn(`Custom question deletion requested: id=${questionId}, jobId=${jobId} by user ${req.user?.id}`);
    const result = await customQuestionService.delete(jobId, questionId);
    if (!result) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    logger.info(`Custom question deleted: id=${questionId}, jobId=${jobId} by user ${req.user?.id}`);
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to delete custom question id=${req.params.questionId} for job id=${req.params.jobId} - user ${req.user?.id}: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to delete custom question" });
  }
};

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
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to fetch assessment attachment for job id=${req.params.jobId}: ${(error as any)?.message}`);
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
    logger.info(`Assessment attached to job application form: jobId=${jobId}, assessmentId=${parsed.data.assessmentId}, triggerStageId=${parsed.data.triggerStageId} by user ${req.user?.id}`);
    res.status(201).json({ data: result });
  } catch (error: any) {
    if (error?.message?.includes("Stage not found")) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error?.code === "23503") {
      res.status(400).json({ error: "Assessment not found" });
      return;
    }
    logger.error(`Failed to attach assessment to job id=${req.params.jobId} application form - user ${req.user?.id}: ${error?.message}`);
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

    logger.info(`Assessment detached from job application form: jobId=${jobId}, triggerStageId=${triggerStageId} by user ${req.user?.id}`);
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to detach assessment from job id=${req.params.jobId} application form - user ${req.user?.id}: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to detach assessment" });
  }
};
