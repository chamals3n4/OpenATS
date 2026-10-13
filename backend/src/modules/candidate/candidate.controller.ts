import { Request, Response } from "express";
import { z } from "zod";
import {
  candidateService,
  DuplicateApplicationError,
  InvalidAnswerError,
  InvalidResumeUploadError,
  CANDIDATE_FLAG_FILTERS,
  type CandidateFlagFilter,
} from "./candidate.service";
import { jobService } from "../job/job.service";
import { r2Service } from "../../shared/services/r2.service";
import { resumeContentDisposition } from "./resume-filename";
import { socketService } from "../../shared/services/socket.service";
import { parseMinScore, parseMinYears } from "./candidate-query";
import { aiSettingsService } from "../settings/ai-settings.service";
import { scoringService } from "../scoring/scoring.service";
import { withholdInterviewScores } from "../scoring/scoring";
import { canViewCandidate } from "../../shared/auth/job-access";
import logger from "../../utils/logger";

import { requestCvAnalysis } from "../../queues/cv-analysis/queue";
import { requestCvExtraction } from "../../queues/cv-extract/queue";
import { requestResumeDeletion } from "../../queues/resume-delete/queue";
import { cvTextService } from "./cv-text.service";
import { getErrorMessage} from "../../utils/error.utils";

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
  // The id POST /public/upload/resume gave back for the uploaded file. Never a URL or a key.
  resumeUploadId: z.string().uuid("Upload the CV again").optional().nullable(),
  customAnswers: z.array(customAnswerSchema).optional(),
});

const moveStageSchema = z.object({
  newStageId: z.number().int().positive("Target stage ID is required"),
  // Where the card lands in the column (0 is the top). Omitted means the end.
  position: z.number().int().min(0).optional(),
});

const bulkMoveSchema = z.object({
  candidateIds: z
    .array(z.number().int().positive())
    .min(1, "Pick at least one candidate")
    .max(200, "Move at most 200 candidates at a time")
    .refine((ids) => new Set(ids).size === ids.length, "Candidate ids must be unique"),
  newStageId: z.number().int().positive("Target stage ID is required"),
});

const updateCandidateBasicSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100).optional(),
  lastName: z.string().min(1, "Last name is required").max(100).optional(),
  email: z.string().email("Invalid email address").max(255).optional(),
  phone: z.union([z.string().max(50), z.null()]).optional(),
});

const bulkDeleteCandidatesSchema = z.object({
  jobId: z.number().int().positive().optional(),
  stageId: z.number().int().positive().optional(),
  search: z.string().trim().optional(),
  status: z
    .enum(["active", "rejected", "offered", "hired", "withdrawn"])
    .optional(),
});

/**
 * Anyone interviewing a candidate, whatever their role, sees no Interview part or total for them
 * until they have submitted their own scorecard, so other interviewers' scorecards cannot sway
 * them. A manager or admin who is not interviewing that candidate sees everything.
 */
async function blindForInterviewer<T extends { id: number; interviewScore?: unknown; totalScore?: unknown; scoredParts?: number }>(
  user: { id: number; role: string },
  rows: T[],
): Promise<T[]> {
  const hidden = await scoringService.candidatesToWithhold(user, rows.map((r) => r.id));
  return hidden.size === 0 ? rows : rows.map((r) => (hidden.has(r.id) ? withholdInterviewScores(r) : r));
}

