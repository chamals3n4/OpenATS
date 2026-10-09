import { Router } from "express";
import {
  inviteCandidateToAssessment,
  getAssessmentForCandidate,
  startAssessment,
  submitAssessmentAnswer,
  completeAssessment,
  getCandidateAttempts,
  getAttemptResults,
  gradeWrittenAnswer,
} from "./assessment-execution.controller";

import { requireManager } from "../../middlewares/role.middleware";

const router: Router = Router();

router.post("/invite", inviteCandidateToAssessment);
router.get("/candidate/:candidateId", getCandidateAttempts);
router.get("/attempts/:attemptId/results", getAttemptResults);
router.put("/attempts/:attemptId/grade", requireManager, gradeWrittenAnswer);

router.get("/public/:token", getAssessmentForCandidate);

router.post("/public/:token/start", startAssessment);

router.post("/public/:token/answer", submitAssessmentAnswer);

router.post("/public/:token/complete", completeAssessment);

export default router;
