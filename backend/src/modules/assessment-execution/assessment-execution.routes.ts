import { Router } from "express";
import {
  inviteCandidateToAssessment,
  getCandidateAttempts,
  getAttemptResults,
  gradeWrittenAnswer,
} from "./assessment-execution.controller";

import { requireManager } from "../../middlewares/role.middleware";

// What the hiring team does with assessments. Every route here checks that the user may see
// the candidate. The routes a candidate uses, by link, are in routes/public.routes.ts.
const router: Router = Router();

router.post("/invite", requireManager, inviteCandidateToAssessment);
router.get("/candidate/:candidateId", getCandidateAttempts);
router.get("/attempts/:attemptId/results", getAttemptResults);
router.put("/attempts/:attemptId/grade", requireManager, gradeWrittenAnswer);

export default router;
