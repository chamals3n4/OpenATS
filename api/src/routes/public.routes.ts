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
import { respondToOffer } from "../controllers/offer-respond.controller";

const router: Router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get(
  "/jobs",
  checkOrigins,
  listPublishedCareersJobs,
);
router.get(
  "/jobs/:id",
  checkOrigins,
  getPublicJobById,
);
router.get(
  "/jobs/:jobId/questions",
  checkOrigins,
  getCustomQuestions,
);
router.post(
  "/jobs/:jobId/apply",
  checkOrigins,
  applyForJob,
);
router.post(
  "/upload/resume",
  checkOrigins,
  upload.single("file"),
  uploadFile,
);

// assessments for candidates ( token based)
router.get("/assessment/:token", getAssessmentForCandidate);
router.post("/assessment/:token/start", startAssessment);
router.post("/assessment/:token/answer", submitAssessmentAnswer);
router.post("/assessment/:token/complete", completeAssessment);

// self-serve offer response (no auth — token validates identity)
router.get("/offers/respond", respondToOffer);

export default router;
