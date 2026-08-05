import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import {
  getPublicJobById,
  listPublishedCareersJobs,
} from "../modules/job/job.controller";
import { getPublicCompany } from "../modules/company/company.controller";
import { checkOrigins } from "../middlewares/allowedOrigins.middleware";
import { getCustomQuestions } from "../modules/custom-question/custom-question.controller";
import { applyForJob } from "../modules/candidate/candidate.controller";
import { uploadFile } from "../modules/upload/upload.controller";
import {
  getAssessmentForCandidate,
  startAssessment,
  submitAssessmentAnswer,
  completeAssessment,
} from "../modules/assessment-execution/assessment-execution.controller";
import {
  acceptPublicOffer,
  declinePublicOffer,
  getPublicOfferByToken,
} from "../modules/offer/offer.controller";
import { db } from "../db";
import { candidates, jobs, candidateInterviews, users } from "../db/schema";
import { and, eq, ne } from "drizzle-orm";
import rateLimit from "express-rate-limit";
import logger from "../utils/logger";
import { mailService } from "../shared/services/mail.service";
import { socketService } from "../shared/services/socket.service";
import { integrationConnectionService } from "../shared/integrations/connection.service";
import { getProviderClient } from "../shared/integrations/registry";

const router: Router = Router();

// Public resume uploads are unauthenticated, so restrict to PDF only. The
// 10MB cap stays; anything else is rejected before it reaches storage.
const ALLOWED_RESUME_TYPES = new Set(["application/pdf"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_RESUME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF resumes are allowed"));
    }
  },
});

// Wrap multer so a rejected/oversized file returns a clean 400 instead of
// falling through to the generic error handler as a 500.
function handleResumeUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  upload.single("file")(req, res, (err: unknown) => {
    if (err) {
      const message =
        err instanceof Error ? err.message : "Invalid file upload";
      res.status(400).json({ error: message });
      return;
    }
    next();
  });
}

const applyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many applications submitted. Please try again later.",
  },
});

const publicWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

const publicReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

router.get("/company", checkOrigins, getPublicCompany);
router.get("/jobs", checkOrigins, listPublishedCareersJobs);
router.get("/jobs/:id", checkOrigins, getPublicJobById);
router.get("/jobs/:jobId/questions", checkOrigins, getCustomQuestions);
router.post("/jobs/:jobId/apply", checkOrigins, applyLimiter, applyForJob);
router.post(
  "/upload/resume",
  checkOrigins,
  publicWriteLimiter,
  handleResumeUpload,
  uploadFile,
);

// assessments for candidates ( token based)
router.get("/assessment/:token", publicReadLimiter, getAssessmentForCandidate);
router.post("/assessment/:token/start", publicWriteLimiter, startAssessment);
router.post(
  "/assessment/:token/answer",
  publicWriteLimiter,
  submitAssessmentAnswer,
);
router.post(
  "/assessment/:token/complete",
  publicWriteLimiter,
  completeAssessment,
);

// public offer portal (token based)
router.get("/offers/:token", publicReadLimiter, getPublicOfferByToken);
router.post("/offers/:token/accept", publicWriteLimiter, acceptPublicOffer);
router.post("/offers/:token/decline", publicWriteLimiter, declinePublicOffer);

// Times already taken by other confirmed interviews (same interviewer, or any if unassigned)
async function getTakenTimes(
  excludeInterviewId: number,
  interviewerId: number | null,
): Promise<Set<number>> {
  const rows = await db
    .select({
      scheduledAt: candidateInterviews.scheduledAt,
      interviewerId: candidateInterviews.interviewerId,
    })
    .from(candidateInterviews)
    .where(
      and(
        eq(candidateInterviews.status, "scheduled"),
        ne(candidateInterviews.id, excludeInterviewId),
      ),
    );
  const taken = new Set<number>();
  for (const r of rows) {
    if (!r.scheduledAt) continue;
    if (
      interviewerId != null &&
      r.interviewerId != null &&
      r.interviewerId !== interviewerId
    ) {
      continue;
    }
    taken.add(r.scheduledAt.getTime());
  }
  return taken;
}