export const applyForJob = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const job = await jobService.getPublishedById(jobId);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const parsed = candidateApplySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await candidateService.apply(jobId, parsed.data);

    logger.info(
      `New application submitted: candidateId=${result.id}, jobId=${jobId}${result.resumeKey ? ", hasResume=true" : ""}`,
    );

    if (result.resumeKey) {
      requestCvExtraction({
        candidateId: result.id,
        resumeKey: result.resumeKey,
      }).catch((err) =>
        logger.error(
          `Failed to enqueue CV text extraction for candidateId=${result.id}: ${getErrorMessage(err)}`,
        ),
      );
      requestCvAnalysis({
        candidateId: result.id,
        jobId: result.jobId,
        resumeKey: result.resumeKey,
      }).catch((err) =>
        logger.error(
          `Failed to enqueue CV analysis for candidateId=${result.id}: ${getErrorMessage(err)}`,
        ),
      );
    }

    res.status(201).json({ data: result });
  } catch (error: unknown) {
    if (error instanceof InvalidAnswerError) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error instanceof InvalidResumeUploadError) {
      res.status(400).json({ error: error.message, code: "RESUME_UPLOAD_INVALID" });
      return;
    }
    if (error instanceof DuplicateApplicationError) {
      // No email address here: logs are kept after a candidate asks to be deleted.
      logger.warn(`Duplicate application attempt: jobId=${req.params.jobId}`);
      res.status(409).json({
        error: "You have already applied to this job with this email.",
        code: "DUPLICATE_APPLICATION",
      });
      return;
    }
    logger.error(
      `Failed to submit application for jobId=${req.params.jobId}: ${getErrorMessage(error)}`,
    );
    res.status(500).json({ error: "Failed to submit application" });
  }
};

export const getPipelineBoard = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }
    const data = await candidateService.getBoard(jobId);
    res.status(200).json({ data });
  } catch (error) {
    logger.error(
      `Failed to load pipeline board for jobId=${req.params.jobId}: ${getErrorMessage(error)}`,
    );
    res.status(500).json({ error: "Failed to load the pipeline board" });
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

    const statusParam = req.query.status?.toString();
    const allowedStatuses = new Set([
      "active",
      "rejected",
      "offered",
      "hired",
      "withdrawn",
    ]);

    if (statusParam && !allowedStatuses.has(statusParam)) {
      res.status(400).json({ error: "Invalid candidate status" });
      return;
    }

    const page = req.query.page
      ? Math.max(1, parseInt(req.query.page.toString()) || 1)
      : undefined;
    const limit = req.query.limit
      ? Math.min(200, Math.max(1, parseInt(req.query.limit.toString()) || 25))
      : undefined;

    // The Interview part is part of the total, so an interviewer filtering on score or on "all
    // parts scored" could work out scores they are not meant to see yet. They get the flag filter only.
    const scoreFiltersAllowed = req.user.role !== "interviewer";
    const flagParam = req.query.flag?.toString();

    const filters = {
      minScore: scoreFiltersAllowed ? parseMinScore(req.query.minScore) : undefined,
      flag: (CANDIDATE_FLAG_FILTERS as readonly string[]).includes(flagParam ?? "")
        ? (flagParam as CandidateFlagFilter)
        : undefined,
      fullyScored: scoreFiltersAllowed && req.query.fullyScored === "true" ? true : undefined,
      minExperienceYears: parseMinYears(req.query.minExperience),
      stageId: req.query.stageId
        ? parseInt(req.query.stageId.toString())
        : undefined,
      search: req.query.search?.toString(),
      status: statusParam as
        | "active"
        | "rejected"
        | "offered"
        | "hired"
        | "withdrawn"
        | undefined,
      // Ranking by total would reveal the hidden Interview part to an interviewer.
      sort:
        req.query.sort === "score" && req.user.role !== "interviewer"
          ? ("score" as const)
          : undefined,
      page,
      limit,
      teamUserId: req.user.role === "interviewer" ? req.user.id : undefined,
    };

    const result = await candidateService.getAll(jobId, filters);
    res.status(200).json({
      data: await blindForInterviewer(req.user, result.rows),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    logger.error(
      `Failed to fetch candidates${req.params.jobId ? ` for jobId=${req.params.jobId}` : ""}: ${getErrorMessage(error)}`,
    );
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

    // The rule in shared/auth/job-access.ts: an interviewer sees the candidates of their own
    // jobs, a hiring manager or super admin sees every candidate.
    {
      const allowed = await canViewCandidate(req.user, id);
      if (!allowed) {
        logger.warn(`[access] user ${req.user.id} denied candidate ${id}`);
        res
          .status(403)
          .json({ error: "You do not have access to this resource" });
        return;
      }
    }

    const result = await candidateService.getById(id);
    if (!result) {
      res.status(404).json({ error: "Candidate not found" });
      return;
    }

    const [blinded] = await blindForInterviewer(req.user, [result]);
    const hidden = blinded !== result;
    // While AI CV analysis is off, a saved analysis is kept but not sent, so it is hidden in fact
    // and not only by the page choosing not to draw it.
    const aiActive = await aiSettingsService.isCvAnalysisActive();
    res.status(200).json({
      data: {
        ...(hidden ? { ...blinded, interviewSpread: null } : result),
        ...(aiActive ? {} : { cvAnalysis: null }),
      },
    });
  } catch (error) {
    logger.error(
      `Failed to fetch candidate id=${req.params.id}: ${getErrorMessage(error)}`,
    );
    res.status(500).json({ error: "Failed to fetch candidate" });
  }
};

/** The text read from the candidate's CV, for whoever may open the candidate. */
export const getCandidateCvText = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid candidate ID" });
      return;
    }

    if (!(await canViewCandidate(req.user, id))) {
      logger.warn(`[access] user ${req.user.id} denied candidate ${id}`);
      res.status(403).json({ error: "You do not have access to this resource" });
      return;
    }

    const cvText = await cvTextService.getForCandidate(id);
    if (!cvText) {
      res.status(404).json({ error: "This candidate has no CV text" });
      return;
    }
    // One section on its own, for a reader that does not need the whole CV.
    const section = req.query.section?.toString();
    if (section) {
      const sections = (cvText.sections ?? []).filter((s) => s.key === section);
      res.status(200).json({ data: { status: cvText.status, sections } });
      return;
    }

    res.status(200).json({ data: cvText });
  } catch (error) {
    logger.error(
      `Failed to fetch CV text for candidate id=${req.params.id} - user ${req.user?.id}: ${getErrorMessage(error)}`,
    );
    res.status(500).json({ error: "Failed to fetch CV text" });
  }
};

