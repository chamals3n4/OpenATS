import { Request, Response } from "express";
import { z } from "zod";
import { assessmentExecutionService } from "./assessment-execution.service";
import { mailService } from "../../shared/services/mail.service";
import { socketService } from "../../shared/services/socket.service";
import logger from "../../utils/logger";
import { getErrorMessage} from "../../utils/error.utils";

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

const completeAssessmentSchema = z.object({
  autoSubmitReason: z.string().trim().min(1).max(500).optional(),
});

async function getAttemptByTokenOrFail(res: Response, token: string) {
  const attempt = await assessmentExecutionService.getAttemptByToken(token);
  if (!attempt) {
    res
      .status(404)
      .json({ error: "Assessment attempt not found or invalid token" });
    return null;
  }

  const now = new Date();
  if (attempt.expiresAt < now) {
    res.status(410).json({ error: "Assessment link has expired" });
    return null;
  }

  return attempt;
}

export const inviteCandidateToAssessment = async (
  req: Request,
  res: Response,
) => {
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
    const { attempt, didSendInvite } =
      await assessmentExecutionService.inviteCandidate(
        candidateId,
        assessmentId,
        expiryDays,
      );

    if (!attempt) {
      res.status(500).json({ error: "Failed to create assessment attempt" });
      return;
    }

    logger.info(`Assessment invite created: attemptId=${attempt.id}, candidateId=${candidateId}, assessmentId=${assessmentId}, didSendInvite=${didSendInvite}`);
    res.status(201).json({ data: attempt, didSendInvite });
  } catch (error) {
    logger.error(`Failed to generate assessment invite - candidateId=${req.body?.candidateId}, assessmentId=${req.body?.assessmentId}: ${getErrorMessage(error)}`);
    res.status(500).json({
      error: "Failed to generate assessment invite",
    });
  }
};

export const getCandidateAttempts = async (req: Request, res: Response) => {
  try {
    const candidateId = parseInt((req.params.candidateId ?? "").toString());
    if (isNaN(candidateId)) {
      res.status(400).json({ error: "Invalid candidate ID" });
      return;
    }

    const result =
      await assessmentExecutionService.getAttemptsByCandidate(candidateId);
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to fetch candidate assessment attempts: ${getErrorMessage(error)}`);
    res
      .status(500)
      .json({ error: "Failed to fetch candidate assessment attempts" });
  }
};

export const getAssessmentForCandidate = async (
  req: Request,
  res: Response,
) => {
  try {
    const { token } = req.params;
    const tokenStr = (token ?? "").toString();
    const attempt = await getAttemptByTokenOrFail(res, tokenStr);
    if (!attempt) return;

    res.status(200).json({ data: attempt });
  } catch (error) {
    logger.error(`Failed to fetch assessment: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to fetch assessment" });
  }
};

export const startAssessment = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const tokenStr = (token ?? "").toString();
    const attempt = await getAttemptByTokenOrFail(res, tokenStr);
    if (!attempt) return;

    if (attempt.status !== "pending") {
      res.status(400).json({
        error: `Cannot start an assessment that is already ${attempt.status}`,
      });
      return;
    }

    const result = await assessmentExecutionService.startAttempt(attempt.id);
    logger.info(`Assessment started: attemptId=${attempt.id}`);
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to start assessment attempt for token=${req.params.token}: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to start assessment" });
  }
};

export const submitAssessmentAnswer = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const tokenStr = (token ?? "").toString();
    const attempt = await getAttemptByTokenOrFail(res, tokenStr);
    if (!attempt) return;

    if (attempt.status !== "started") {
      res.status(403).json({
        error: "Assessment must be in 'started' state to submit answers",
      });
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

    const result = await assessmentExecutionService.saveAnswer(
      attempt.id,
      parsed.data,
    );
    socketService.notifyAssessmentProgress({
      candidateId: attempt.candidate.id,
      attemptId: attempt.id,
    });
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to save answer for attempt token=${req.params.token}: ${getErrorMessage(error)}`);
    res.status(500).json({
      error: "Failed to save answer",
    });
  }
};

export const completeAssessment = async (req: Request, res: Response) => {
  try {
    const parsed = completeAssessmentSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { autoSubmitReason } = parsed.data;
    const { token } = req.params;
    const tokenStr = (token ?? "").toString();
    const attempt = await getAttemptByTokenOrFail(res, tokenStr);
    if (!attempt) return;

    if (attempt.status !== "started") {
      res
        .status(400)
        .json({ error: "Only started assessments can be completed" });
      return;
    }

    const result = await assessmentExecutionService.completeAttempt(attempt.id);
    if (!result) {
      throw new Error("Failed to finalize assessment");
    }

    socketService.notifyAssessmentProgress({
      candidateId: attempt.candidate.id,
      attemptId: attempt.id,
    });

    const completionContext =
      await assessmentExecutionService.getAttemptCompletionEmailContext(
        attempt.id,
      );
    if (completionContext) {
      mailService
        .sendAssessmentCompletionEmail(
          completionContext.candidateEmail,
          completionContext.candidateFirstName,
          completionContext.assessmentTitle,
          autoSubmitReason,
        )
        .catch((emailError) => {
          logger.error("Assessment completion email failed:", emailError);
        });
    } else {
      logger.warn(
        `Assessment completion email skipped: context not found for attempt ${attempt.id}`,
      );
    }

    logger.info(`Assessment completed: attemptId=${attempt.id}, passed=${result.passed}, score=${result.scorePercentage}%${autoSubmitReason ? `, autoSubmit="${autoSubmitReason}"` : ""}`);
    res.status(200).json({
      message: "Assessment completed successfully",
      data: {
        passed: result.passed,
        scorePercentage: result.scorePercentage,
      },
    });
  } catch (error) {
    logger.error(`Failed to complete assessment for token=${req.params.token}: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to finalize assessment" });
  }
};

export const getAttemptResults = async (req: Request, res: Response) => {
  try {
    const attemptId = parseInt((req.params.attemptId ?? "").toString());
    if (isNaN(attemptId)) {
      res.status(400).json({ error: "Invalid attempt ID" });
      return;
    }

    const result = await assessmentExecutionService.getAttemptResults(attemptId);
    if (!result) {
      res.status(404).json({ error: "Attempt not found" });
      return;
    }

    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed to fetch attempt results for id=${req.params.attemptId}: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to fetch attempt results" });
  }
};
