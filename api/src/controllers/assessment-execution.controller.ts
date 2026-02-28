import { Request, Response } from "express";
import { z } from "zod";
import { assessmentExecutionService } from "../services/assessment-execution.service";

// ── Zod Schemas ───────────────────────────────────────────────────────────────

const inviteCandidateSchema = z.object({
  candidateId: z.number().int().positive(),
  assessmentId: z.number().int().positive(),
  expiryDays: z.number().int().positive().optional().default(7),
});

const submitAnswerSchema = z.object({
  questionId: z.number().int().positive(),
  answerText: z.string().optional().nullable(),
  optionIds: z.array(z.number().int().positive()).optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getAttemptByTokenOrFail(res: Response, token: string) {
  const attempt = await assessmentExecutionService.getAttemptByToken(token);
  if (!attempt) {
    res.status(404).json({ error: "Assessment attempt not found or invalid token" });
    return null;
  }

  const now = new Date();
  if (attempt.expiresAt < now) {
    res.status(410).json({ error: "Assessment link has expired" });
    return null;
  }

  return attempt;
}

// ── Assessment Execution Controllers ─────────────────────────────────────────

/**
 * Recruiter endpoint to invite a candidate to an assessment.
 */
export const inviteCandidateToAssessment = async (req: Request, res: Response) => {
  try {
    const parsed = inviteCandidateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { candidateId, assessmentId, expiryDays } = parsed.data;
    const result = await assessmentExecutionService.inviteCandidate(candidateId, assessmentId, expiryDays);

    res.status(201).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate assessment invite" });
  }
};

/**
 * Candidate endpoint to fetch the assessment details (Preview Page).
 */
export const getAssessmentForCandidate = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const tokenStr = (token ?? "").toString();
    const attempt = await getAttemptByTokenOrFail(res, tokenStr);
    if (!attempt) return;

    res.status(200).json({ data: attempt });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch assessment" });
  }
};

/**
 * Candidate endpoint to start the assessment (Ticking the timer).
 */
export const startAssessment = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const tokenStr = (token ?? "").toString();
    const attempt = await getAttemptByTokenOrFail(res, tokenStr);
    if (!attempt) return;

    if (attempt.status !== "pending") {
      res.status(400).json({ error: `Cannot start an assessment that is already ${attempt.status}` });
      return;
    }

    const result = await assessmentExecutionService.startAttempt(attempt.id);
    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to start assessment" });
  }
};

/**
 * Candidate endpoint to save an answer.
 */
export const submitAssessmentAnswer = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const tokenStr = (token ?? "").toString();
    const attempt = await getAttemptByTokenOrFail(res, tokenStr);
    if (!attempt) return;

    if (attempt.status !== "started") {
      res.status(403).json({ error: "Assessment must be in 'started' state to submit answers" });
      return;
    }

    const parsed = submitAnswerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await assessmentExecutionService.saveAnswer(attempt.id, parsed.data);
    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to save answer" });
  }
};

/**
 * Candidate endpoint to finish and grade the assessment.
 */
export const completeAssessment = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const tokenStr = (token ?? "").toString();
    const attempt = await getAttemptByTokenOrFail(res, tokenStr);
    if (!attempt) return;

    if (attempt.status !== "started") {
      res.status(400).json({ error: "Only started assessments can be completed" });
      return;
    }

    const result = await assessmentExecutionService.completeAttempt(attempt.id);
    if (!result) {
      throw new Error("Failed to finalize assessment");
    }

    res.status(200).json({
      message: "Assessment completed successfully",
      data: {
        passed: result.passed,
        scorePercentage: result.scorePercentage,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to finalize assessment" });
  }
};
