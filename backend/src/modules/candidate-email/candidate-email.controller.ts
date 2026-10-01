import { Request, Response } from "express";
import { z } from "zod";
import logger from "../../utils/logger";
import { getErrorMessage } from "../../utils/error.utils";
import { parseRoomId } from "../../shared/auth/job-access";
import {
  CandidateNotFoundError,
  candidateEmailService,
} from "./candidate-email.service";

const sendSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(200),
  body: z.string().trim().min(1, "Message is required").max(10000),
  // A single plain address; zod's email check rejects names, commas and line breaks.
  replyTo: z.string().trim().email("Enter a valid reply address").max(255).optional(),
});

export const sendCandidateEmail = async (req: Request, res: Response) => {
  const candidateId = parseRoomId(req.params.candidateId);
  if (candidateId === null) {
    res.status(400).json({ error: "Invalid candidate ID" });
    return;
  }

  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const email = await candidateEmailService.send({
      candidateId,
      subject: parsed.data.subject,
      body: parsed.data.body,
      sentBy: req.user.id,
      replyTo: parsed.data.replyTo ?? null,
    });
    logger.info(`Email sent to candidate ${candidateId} by user ${req.user.id}`);
    res.status(201).json({ data: email });
  } catch (error) {
    if (error instanceof CandidateNotFoundError) {
      res.status(404).json({ error: "Candidate not found" });
      return;
    }
    logger.error(
      `Failed to email candidate ${candidateId} - user ${req.user.id}: ${getErrorMessage(error)}`,
    );
    res.status(502).json({ error: "We couldn't send the email. Please try again." });
  }
};

export const getCandidateEmails = async (req: Request, res: Response) => {
  const candidateId = parseRoomId(req.params.candidateId);
  if (candidateId === null) {
    res.status(400).json({ error: "Invalid candidate ID" });
    return;
  }

  try {
    res.status(200).json({ data: await candidateEmailService.listByCandidate(candidateId) });
  } catch (error) {
    logger.error(`Failed to load emails for candidate ${candidateId}: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to load emails" });
  }
};
