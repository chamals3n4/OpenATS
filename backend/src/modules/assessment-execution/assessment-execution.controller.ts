import { Request, Response } from "express";
import { z } from "zod";
import { assessmentExecutionService, GradingError } from "./assessment-execution.service";
import { assessmentCompletedEmail } from "../../shared/services/candidate-emails";
import { emailContext, sendCandidateEmail } from "../../shared/services/candidate-mailer";
import { socketService } from "../../shared/services/socket.service";
import { canViewCandidate } from "../../shared/auth/job-access";
import { isPastDeadline } from "./grading";
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

/** Answers 403 and returns false when the user may not see the candidate (an interviewer who is not on the job). */
async function allowCandidate(req: Request, res: Response, candidateId: number, what: string) {
  if (await canViewCandidate(req.user, candidateId)) return true;
  logger.warn(`[access] user ${req.user.id} denied ${what} for candidate ${candidateId}`);
  res.status(403).json({ error: "You do not have access to this resource" });
  return false;
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
    if (!(await allowCandidate(req, res, candidateId, "an assessment invite"))) return;
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

    if (!(await allowCandidate(req, res, candidateId, "assessment attempts"))) return;
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

    // The clock in the browser can be stopped or changed, so the limit is checked here too.
    if (isPastDeadline(attempt.startedAt, attempt.assessment.timeLimit, new Date())) {
      res.status(403).json({
        error: "The time for this assessment is up. Answers can no longer be changed.",
        code: "TIME_UP",
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
      // Not awaited: the candidate's result is saved either way.
      void emailContext("assessment_completed")
        .then((context) =>
          sendCandidateEmail({
            candidateId: completionContext.candidateId,
            to: completionContext.candidateEmail,
            kind: "assessment_completed",
            ...assessmentCompletedEmail({
              ...context,
              firstName: completionContext.candidateFirstName,
              assessmentTitle: completionContext.assessmentTitle,
              autoSubmitReason,
            }),
          }),
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

    // The answers and scores belong to one candidate, so check the job before reading them.
    const owner = await assessmentExecutionService.getAttemptOwner(attemptId);
    if (!owner) {
      res.status(404).json({ error: "Attempt not found" });
      return;
    }
    if (!(await allowCandidate(req, res, owner.candidateId, "assessment results"))) return;

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

const gradeSchema = z.object({
  questionId: z.number().int().positive(),
  points: z.number().min(0),
});

export const gradeWrittenAnswer = async (req: Request, res: Response) => {
  try {
    const attemptId = parseInt((req.params.attemptId ?? "").toString());
    const parsed = gradeSchema.safeParse(req.body);
    if (isNaN(attemptId) || !parsed.success) {
      res.status(400).json({ error: "A question and its points are required" });
      return;
    }
    // Grading changes a candidate's score, so it needs access to that candidate's job, not only the manager role.
    const owner = await assessmentExecutionService.getAttemptOwner(attemptId);
    if (!owner) {
      res.status(404).json({ error: "Attempt not found" });
      return;
    }
    if (!(await allowCandidate(req, res, owner.candidateId, "grading"))) return;

    const attempt = await assessmentExecutionService.gradeWrittenAnswer(
      attemptId,
      parsed.data.questionId,
      parsed.data.points,
    );
    logger.info(`Written answer graded: attemptId=${attemptId}, questionId=${parsed.data.questionId}, points=${parsed.data.points} by user ${req.user?.id}`);
    res.status(200).json({ data: attempt });
  } catch (error) {
    if (error instanceof GradingError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    logger.error(`Failed to grade answer for attempt ${req.params.attemptId} - user ${req.user?.id}: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to save the grade" });
  }
};
