import { Router } from "express";
import { requireCandidateAccess } from "../../middlewares/job-access.middleware";
import { expensiveLimiter } from "../../middlewares/rate-limit.middleware";
import { requireManager } from "../../middlewares/role.middleware";
import { getCandidateEmails, sendCandidateEmail } from "./candidate-email.controller";

const router: Router = Router();

// Anyone on the hiring team can read what was sent; only managers can send.
router.get("/candidates/:candidateId/emails", requireCandidateAccess(), getCandidateEmails);
router.post(
  "/candidates/:candidateId/emails",
  requireManager,
  requireCandidateAccess(),
  expensiveLimiter,
  sendCandidateEmail,
);

export default router;
