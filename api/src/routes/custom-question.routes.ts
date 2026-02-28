import { Router } from "express";
import {
  getCustomQuestions,
  createCustomQuestion,
  updateCustomQuestion,
  deleteCustomQuestion,
  getAssessmentAttachment,
  attachAssessment,
  detachAssessment,
} from "../controllers/custom-question.controller";

// NOTE: These routes are mounted under /api/jobs in job.routes.ts
// so all paths here are relative to /:jobId
const router:Router = Router({ mergeParams: true });

// ── Custom Questions ──────────────────────────────────────────────────────────
// GET    /api/jobs/:jobId/questions                        → list all questions
// POST   /api/jobs/:jobId/questions                        → create a question
// PUT    /api/jobs/:jobId/questions/:questionId            → update a question
// DELETE /api/jobs/:jobId/questions/:questionId            → delete a question
router.get("/", getCustomQuestions);
router.post("/", createCustomQuestion);
router.put("/:questionId", updateCustomQuestion);
router.delete("/:questionId", deleteCustomQuestion);

// ── Assessment Attachment ─────────────────────────────────────────────────────
// GET    /api/jobs/:jobId/assessment-attachment            → get current attachment
// POST   /api/jobs/:jobId/assessment-attachment            → attach (or replace)
// DELETE /api/jobs/:jobId/assessment-attachment/:stageId  → detach from a stage
router.get("/assessment-attachment", getAssessmentAttachment);
router.post("/assessment-attachment", attachAssessment);
router.delete("/assessment-attachment/:stageId", detachAssessment);

export default router;
