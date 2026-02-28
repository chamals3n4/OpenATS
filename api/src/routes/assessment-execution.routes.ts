import { Router } from "express";
import {
  inviteCandidateToAssessment,
  getAssessmentForCandidate,
  startAssessment,
  submitAssessmentAnswer,
  completeAssessment,
} from "../controllers/assessment-execution.controller";

const router: Router = Router();

// Internal/Recruiter endpoint
// POST /api/assessment-execution/invite
router.post("/invite", inviteCandidateToAssessment);

// Public Candidate endpoints (using secure token)
// GET /api/assessment-execution/public/:token
router.get("/public/:token", getAssessmentForCandidate);

// POST /api/assessment-execution/public/:token/start
router.post("/public/:token/start", startAssessment);

// POST /api/assessment-execution/public/:token/answer
router.post("/public/:token/answer", submitAssessmentAnswer);

// POST /api/assessment-execution/public/:token/complete
router.post("/public/:token/complete", completeAssessment);

export default router;
