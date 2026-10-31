import { Request, Response } from "express";
import { z } from "zod";
import { AssignmentAlreadySubmittedError, AssignmentClosedError, assignmentService } from "./assignment.service";
import {
  MAX_DUE_DAYS,
  MAX_RESOURCES,
  answersSchema,
  checkAnswers,
  fieldsSchema,
  resourceSchema,
} from "./assignment-rules";
import { socketService } from "../../shared/services/socket.service";
import { canViewCandidate } from "../../shared/auth/job-access";
import logger from "../../utils/logger";
import { getErrorMessage, safeErrorMessage } from "../../utils/error.utils";

const assignmentSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255),
  description: z.string().max(20000).default(""),
  resources: z.array(resourceSchema).max(MAX_RESOURCES).default([]),
  submissionFields: fieldsSchema,
  dueDays: z.number().int().min(1).max(MAX_DUE_DAYS).default(7),
});

const sendSchema = z.object({
  candidateId: z.number().int().positive(),
  assignmentId: z.number().int().positive(),
  dueDays: z.number().int().min(1).max(MAX_DUE_DAYS).optional(),
  // false makes the link without emailing it
  email: z.boolean().default(true),
});

const idParam = (req: Request) => parseInt((req.params.id ?? "").toString());

const invalid = (res: Response, error: z.ZodError) =>
  res.status(400).json({ error: "Validation failed", details: error.flatten().fieldErrors });

