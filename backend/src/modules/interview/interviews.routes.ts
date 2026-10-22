import { Router } from "express";
import { z } from "zod";
import { requireCandidateView, requireInterviewView } from "../../middlewares/job-access.middleware";
import { requireManager } from "../../middlewares/role.middleware";
import { teamScope } from "../../shared/auth/job-access";
import { interviewService, FeedbackValidationError } from "./interview.service";
import { DEFAULT_INTERVIEW_MINUTES, completeInterviewBooking } from "./interview-confirm";
import { isInterviewClash } from "./interview-slots";
import { interviewSlotsEmail } from "../../shared/services/candidate-emails";
import { emailContext, sendCandidateEmail } from "../../shared/services/candidate-mailer";
import { socketService } from "../../shared/services/socket.service";
import { db } from "../../db";
import {
  candidates,
  jobs,
  candidateInterviews,
} from "../../db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import logger from "../../utils/logger";
import { integrationConnectionService } from "../../shared/integrations/connection.service";
import { getErrorMessage} from "../../utils/error.utils";
import { frontendUrl } from "../../utils/frontend-url";

const router: Router = Router();

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
  meetingProvider: z.enum(["google_meet"]).optional().nullable(),
  interviewerId: z.number().int().optional(),
  location: z.string().optional().nullable(),
  bodyText: z.string().optional().nullable(),
  attendeeEmails: z.array(z.string().email()).optional(),
});

router.get("/candidates/:candidateId/interviews", requireCandidateView(), async (req, res) => {
  try {
    const candidateId = parseInt((req.params.candidateId ?? "").toString());
    if (isNaN(candidateId)) {
      res.status(400).json({ error: "Invalid candidate ID" });
      return;
    }
    const interviews = await interviewService.getByCandidate(candidateId);
    res.status(200).json({ data: interviews });
  } catch (error) {
    logger.error(`Failed to fetch interviews: ${getErrorMessage(error)}`);
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
    // Everyone but a super admin gets the interviews of their own jobs and the ones assigned to them.
    const interviews = await interviewService.getAll(filters, teamScope(req.user), req.user.id);
    res.status(200).json({ data: interviews });
  } catch (error) {
    logger.error(`Failed to list interviews: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to list interviews" });
  }
});

// Confirmed upcoming interview times, used to flag already-allocated slots
router.get("/interviews/allocated-slots", requireManager, async (req, res) => {
  try {
    const rows = await db
      .select({
        scheduledAt: candidateInterviews.scheduledAt,
        interviewerId: candidateInterviews.interviewerId,
      })
      .from(candidateInterviews)
      .where(eq(candidateInterviews.status, "scheduled"));
    const now = Date.now();
    const data = rows
      .filter((r) => r.scheduledAt && r.scheduledAt.getTime() >= now)
      .map((r) => ({
        datetime: r.scheduledAt!.toISOString(),
        interviewerId: r.interviewerId,
      }));
    res.status(200).json({ data });
  } catch (error) {
    logger.error(`Failed to list allocated slots: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to list allocated slots" });
  }
});

router.patch("/interviews/:id", requireManager, requireInterviewView(), async (req, res) => {
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
    socketService.notifyInterviewChanged({
      interviewId: interview.id,
      candidateId: interview.candidateId,
    });
    res.status(200).json({ data: interview });
  } catch (error) {
    if (isInterviewClash(error)) {
      res.status(409).json({ error: INTERVIEWER_BUSY, code: "SLOT_TAKEN" });
      return;
    }
    res
      .status(400)
      .json({ error: getErrorMessage(error) || "Failed to update interview" });
  }
});

const INTERVIEWER_BUSY = "The interviewer already has an interview at that time. Pick another time.";

const futureDate = z.string().refine((v) => {
  const d = new Date(v);
  return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
}, "Each time must be a valid date in the future");

const scheduleSchema = z
  .object({
    eventName: z.string().min(1),
    eventType: z.enum(["virtual", "onsite"]),
    meetingUrl: z.string().url().optional().nullable(),
    meetingProvider: z.enum(["google_meet"]).optional(),
    interviewerId: z.number().int(),
    location: z.string().optional().nullable(),
    bodyText: z.string().optional().nullable(),
    stageId: z.number().int().optional(),
    durationMinutes: z.number().int().min(5).max(480).default(DEFAULT_INTERVIEW_MINUTES),
    /** Set when the hiring team has already agreed the time. Then no slots are offered. */
    scheduledAt: futureDate.optional(),
    timeSlots: z
      .array(z.object({ datetime: futureDate, selected: z.boolean().default(false) }))
      .default([]),
  })
  .superRefine((data, ctx) => {
    if (!data.scheduledAt && data.timeSlots.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["timeSlots"],
        message: "Add at least one time slot, or set the time yourself",
      });
    }
    if (
      data.eventType === "virtual" &&
      !data.meetingProvider &&
      !data.meetingUrl
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meetingUrl"],
        message:
          "Virtual interviews need a meeting link — auto-generate one or paste a URL",
      });
    }
  });

