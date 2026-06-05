import { Router } from "express";
import multer from "multer";
import {
  getPublicJobById,
  listPublishedCareersJobs,
} from "../controllers/job.controller";
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

const router: Router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get("/jobs", checkOrigins, listPublishedCareersJobs);
router.get("/jobs/:id", checkOrigins, getPublicJobById);
router.get("/jobs/:jobId/questions", checkOrigins, getCustomQuestions);
router.post("/jobs/:jobId/apply", checkOrigins, applyForJob);
router.post("/upload/resume", checkOrigins, upload.single("file"), uploadFile);

// assessments for candidates ( token based)
router.get("/assessment/:token", getAssessmentForCandidate);
router.post("/assessment/:token/start", startAssessment);
router.post("/assessment/:token/answer", submitAssessmentAnswer);
router.post("/assessment/:token/complete", completeAssessment);

// public offer portal (token based)
router.get("/offers/:token", getPublicOfferByToken);
router.post("/offers/:token/accept", acceptPublicOffer);
router.post("/offers/:token/decline", declinePublicOffer);

// Public interview slot selection (no auth)
router.get("/interview/:token", async (req, res) => {
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
    if (!iv) {
      res.status(404).json({ error: "Invalid link" });
      return;
    }
    res.status(200).json({
      data: {
        ...iv,
        candidateName: `${iv.candidateName.first} ${iv.candidateName.last}`,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/interview/:token/select", async (req, res) => {
  try {
    const [iv] = await db
      .select()
      .from(candidateInterviews)
      .where(eq(candidateInterviews.publicToken, req.params.token));
    if (!iv?.timeSlots) {
      res.status(404).json({ error: "Invalid link" });
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
    slots[idx].selected = true;
    await db
      .update(candidateInterviews)
      .set({
        timeSlots: slots,
        status: "scheduled",
        scheduledAt: new Date(slots[idx].datetime),
        updatedAt: new Date(),
      })
      .where(eq(candidateInterviews.id, iv.id));
    res.status(200).json({ data: { confirmed: true } });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
