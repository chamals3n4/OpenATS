import { Router } from "express";
import { requireCandidateView } from "../../middlewares/job-access.middleware";
import { expensiveLimiter } from "../../middlewares/rate-limit.middleware";
import { requireManager } from "../../middlewares/role.middleware";
import { getCandidateEmails, sendCandidateEmail } from "./candidate-email.controller";

const router: Router = Router();

// Whoever may open the candidate can read what was sent to them; only managers can send.
router.get("/candidates/:candidateId/emails", requireCandidateView(), getCandidateEmails);
router.post(
  "/candidates/:candidateId/emails",
  requireManager,
  requireCandidateView(),
  expensiveLimiter,
  sendCandidateEmail,
);

export default router;
