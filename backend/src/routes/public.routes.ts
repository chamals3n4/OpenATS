import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import {
  getPublicJobById,
  listPublishedCareersJobs,
} from "../controllers/job.controller";
import { getPublicCompany } from "../controllers/company.controller";
import { checkOrigins } from "../middlewares/allowedOrigins.middleware";
import { getCustomQuestions } from "../controllers/custom-question.controller";
import { applyForJob } from "../controllers/candidate.controller";
import { uploadFile } from "../controllers/upload.controller";
import {
  getAssessmentForCandidate,
  startAssessment,
  submitAssessmentAnswer,
  completeAssessment,
} from "../controllers/assessment-execution.controller";
import {
  acceptPublicOffer,
  declinePublicOffer,
  getPublicOfferByToken,
} from "../controllers/offer.controller";
import { db } from "../db";
import { candidates, jobs, candidateInterviews } from "../db/schema";
import { eq } from "drizzle-orm";
import rateLimit from "express-rate-limit";
import logger from "../utils/logger";

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
    res.status(200).json({
      data: {
        ...iv,
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

      const idx = req.body?.slotIndex;
      if (idx == null || idx < 0) {
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
      selectedSlot.selected = true;
      await db
        .update(candidateInterviews)
        .set({
          timeSlots: slots,
          status: "scheduled",
          scheduledAt: new Date(selectedSlot.datetime),
          updatedAt: new Date(),
        })
        .where(eq(candidateInterviews.id, iv.id));
      res.status(200).json({ data: { confirmed: true } });
    } catch (e: any) {
      logger.error(`Failed to select interview slot: ${e?.message}`);
      res
        .status(500)
        .json({ error: "Something went wrong. Please try again." });
    }
  },
);

export default router;