export const getAllAssignments = async (_req: Request, res: Response) => {
  try {
    res.status(200).json({ data: await assignmentService.getAll() });
  } catch (error) {
    logger.error(`Failed to fetch assignments: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
};

export const getAssignmentById = async (req: Request, res: Response) => {
  try {
    const row = await assignmentService.getById(idParam(req));
    if (!row) return void res.status(404).json({ error: "Assignment not found" });
    res.status(200).json({ data: row });
  } catch (error) {
    logger.error(`Failed to fetch assignment: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to fetch assignment" });
  }
};

export const createAssignment = async (req: Request, res: Response) => {
  try {
    const parsed = assignmentSchema.safeParse(req.body);
    if (!parsed.success) return void invalid(res, parsed.error);
    const row = await assignmentService.create(parsed.data, req.user.id);
    logger.info(`Assignment created: id=${row.id}, createdBy=${req.user.id}`);
    res.status(201).json({ data: row });
  } catch (error) {
    logger.error(`Failed to create assignment: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to create assignment" });
  }
};

export const updateAssignment = async (req: Request, res: Response) => {
  try {
    const parsed = assignmentSchema.partial().safeParse(req.body);
    if (!parsed.success) return void invalid(res, parsed.error);
    const row = await assignmentService.update(idParam(req), parsed.data);
    if (!row) return void res.status(404).json({ error: "Assignment not found" });
    res.status(200).json({ data: row });
  } catch (error) {
    logger.error(`Failed to update assignment: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to update assignment" });
  }
};

export const deleteAssignment = async (req: Request, res: Response) => {
  try {
    const deleted = await assignmentService.delete(idParam(req));
    if (!deleted) return void res.status(404).json({ error: "Assignment not found" });
    res.status(200).json({ message: "Assignment deleted" });
  } catch (error) {
    logger.error(`Failed to delete assignment: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
};

export const sendAssignment = async (req: Request, res: Response) => {
  try {
    const parsed = sendSchema.safeParse(req.body);
    if (!parsed.success) return void invalid(res, parsed.error);
    const { candidateId, assignmentId, dueDays, email } = parsed.data;

    if (!(await canViewCandidate(req.user, candidateId))) {
      logger.warn(`[access] user ${req.user.id} denied sending an assignment to candidate ${candidateId}`);
      return void res.status(403).json({ error: "You do not have access to this candidate" });
    }

    let result;
    try {
      result = await assignmentService.send(candidateId, assignmentId, { email, ...(dueDays ? { dueDays } : {}) });
    } catch (error) {
      // The link was not kept, so the same request can be sent again
      logger.error(`Assignment ${assignmentId} email to candidate ${candidateId} failed: ${getErrorMessage(error)}`);
      return void res.status(502).json({ error: safeErrorMessage(error, "The assignment email could not be sent") });
    }
    if (!result) return void res.status(404).json({ error: "Candidate or assignment not found" });

    logger.info(`Assignment ${assignmentId} given to candidate ${candidateId} by ${req.user.id} (emailed=${result.didSendInvite})`);
    const status = !result.created ? "existing" : result.didSendInvite ? "emailed" : "link";
    res.status(200).json({ data: { url: result.url, status } });
  } catch (error) {
    logger.error(`Failed to send assignment: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to send assignment" });
  }
};

export const previewAssignmentEmail = async (req: Request, res: Response) => {
  try {
    const parsed = z
      .object({ candidateId: z.number().int().positive(), assignmentId: z.number().int().positive() })
      .safeParse(req.body);
    if (!parsed.success) return void invalid(res, parsed.error);
    const { candidateId, assignmentId } = parsed.data;
    if (!(await canViewCandidate(req.user, candidateId))) {
      return void res.status(403).json({ error: "You do not have access to this candidate" });
    }
    const preview = await assignmentService.previewInvite(candidateId, assignmentId);
    if (!preview) return void res.status(404).json({ error: "Candidate or assignment not found" });
    res.status(200).json({ data: preview });
  } catch (error) {
    logger.error(`Failed to preview assignment email: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to build the preview" });
  }
};

export const getJobAssignments = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    res.status(200).json({ data: await assignmentService.getJobAttachments(jobId) });
  } catch (error) {
    logger.error(`Failed to fetch job assignments: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to fetch job assignments" });
  }
};

export const attachAssignment = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    const parsed = z
      .object({ assignmentId: z.number().int().positive(), triggerStageId: z.number().int().positive() })
      .safeParse(req.body);
    if (!parsed.success) return void invalid(res, parsed.error);
    if (!(await assignmentService.getById(parsed.data.assignmentId))) {
      return void res.status(404).json({ error: "Assignment not found" });
    }
    const row = await assignmentService.attachToStage(jobId, parsed.data.assignmentId, parsed.data.triggerStageId);
    if (!row) return void res.status(400).json({ error: "That stage does not belong to this job" });
    res.status(201).json({ data: row });
  } catch (error) {
    // The unique (job, stage) constraint: a stage sends one assignment.
    if ((error as { code?: string; cause?: { code?: string } })?.cause?.code === "23505") {
      return void res.status(409).json({ error: "This stage already sends an assignment" });
    }
    logger.error(`Failed to attach assignment: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to attach assignment" });
  }
};

export const detachAssignment = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt((req.params.jobId ?? "").toString());
    const attachmentId = parseInt((req.params.attachmentId ?? "").toString());
    if (!(await assignmentService.detachFromStage(jobId, attachmentId))) {
      return void res.status(404).json({ error: "Not found" });
    }
    res.status(200).json({ message: "Removed" });
  } catch (error) {
    logger.error(`Failed to detach assignment: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to remove assignment" });
  }
};

export const getCandidateAssignments = async (req: Request, res: Response) => {
  try {
    const candidateId = parseInt((req.params.candidateId ?? "").toString());
    if (isNaN(candidateId)) return void res.status(400).json({ error: "Invalid candidate ID" });
    if (!(await canViewCandidate(req.user, candidateId))) {
      logger.warn(`[access] user ${req.user.id} denied assignments for candidate ${candidateId}`);
      return void res.status(403).json({ error: "You do not have access to this resource" });
    }
    res.status(200).json({ data: await assignmentService.getForCandidate(candidateId) });
  } catch (error) {
    logger.error(`Failed to fetch candidate assignments: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
};

/** The candidate's page: the brief, and what they handed in so far. */
export const getAssignmentForCandidate = async (req: Request, res: Response) => {
  try {
    const row = await assignmentService.getByToken((req.params.token ?? "").toString());
    if (!row) return void res.status(404).json({ error: "Assignment not found" });
    const { id: _id, ...data } = row;
    // Expired is worked out from the date as well, because the periodic check can lag behind.
    const expired = data.status === "expired" || (data.status === "pending" && data.dueAt < new Date());
    res.status(200).json({ data: { ...data, status: expired ? "expired" : data.status } });
  } catch (error) {
    logger.error(`Failed to load assignment: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to load assignment" });
  }
};

export const submitAssignment = async (req: Request, res: Response) => {
  try {
    const parsed = z.object({ answers: answersSchema }).safeParse(req.body);
    if (!parsed.success) return void invalid(res, parsed.error);

    // Checked against the form this candidate was sent, not the assignment as it is now.
    const token = (req.params.token ?? "").toString();
    const current = await assignmentService.getByToken(token);
    if (!current) return void res.status(404).json({ error: "Assignment not found" });
    const checked = checkAnswers(current.submissionFields, parsed.data.answers);
    if (!checked.ok) return void res.status(400).json({ error: checked.error });

    const row = await assignmentService.submit(token, checked.answers);
    if (!row) return void res.status(404).json({ error: "Assignment not found" });
    logger.info(`Assignment handed in: id=${row.id}, candidateId=${row.candidateId}`);
    socketService.notifyAssignmentSubmitted({ candidateId: row.candidateId });
    res.status(200).json({ data: { submitted: true } });
  } catch (error) {
    if (error instanceof AssignmentAlreadySubmittedError) {
      return void res.status(409).json({ error: error.message, code: "ALREADY_SUBMITTED" });
    }
    if (error instanceof AssignmentClosedError) {
      return void res.status(410).json({ error: error.message, code: "CLOSED" });
    }
    logger.error(`Failed to hand in assignment: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to hand in assignment" });
  }
};