router.post("/candidates/:id/schedule", requireManager, requireCandidateView("id"), async (req, res) => {
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

    if (parsed.data.meetingProvider) {
      const accessToken = await integrationConnectionService.getValidAccessToken(
        parsed.data.interviewerId,
      );
      if (!accessToken) {
        res.status(422).json({
          error: "Selected interviewer has not connected this meeting provider",
        });
        return;
      }
    }

    const stageId = parsed.data.stageId || candidate.currentStageId || 0;
    const token = randomUUID();
    // A time the team set themselves is final; otherwise the candidate picks from the slots.
    const fixedAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;

    const [interview] = await db
      .insert(candidateInterviews)
      .values({
        candidateId: candidate.id,
        stageId,
        jobId: candidate.jobId,
        eventName: parsed.data.eventName,
        eventType: parsed.data.eventType,
        meetingUrl: parsed.data.meetingUrl ?? null,
        meetingProvider: parsed.data.meetingProvider ?? null,
        interviewerId: parsed.data.interviewerId,
        location: parsed.data.location ?? null,
        bodyText: parsed.data.bodyText ?? null,
        durationMinutes: parsed.data.durationMinutes,
        ...(fixedAt
          ? { status: "scheduled", scheduledAt: fixedAt }
          : {
              timeSlots: parsed.data.timeSlots,
              status: "pending_schedule",
              publicToken: token,
              tokenExpiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            }),
        createdBy: req.user.id,
      })
      .returning();

    if (!interview) throw new Error("Failed to create interview");

    socketService.notifyInterviewChanged({
      interviewId: interview.id,
      candidateId: candidate.id,
    });

    if (fixedAt) {
      // Nothing for the candidate to choose, so go straight to the link, calendar and confirmation.
      await completeInterviewBooking(interview, fixedAt);
      // Read it again: the booking has just saved the meeting link and the calendar entry.
      const [booked] = await db
        .select()
        .from(candidateInterviews)
        .where(eq(candidateInterviews.id, interview.id));
      res.status(201).json({ data: booked ?? interview });
      return;
    }

    const publicUrl = frontendUrl(`/interview/${token}`);

    void emailContext("interview_slots")
      .then((context) =>
        sendCandidateEmail({
          candidateId: candidate.id,
          to: candidate.email,
          kind: "interview_slots",
          sentBy: req.user.id,
          ...interviewSlotsEmail({
            ...context,
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            eventName: parsed.data.eventName,
            jobTitle: candidate.jobTitle ?? "",
            eventType: parsed.data.eventType,
            meetingUrl: parsed.data.meetingUrl ?? null,
            location: parsed.data.location ?? null,
            bodyText: parsed.data.bodyText ?? null,
            publicUrl,
          }),
        }),
      )
      .catch((err: unknown) => {
        logger.error(`Failed to send interview slot email: ${getErrorMessage(err)}`);
      });

    res.status(201).json({ data: interview });
  } catch (error) {
    // A time the team set themselves that runs into another of the interviewer's interviews.
    if (isInterviewClash(error)) {
      res.status(409).json({ error: INTERVIEWER_BUSY, code: "SLOT_TAKEN" });
      return;
    }
    logger.error(`Schedule interview failed: ${getErrorMessage(error)}`);
    res.status(400).json({ error: getErrorMessage(error) });
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
        location: candidateInterviews.location,
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
  } catch (error) {
    logger.error(`Failed to load interview: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to load interview" });
  }
});

router.delete("/interviews/:id", requireManager, requireInterviewView(), async (req, res) => {
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
    socketService.notifyInterviewChanged({
      interviewId: deleted.id,
      candidateId: deleted.candidateId,
    });
    res.status(200).json({ data: deleted });
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

const feedbackSchema = z
  .object({
    content: z.string().default(""),
    rating: z.number().int().min(1).max(5).optional().nullable(),
    recommendation: z.enum(["strong_no", "no", "yes", "strong_yes"]).optional().nullable(),
    ratings: z
      .array(
        z.object({
          criterionId: z.number().int().positive(),
          rating: z.number().int().min(1).max(5),
        }),
      )
      .optional(),
  })
  .refine(
    (d) => d.content.trim().length > 0 || (d.ratings?.length ?? 0) > 0 || d.recommendation,
    "Add notes, a recommendation or at least one score",
  );

router.post("/interviews/:id/feedback", requireInterviewView(), async (req, res) => {
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
    const feedback = await interviewService.addFeedback(interviewId, req.user.id, {
      ...parsed.data,
      content: parsed.data.content.trim(),
    });
    if (!feedback) {
      res.status(404).json({ error: "Interview not found" });
      return;
    }
    const [interview] = await db
      .select({ candidateId: candidateInterviews.candidateId })
      .from(candidateInterviews)
      .where(eq(candidateInterviews.id, interviewId));
    if (interview) {
      socketService.notifyInterviewChanged({
        interviewId,
        candidateId: interview.candidateId,
      });
    }
    res.status(201).json({ data: feedback });
  } catch (error) {
    if (error instanceof FeedbackValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: getErrorMessage(error) || "Failed to add feedback" });
  }
});

router.get("/interviews/:id/feedback", requireInterviewView(), async (req, res) => {
  try {
    const interviewId = parseInt((req.params.id ?? "").toString());
    if (isNaN(interviewId)) {
      res.status(400).json({ error: "Invalid interview ID" });
      return;
    }
    const { data, meta } = await interviewService.getFeedback(interviewId, req.user);
    res.status(200).json({ data, meta });
  } catch (error) {
    logger.error(`Failed to fetch feedback: ${getErrorMessage(error)}`);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

router.delete("/interviews/:id/feedback/:feedbackId", requireManager, requireInterviewView(), async (req, res) => {
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
    const [interview] = await db
      .select({ candidateId: candidateInterviews.candidateId })
      .from(candidateInterviews)
      .where(eq(candidateInterviews.id, deleted.interviewId));
    if (interview) {
      socketService.notifyInterviewChanged({
        interviewId: deleted.interviewId,
        candidateId: interview.candidateId,
      });
    }
    res.status(200).json({ data: deleted });
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

export default router;
