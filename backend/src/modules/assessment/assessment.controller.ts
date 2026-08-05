import { Request, Response } from "express";
import { z } from "zod";
import { assessmentService } from "./assessment.service";
import logger from "../../utils/logger";

const optionSchema = z.object({
  label: z.string().min(1, "Option label is required").max(500),
  isCorrect: z.boolean().default(false),
  position: z.number().int().positive(),
});

const baseQuestionSchema = z.object({
  title: z.string().min(1, "Question title is required").max(500),
  description: z.string().optional().nullable(),
  questionType: z.enum(["short_answer", "multiple_choice"]),
  points: z.number().positive().default(1),
  position: z.number().int().positive(),
  options: z.array(optionSchema).optional(),
});

const questionSchema = baseQuestionSchema.refine(
  (data) => {
    if (data.questionType === "multiple_choice") {
      return data.options && data.options.length >= 2;
    }
    return true;
  },
  { message: "Multiple choice questions must have at least 2 options" },
);

const createAssessmentSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional().nullable(),
  timeLimit: z
    .number()
    .int()
    .positive("Time limit must be a positive number of minutes"),
  createdBy: z.number().int().positive().optional(),
  questions: z.array(questionSchema).optional(),
});

const updateAssessmentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  timeLimit: z.number().int().positive().optional(),
});

const createQuestionSchema = questionSchema;
const updateQuestionSchema = baseQuestionSchema.partial();

async function getAssessmentOrFail(res: Response, id: number) {
  const assessment = await assessmentService.getById(id);
  if (!assessment) {
    res.status(404).json({ error: "Assessment not found" });
    return null;
  }
  return assessment;
}

export const getAllAssessments = async (req: Request, res: Response) => {
  try {
    const result = await assessmentService.getAll();
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to fetch all assessments: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to fetch assessments" });
  }
};

export const getAssessmentById = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid assessment ID" });
      return;
    }

    const result = await assessmentService.getById(id);
    if (!result) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to fetch assessment id=${req.params.id}: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to fetch assessment" });
  }
};

export const createAssessment = async (req: Request, res: Response) => {
  try {
    const authenticatedUserId = req.user?.id;
    const parsed = createAssessmentSchema.safeParse({
      ...req.body,
      createdBy: req.body?.createdBy ?? authenticatedUserId,
    });
    if (!parsed.success) {
      logger.warn(`Assessment creation validation failed - user ${authenticatedUserId}: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const createdBy = parsed.data.createdBy ?? authenticatedUserId;
    if (!createdBy) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const result = await assessmentService.create({
      ...parsed.data,
      createdBy,
    });
    logger.info(`Assessment created: id=${result.id}, title="${result.title}", timeLimit=${result.timeLimit}m, createdBy=${createdBy}`);
    res.status(201).json({ data: result });
  } catch (error: any) {
    if (error?.code === "23503") {
      res.status(400).json({ error: "User not found" });
      return;
    }
    logger.error(`Failed to create assessment - user ${req.user?.id}: ${error?.message}`);
    res.status(500).json({ error: "Failed to create assessment" });
  }
};

export const updateAssessment = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid assessment ID" });
      return;
    }

    const parsed = updateAssessmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await assessmentService.update(id, parsed.data);
    if (!result) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }

    logger.info(`Assessment updated: id=${id} by user ${req.user?.id}`);
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to update assessment id=${req.params.id} - user ${req.user?.id}: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to update assessment" });
  }
};

export const deleteAssessment = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid assessment ID" });
      return;
    }

    logger.warn(`Assessment deletion requested: id=${id} by user ${req.user?.id}`);
    const result = await assessmentService.delete(id);
    if (!result) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }

    logger.info(`Assessment deleted: id=${id}, title="${result.title}" by user ${req.user?.id}`);
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to delete assessment id=${req.params.id} - user ${req.user?.id}: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to delete assessment" });
  }
};

export const createQuestion = async (req: Request, res: Response) => {
  try {
    const assessmentId = parseInt((req.params.id ?? "").toString());

    if (isNaN(assessmentId)) {
      res.status(400).json({ error: "Invalid assessment ID" });
      return;
    }

    const assessment = await getAssessmentOrFail(res, assessmentId);
    if (!assessment) return;

    const parsed = createQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await assessmentService.createQuestion(
      assessmentId,
      parsed.data,
    );
    logger.info(`Assessment question created: id=${result.id}, type="${result.questionType}", assessmentId=${assessmentId} by user ${req.user?.id}`);
    res.status(201).json({ data: result });
  } catch (error) {
    logger.error(`Failed to create question for assessment id=${req.params.id} - user ${req.user?.id}: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to create question" });
  }
};

export const updateQuestion = async (req: Request, res: Response) => {
  try {
    const assessmentId = parseInt((req.params.id ?? "").toString());
    const questionId = parseInt((req.params.questionId ?? "").toString());

    if (isNaN(assessmentId) || isNaN(questionId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const assessment = await getAssessmentOrFail(res, assessmentId);
    if (!assessment) return;

    const parsed = updateQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await assessmentService.updateQuestion(
      questionId,
      parsed.data,
    );
    if (!result) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    logger.info(`Assessment question updated: id=${questionId}, assessmentId=${assessmentId} by user ${req.user?.id}`);
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to update question id=${req.params.questionId} for assessment id=${req.params.id} - user ${req.user?.id}: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to update question" });
  }
};

export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    const assessmentId = parseInt((req.params.id ?? "").toString());
    const questionId = parseInt((req.params.questionId ?? "").toString());
    if (isNaN(assessmentId) || isNaN(questionId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const assessment = await getAssessmentOrFail(res, assessmentId);
    if (!assessment) return;

    logger.warn(`Assessment question deletion requested: id=${questionId}, assessmentId=${assessmentId} by user ${req.user?.id}`);
    const result = await assessmentService.deleteQuestion(questionId);
    if (!result) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    logger.info(`Assessment question deleted: id=${questionId}, assessmentId=${assessmentId} by user ${req.user?.id}`);
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to delete question id=${req.params.questionId} for assessment id=${req.params.id} - user ${req.user?.id}: ${(error as any)?.message}`);
    res.status(500).json({ error: "Failed to delete question" });
  }
};