export const getCandidateResume = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid candidate ID" });
      return;
    }

    if (!(await canViewCandidate(req.user, id))) {
      res.status(403).json({ error: "You do not have access to this resource" });
      return;
    }

    // The file is sent by this server, straight from the private bucket. There is no link to the
    // stored file, so nothing can be copied out of the dashboard and opened without signing in.
    const file = await candidateService.getResumeFile(id);
    const resume = file ? await r2Service.getResume(file.resumeKey) : null;
    if (!file || !resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      resumeContentDisposition(file.firstName, file.lastName),
    );
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(resume);
  } catch (error) {
    logger.error(
      `Failed to stream candidate resume id=${req.params.id}: ${getErrorMessage(error)}`,
    );
    res.status(500).json({ error: "Failed to load resume" });
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
      req.user.id,
      parsed.data.position,
    );
    logger.info(
      `Candidate stage moved: candidateId=${id}, newStageId=${parsed.data.newStageId}, movedBy=${req.user.id}${result.stageAutomation ? `, automation="${result.stageAutomation}"` : ""}`,
    );
    socketService.notifyStageChanged({
      candidateId: id,
      jobId: result.candidate.jobId,
      stageId: parsed.data.newStageId,
    });
    res.status(200).json({
      data: result.candidate,
      stageAutomation: result.stageAutomation,
    });
  } catch (error) {
    logger.error(
      `Failed to move candidate id=${req.params.id} to stage ${req.body?.newStageId} - user ${req.user?.id}: ${getErrorMessage(error)}`,
    );
    res
      .status(400)
      .json({ error: getErrorMessage(error) || "Failed to move candidate" });
  }
};

