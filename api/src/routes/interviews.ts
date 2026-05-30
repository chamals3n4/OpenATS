import { Router } from "express";
import { z } from "zod";
import { interviewService } from "../services/interview.service";
import logger from "../utils/logger";
import type { Request, Response } from "express";

const router: Router = Router();

// ── Interview routes ───────────────────────────────────────────────────────

const createInterviewSchema = z.object({
  stageId: z.number().int().optional(),
  scheduledAt: z.string().optional().nullable(),
  durationMinutes: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  attendeeEmails: z.array(z.string().email()).optional(),
});

const updateInterviewSchema = z.object({
  scheduledAt: z.string().optional().nullable(),
  durationMinutes: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  outcome: z.enum(["pending", "pass", "fail"]).optional(),
  attendeeEmails: z.array(z.string().email()).optional(),
});

// POST /candidates/:candidateId/interviews
router.post("/candidates/:candidateId/interviews", async (req, res) => {
  try {
    const candidateId = parseInt((req.params.candidateId ?? "").toString());
    if (isNaN(candidateId)) {
      res.status(400).json({ error: "Invalid candidate ID" });
      return;
    }

    // DEBUG: log exactly what the frontend sent
    logger.info(
      `[DEBUG] POST /candidates/${candidateId}/interviews body: ${JSON.stringify(req.body)}`,
    );

    const parsed = createInterviewSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.error(
        `[DEBUG] Interview validation failed: ${JSON.stringify(parsed.error.flatten())}`,
      );
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    logger.info(
      `[DEBUG] Interview data parsed OK: ${JSON.stringify(parsed.data)}`,
    );
    const interview = await interviewService.create(
      {
        candidateId,
        stageId: parsed.data.stageId as number | undefined,
        scheduledAt: parsed.data.scheduledAt ?? null,
        durationMinutes: parsed.data.durationMinutes ?? null,
        notes: parsed.data.notes ?? null,
        attendeeEmails: parsed.data.attendeeEmails,
      },
      req.user.id,
    );
    res.status(201).json({ data: interview });
  } catch (error: any) {
    logger.error(`Failed to create interview: ${error.message}`);
    res
      .status(400)
      .json({ error: error.message || "Failed to create interview" });
  }
});

// GET /candidates/:candidateId/interviews
router.get("/candidates/:candidateId/interviews", async (req, res) => {
  try {
    const candidateId = parseInt((req.params.candidateId ?? "").toString());
    if (isNaN(candidateId)) {
      res.status(400).json({ error: "Invalid candidate ID" });
      return;
    }
    const interviews = await interviewService.getByCandidate(candidateId);
    res.status(200).json({ data: interviews });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch interviews" });
  }
});

// GET /interviews — list all with optional filters
router.get("/interviews", async (req, res) => {
  try {
    const filters = {
      jobId: req.query.jobId ? Number(req.query.jobId) : undefined,
      fromDate: req.query.from as string | undefined,
      toDate: req.query.to as string | undefined,
    };
    const interviews = await interviewService.getAll(filters);
    res.status(200).json({ data: interviews });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to list interviews" });
  }
});

// PATCH /interviews/:id
router.patch("/interviews/:id", async (req, res) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid interview ID" });
      return;
    }
    const parsed = updateInterviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const interview = await interviewService.update(id, parsed.data);
    if (!interview) {
      res.status(404).json({ error: "Interview not found" });
      return;
    }
    res.status(200).json({ data: interview });
  } catch (error: any) {
    res
      .status(400)
      .json({ error: error.message || "Failed to update interview" });
  }
});

export default router;
