import { Request, Response } from "express";
import { z } from "zod";
import { assessmentService } from "../services/assessment.service";

// ── Zod Schemas ───────────────────────────────────────────────────────────────

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
  // options only make sense for multiple_choice
  options: z.array(optionSchema).optional(),
});

const questionSchema = baseQuestionSchema.refine(
  (data) => {
    // multiple_choice must have at least 2 options
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
  passScore: z.number().min(0).max(100, "Pass score must be between 0 and 100"),
  // TODO: replace with req.user.id once auth is in place
  createdBy: z.number().int().positive().default(1),
  questions: z.array(questionSchema).optional(),
});

const updateAssessmentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  timeLimit: z.number().int().positive().optional(),
  passScore: z.number().min(0).max(100).optional(),
});

const createQuestionSchema = questionSchema;
const updateQuestionSchema = baseQuestionSchema.partial();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getAssessmentOrFail(res: Response, id: number) {
  const assessment = await assessmentService.getById(id);
  if (!assessment) {
    res.status(404).json({ error: "Assessment not found" });
    return null;
  }
  return assessment;
}

// ── Assessment Controllers ────────────────────────────────────────────────────

export const getAllAssessments = async (req: Request, res: Response) => {
  try {
    const result = await assessmentService.getAll();
    res.status(200).json({ data: result });
  } catch (error) {
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
    res.status(500).json({ error: "Failed to fetch assessment" });
  }
};

export const createAssessment = async (req: Request, res: Response) => {
  try {
    const parsed = createAssessmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await assessmentService.create(parsed.data);
    res.status(201).json({ data: result });
  } catch (error: any) {
    if (error?.code === "23503") {
      res.status(400).json({ error: "User not found" });
      return;
    }
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

    res.status(200).json({ data: result });
  } catch (error) {
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

    const result = await assessmentService.delete(id);
    if (!result) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete assessment" });
  }
};

// ── Question Controllers ──────────────────────────────────────────────────────

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
    res.status(201).json({ data: result });
  } catch (error) {
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

    res.status(200).json({ data: result });
  } catch (error) {
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

    const result = await assessmentService.deleteQuestion(questionId);
    if (!result) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete question" });
  }
};
