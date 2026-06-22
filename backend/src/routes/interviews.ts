import { Router } from "express";
import { z } from "zod";
import { interviewService } from "../services/interview.service";
import { mailService } from "../services/mail.service";
import { db } from "../db";
import {
  candidates,
  jobs,
  jobPipelineStages,
  candidateInterviews,
} from "../db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import logger from "../utils/logger";
import type { Request, Response } from "express";

const router: Router = Router();

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
  status: z
    .enum(["pending_schedule", "scheduled", "completed", "cancelled"])
    .optional(),
  eventName: z.string().min(1).optional(),
  eventType: z.enum(["virtual", "onsite"]).optional(),
  meetingUrl: z.string().url().optional().nullable(),
  bodyText: z.string().optional().nullable(),
  attendeeEmails: z.array(z.string().email()).optional(),
});

router.post("/candidates/:candidateId/interviews", async (req, res) => {
  try {
    const candidateId = parseInt((req.params.candidateId ?? "").toString());
    if (isNaN(candidateId)) {
      res.status(400).json({ error: "Invalid candidate ID" });
      return;
    }

    const parsed = createInterviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

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

router.get("/interviews", async (req, res) => {
  try {
    const filters = {
      jobId: req.query.jobId ? Number(req.query.jobId) : undefined,
      departmentId: req.query.departmentId
        ? Number(req.query.departmentId)
        : undefined,
      search: req.query.search as string | undefined,
      fromDate: req.query.from as string | undefined,
      toDate: req.query.to as string | undefined,
    };
    const interviews = await interviewService.getAll(filters);
    res.status(200).json({ data: interviews });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to list interviews" });
  }
});

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

const scheduleSchema = z.object({
  eventName: z.string().min(1),
  eventType: z.enum(["virtual", "onsite"]),
  meetingUrl: z.string().url().optional().nullable(),
  bodyText: z.string().optional().nullable(),
  stageId: z.number().int().optional(),
  timeSlots: z.array(
    z.object({
      datetime: z.string(),
      selected: z.boolean().default(false),
    }),
  ),
});

router.post("/candidates/:id/schedule", async (req, res) => {
  try {
    const candidateId = parseInt((req.params.id ?? "").toString());
    if (isNaN(candidateId)) {
      res.status(400).json({ error: "Invalid candidate ID" });
      return;
    }

    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const [candidate] = await db
      .select({
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
        jobId: candidates.jobId,
        currentStageId: candidates.currentStageId,
        jobTitle: jobs.title,
      })
      .from(candidates)
      .leftJoin(jobs, eq(candidates.jobId, jobs.id))
      .where(eq(candidates.id, candidateId));

    if (!candidate) {
      res.status(404).json({ error: "Candidate not found" });
      return;
    }

    const stageId = parsed.data.stageId || candidate.currentStageId || 0;
    const token = randomUUID();

    const [interview] = await db
      .insert(candidateInterviews)
      .values({
        candidateId: candidate.id,
        stageId,
        jobId: candidate.jobId,
        eventName: parsed.data.eventName,
        eventType: parsed.data.eventType,
        meetingUrl: parsed.data.meetingUrl ?? null,
        bodyText: parsed.data.bodyText ?? null,
        timeSlots: parsed.data.timeSlots,
        status: "pending_schedule",
        publicToken: token,
        tokenExpiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        createdBy: req.user.id,
      })
      .returning();

    if (!interview) throw new Error("Failed to create interview");

    const publicUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/interview/${token}`;

    mailService
      .sendInterviewSlotEmail(
        candidate.email,
        `${candidate.firstName} ${candidate.lastName}`,
        parsed.data.eventName,
        candidate.jobTitle ?? "",
        parsed.data.eventType,
        parsed.data.meetingUrl ?? null,
        parsed.data.bodyText ?? null,
        publicUrl,
      )
      .catch((err: any) => {
        logger.error(`Failed to send interview slot email: ${err.message}`);
      });

    res.status(201).json({ data: interview });
  } catch (error: any) {
    logger.error(`Schedule interview failed: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

router.get("/public/interview/:token", async (req, res) => {
  try {
    const [interview] = await db
      .select({
        id: candidateInterviews.id,
        eventName: candidateInterviews.eventName,
        eventType: candidateInterviews.eventType,
        meetingUrl: candidateInterviews.meetingUrl,
        bodyText: candidateInterviews.bodyText,
        timeSlots: candidateInterviews.timeSlots,
        status: candidateInterviews.status,
        candidateName: {
          first: candidates.firstName,
          last: candidates.lastName,
        },
        jobTitle: jobs.title,
      })
      .from(candidateInterviews)
      .leftJoin(candidates, eq(candidateInterviews.candidateId, candidates.id))
      .leftJoin(jobs, eq(candidateInterviews.jobId, jobs.id))
      .where(eq(candidateInterviews.publicToken, req.params.token));

    if (!interview) {
      res.status(404).json({ error: "Invalid link" });
      return;
    }

    res.status(200).json({
      data: {
        ...interview,
        candidateName: interview.candidateName
          ? `${interview.candidateName.first} ${interview.candidateName.last}`
          : "Unknown",
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load interview" });
  }
});

router.patch("/public/interview/:token/select", async (req, res) => {
  try {
    const slotIndex = req.body?.slotIndex;
    if (slotIndex == null) {
      res.status(400).json({ error: "slotIndex required" });
      return;
    }

    const [interview] = await db
      .select()
      .from(candidateInterviews)
      .where(eq(candidateInterviews.publicToken, req.params.token));

    if (!interview || !interview.timeSlots) {
      res.status(404).json({ error: "Invalid link" });
      return;
    }

    const slots = interview.timeSlots as Array<{
      datetime: string;
      selected: boolean;
    }>;
    if (slotIndex < 0 || slotIndex >= slots.length) {
      res.status(400).json({ error: "Invalid slot index" });
      return;
    }

    const selectedSlot = slots[slotIndex]!;
    selectedSlot.selected = true;

    await db
      .update(candidateInterviews)
      .set({
        timeSlots: slots,
        status: "scheduled",
        scheduledAt: new Date(selectedSlot.datetime),
        updatedAt: new Date(),
      })
      .where(eq(candidateInterviews.id, interview.id));

    if (interview.eventName) {
      try {
        const [candidate] = await db
          .select({
            email: candidates.email,
            firstName: candidates.firstName,
            lastName: candidates.lastName,
          })
          .from(candidates)
          .where(eq(candidates.id, interview.candidateId));

        if (candidate) {
          const gcal = await import("../services/google-calendar.service");
          await gcal.createCalendarEvent({
            interviewId: interview.id,
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            jobTitle: "",
            stageName: "",
            scheduledAt: new Date(selectedSlot.datetime),
            durationMinutes: 60,
            notes: interview.bodyText ?? null,
            attendeeEmails: [candidate.email],
          });
        }
      } catch {}
    }

    res.status(200).json({ data: { confirmed: true, slot: selectedSlot } });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to confirm slot" });
  }
});

router.delete("/interviews/:id", async (req, res) => {
  try {
    const id = parseInt((req.params.id ?? "").toString());
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const deleted = await interviewService.delete(id);
    if (!deleted) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(200).json({ data: deleted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const feedbackSchema = z.object({
  content: z.string().min(1, "Feedback content is required"),
  rating: z.number().int().min(1).max(5).optional().nullable(),
});

router.post("/interviews/:id/feedback", async (req, res) => {
  try {
    const interviewId = parseInt((req.params.id ?? "").toString());
    if (isNaN(interviewId)) {
      res.status(400).json({ error: "Invalid interview ID" });
      return;
    }
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const feedback = await interviewService.addFeedback(
      interviewId,
      req.user.id,
      parsed.data.content,
      parsed.data.rating,
    );
    if (!feedback) {
      res.status(500).json({ error: "Failed to create feedback" });
      return;
    }
    res.status(201).json({ data: feedback });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to add feedback" });
  }
});

router.get("/interviews/:id/feedback", async (req, res) => {
  try {
    const interviewId = parseInt((req.params.id ?? "").toString());
    if (isNaN(interviewId)) {
      res.status(400).json({ error: "Invalid interview ID" });
      return;
    }
    const feedback = await interviewService.getFeedback(interviewId);
    res.status(200).json({ data: feedback });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

router.delete("/interviews/:id/feedback/:feedbackId", async (req, res) => {
  try {
    const feedbackId = parseInt((req.params.feedbackId ?? "").toString());
    if (isNaN(feedbackId)) {
      res.status(400).json({ error: "Invalid feedback ID" });
      return;
    }
    const deleted = await interviewService.deleteFeedback(feedbackId);
    if (!deleted) {
      res.status(404).json({ error: "Feedback not found" });
      return;
    }
    res.status(200).json({ data: deleted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
