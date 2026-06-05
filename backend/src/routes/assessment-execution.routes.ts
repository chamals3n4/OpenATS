import { Router } from "express";
import {
  inviteCandidateToAssessment,
  getAssessmentForCandidate,
  startAssessment,
  submitAssessmentAnswer,
  completeAssessment,
  getCandidateAttempts,
  getAttemptResults,
} from "../controllers/assessment-execution.controller";

const router: Router = Router();

router.post("/invite", inviteCandidateToAssessment);
router.get("/candidate/:candidateId", getCandidateAttempts);
router.get("/attempts/:attemptId/results", getAttemptResults);

router.get("/public/:token", getAssessmentForCandidate);

router.post("/public/:token/start", startAssessment);

router.post("/public/:token/answer", submitAssessmentAnswer);

router.post("/public/:token/complete", completeAssessment);

export default router;
