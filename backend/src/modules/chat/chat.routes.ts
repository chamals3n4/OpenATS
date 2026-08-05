import { Router } from "express";
import { getJobChatHistory, getCandidateChatHistory } from "./chat.controller";

const router: Router = Router();

router.get("/job/:jobId", getJobChatHistory);

router.get("/candidate/:candidateId", getCandidateChatHistory);

export default router;
