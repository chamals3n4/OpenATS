import { Router } from "express";
import { getJobChatHistory, getCandidateChatHistory } from "./chat.controller";
import {
  requireCandidateAccess,
  requireJobAccess,
} from "../../middlewares/job-access.middleware";

const router: Router = Router();

router.get("/job/:jobId", requireJobAccess(), getJobChatHistory);

router.get(
  "/candidate/:candidateId",
  requireCandidateAccess(),
  getCandidateChatHistory,
);

export default router;