export const bulkMoveCandidates = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const parsed = bulkMoveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await candidateService.moveStageBulk(
      parsed.data.candidateIds,
      parsed.data.newStageId,
      req.user.id,
    );
    logger.info(
      `Bulk stage move: stageId=${parsed.data.newStageId}, moved=${result.moved.length}, failed=${result.failed.length}, by user ${req.user.id}`,
    );
    for (const m of result.moved) {
      socketService.notifyStageChanged({
        candidateId: m.id,
        jobId: m.jobId,
        stageId: parsed.data.newStageId,
      });
    }
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(`Failed bulk stage move: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to move the candidates" });
  }
};

export const bulkDeleteCandidates = async (req: Request, res: Response) => {
  try {
    const parsed = bulkDeleteCandidatesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { jobId, stageId, search, status } = parsed.data;

    logger.warn(
      `Bulk candidate deletion requested: jobId=${jobId ?? "all"}, stageId=${stageId ?? "all"}, status=${status ?? "all"}, search="${search ?? ""}" by user ${req.user?.id}`,
    );

    const deleted = await candidateService.deleteManyByFilters(jobId, {
      stageId,
      search: search || undefined,
      status,
    });

    logger.info(
      `Bulk candidate deletion completed: count=${deleted.length} by user ${req.user?.id}`,
    );

    res.status(200).json({
      data: {
        count: deleted.length,
        ids: deleted.map((candidate) => candidate.id),
      },
    });
  } catch (error) {
    logger.error(
      `Failed to bulk delete candidates - user ${req.user?.id}: ${getErrorMessage(error)}`,
    );
    res.status(500).json({ error: "Failed to delete candidates" });
  }
};

export const deleteCandidate = async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid candidate ID" });
      return;
    }

    logger.warn(
      `Candidate deletion requested: id=${id} by user ${req.user?.id}`,
    );
    const result = await candidateService.delete(id);
    if (!result) {
      res.status(404).json({ error: "Candidate not found" });
      return;
    }

    logger.info(
      `Candidate deleted: id=${id}, jobId=${result.jobId} by user ${req.user?.id}`,
    );
    res.status(200).json({ data: result });
  } catch (error) {
    logger.error(
      `Failed to delete candidate id=${req.params.id} - user ${req.user?.id}: ${getErrorMessage(error)}`,
    );
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
    const oldResumeKey = (await candidateService.getResumeFile(id))?.resumeKey ?? null;

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

    let newResumeKey: string | undefined;
    if (req.file) {
      if (req.file.mimetype !== "application/pdf") {
        res.status(400).json({ error: "Only PDF files are allowed" });
        return;
      }

      newResumeKey = await r2Service.uploadResume(req.file);
    }

    const updated = await candidateService.updateBasicDetails(id, {
      ...parsed.data,
      ...(newResumeKey ? { resumeKey: newResumeKey } : {}),
    });

    if (!updated) {
      if (newResumeKey) {
        await r2Service.deleteResume(newResumeKey).catch(() => undefined);
      }
      res.status(404).json({ error: "Candidate not found" });
      return;
    }

    if (newResumeKey && oldResumeKey && oldResumeKey !== newResumeKey) {
      await requestResumeDeletion([oldResumeKey]);
    }

    if (newResumeKey) {
      requestCvExtraction({
        candidateId: updated.id,
        resumeKey: newResumeKey,
      }).catch((err) =>
        logger.error(
          `Failed to enqueue CV text extraction for candidateId=${updated.id}: ${getErrorMessage(err)}`,
        ),
      );
      requestCvAnalysis({
        candidateId: updated.id,
        jobId: updated.jobId,
        resumeKey: newResumeKey,
      }).catch((err) =>
        logger.error(
          `Failed to enqueue CV analysis for candidateId=${updated.id}: ${getErrorMessage(err)}`,
        ),
      );
    }

    logger.info(
      `Candidate details updated: id=${id}${newResumeKey ? ", resumeReplaced=true" : ""} by user ${req.user?.id}`,
    );
    const { resumeKey, ...details } = updated;
    res.status(200).json({ data: { ...details, hasResume: resumeKey !== null } });
  } catch (error) {
    logger.error(
      `Failed to update candidate details id=${req.params.id} - user ${req.user?.id}: ${getErrorMessage(error)}`,
    );
    res
      .status(500)
      .json({ error: getErrorMessage(error) || "Failed to update candidate details" });
  }
};