// Public interview slot selection (no auth)
router.get("/interview/:token", publicReadLimiter, async (req, res) => {
  try {
    const [iv] = await db
      .select({
        id: candidateInterviews.id,
        eventName: candidateInterviews.eventName,
        eventType: candidateInterviews.eventType,
        meetingUrl: candidateInterviews.meetingUrl,
        bodyText: candidateInterviews.bodyText,
        timeSlots: candidateInterviews.timeSlots,
        status: candidateInterviews.status,
        tokenExpiresAt: candidateInterviews.tokenExpiresAt,
        interviewerId: candidateInterviews.interviewerId,
        candidateName: {
          first: candidates.firstName,
          last: candidates.lastName,
        },
        jobTitle: jobs.title,
      })
      .from(candidateInterviews)
      .leftJoin(candidates, eq(candidateInterviews.candidateId, candidates.id))
      .leftJoin(jobs, eq(candidateInterviews.jobId, jobs.id))
      .where(
        eq(
          candidateInterviews.publicToken,
          (req.params.token ?? "").toString(),
        ),
      );

    if (!iv) {
      res.status(404).json({ error: "Invalid link" });
      return;
    }

    if (iv.tokenExpiresAt && iv.tokenExpiresAt < new Date()) {
      res.status(404).json({ error: "Invalid link" });
      return;
    }

    const takenTimes = await getTakenTimes(iv.id, iv.interviewerId);
    const slots = (iv.timeSlots ?? []) as Array<{
      datetime: string;
      selected: boolean;
    }>;
    const timeSlots = slots.map((s) => ({
      ...s,
      taken: takenTimes.has(new Date(s.datetime).getTime()),
    }));

    const { interviewerId: _interviewerId, ...publicIv } = iv;
    res.status(200).json({
      data: {
        ...publicIv,
        timeSlots,
        candidateName: iv.candidateName
          ? `${iv.candidateName.first} ${iv.candidateName.last}`
          : "Unknown",
      },
    });
  } catch (e: any) {
    logger.error(`Failed to fetch public interview by token: ${e?.message}`);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

router.patch(
  "/interview/:token/select",
  publicWriteLimiter,
  async (req, res) => {
    try {
      const [iv] = await db
        .select()
        .from(candidateInterviews)
        .where(
          eq(
            candidateInterviews.publicToken,
            (req.params.token ?? "").toString(),
          ),
        );
      if (!iv?.timeSlots) {
        res.status(404).json({ error: "Invalid link" });
        return;
      }

      if (iv.tokenExpiresAt && iv.tokenExpiresAt < new Date()) {
        res.status(410).json({ error: "This scheduling link has expired" });
        return;
      }

      if (iv.status === "scheduled") {
        res
          .status(409)
          .json({ error: "This interview has already been scheduled" });
        return;
      }

      const idx = Number(req.body?.slotIndex);
      if (!Number.isInteger(idx) || idx < 0) {
        res.status(400).json({ error: "slotIndex required" });
        return;
      }
      const slots = iv.timeSlots as Array<{
        datetime: string;
        selected: boolean;
      }>;
      if (idx >= slots.length) {
        res.status(400).json({ error: "Invalid slot" });
        return;
      }
      const selectedSlot = slots[idx]!;
      const scheduledAt = new Date(selectedSlot.datetime);
      if (Number.isNaN(scheduledAt.getTime())) {
        res.status(400).json({ error: "Invalid slot" });
        return;
      }
      if (scheduledAt.getTime() <= Date.now()) {
        res.status(400).json({
          error:
            "This time slot has already passed. Please contact the hiring team for new times.",
        });
        return;
      }

      const takenTimes = await getTakenTimes(iv.id, iv.interviewerId);
      if (takenTimes.has(scheduledAt.getTime())) {
        res.status(409).json({
          error:
            "This time slot is no longer available. Please pick a different time.",
          code: "SLOT_TAKEN",
        });
        return;
      }

      selectedSlot.selected = true;

      // Claim first so concurrent confirms can't double-book
      const claimed = await db
        .update(candidateInterviews)
        .set({
          timeSlots: slots,
          status: "scheduled",
          scheduledAt,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(candidateInterviews.id, iv.id),
            eq(candidateInterviews.status, "pending_schedule"),
          ),
        )
        .returning({ id: candidateInterviews.id });

      if (claimed.length === 0) {
        res
          .status(409)
          .json({ error: "This interview has already been scheduled" });
        return;
      }

      const [candidate] = await db
        .select({
          email: candidates.email,
          firstName: candidates.firstName,
          lastName: candidates.lastName,
        })
        .from(candidates)
        .where(eq(candidates.id, iv.candidateId));

      const interviewer = iv.interviewerId
        ? (
            await db
              .select({ email: users.email })
              .from(users)
              .where(eq(users.id, iv.interviewerId))
          )[0]
        : undefined;

      let meetingUrl = iv.meetingUrl;
      let providerMeetingId: string | null = null;
      if (iv.meetingProvider && iv.interviewerId) {
        try {
          const accessToken =
            await integrationConnectionService.getValidAccessToken(
              iv.interviewerId,
            );
          if (accessToken) {
            const meeting = await getProviderClient(
              iv.meetingProvider,
            ).createMeeting(accessToken, {
              eventName: iv.eventName ?? "Interview",
              scheduledAt,
              durationMinutes: 60,
              attendeeEmails: candidate ? [candidate.email] : [],
            });
            meetingUrl = meeting.meetingUrl;
            providerMeetingId = meeting.providerMeetingId ?? null;
          } else {
            logger.warn(
              `Interview ${iv.id}: interviewer ${iv.interviewerId} no longer has a valid ${iv.meetingProvider} connection — confirmation will go out without an auto-generated link`,
            );
          }
        } catch (err: any) {
          // Non-fatal — keep whatever meetingUrl was already on the row (manual or none)
          logger.error(
            `Failed to auto-generate meeting link for interview ${iv.id}: ${err.message}`,
          );
        }
      }
      if ((iv.eventType ?? "virtual") === "virtual" && !meetingUrl) {
        logger.warn(
          `Interview ${iv.id} confirmed as virtual but has no meeting link — recruiter attention needed`,
        );
      }

      let googleEventId: string | null = null;
      if (candidate && iv.eventName) {
        try {
          const gcal = await import("../shared/services/google-calendar.service");
          googleEventId = await gcal.createCalendarEvent({
            interviewId: iv.id,
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            jobTitle: "",
            stageName: "",
            scheduledAt,
            durationMinutes: 60,
            notes: iv.bodyText ?? null,
            attendeeEmails: [
              candidate.email,
              ...(interviewer ? [interviewer.email] : []),
            ],
            meetingUrl,
          });
        } catch (err: any) {
          logger.error(
            `Failed to create calendar event for interview ${iv.id}: ${err.message}`,
          );
        }
      }

      if (meetingUrl !== iv.meetingUrl || googleEventId || providerMeetingId) {
        await db
          .update(candidateInterviews)
          .set({
            meetingUrl,
            ...(googleEventId ? { googleEventId } : {}),
            ...(providerMeetingId ? { providerMeetingId } : {}),
            updatedAt: new Date(),
          })
          .where(eq(candidateInterviews.id, iv.id));
      }

      if (candidate && iv.eventName) {
        mailService
          .sendInterviewConfirmationEmail(
            candidate.email,
            `${candidate.firstName} ${candidate.lastName}`,
            iv.eventName,
            iv.eventType ?? "virtual",
            scheduledAt,
            60,
            meetingUrl,
            iv.location ?? null,
          )
          .catch((err: any) => {
            logger.error(
              `Failed to send confirmation email for interview ${iv.id}: ${err.message}`,
            );
          });
      }

      socketService.notifyInterviewChanged({
        interviewId: iv.id,
        candidateId: iv.candidateId,
      });

      res.status(200).json({ data: { confirmed: true, slot: selectedSlot } });
    } catch (e: any) {
      logger.error(`Failed to select interview slot: ${e?.message}`);
      res
        .status(500)
        .json({ error: "Something went wrong. Please try again." });
    }
  },
);

export default router;
