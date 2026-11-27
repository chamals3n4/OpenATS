import { Router } from "express";
import {
  getAllowedOrigins,
  putAllowedOrigins,
} from "./page-settings.controller";
import { getAiSettings, putAiSettings, deleteAiProvider, testAiProvider, getAiModels, putAiModel } from "./ai-settings.controller";
import { expensiveLimiter } from "../../middlewares/rate-limit.middleware";
import { requireAdmin, requireManager } from "../../middlewares/role.middleware";
import { getWorkerStatus } from "../../queues/worker-status";

const router: Router = Router();

router.get("/allowed-origins", requireManager, getAllowedOrigins);
router.put("/allowed-origins", requireManager, putAllowedOrigins);

// Everyone signed in may read this: the candidate page uses it to decide whether to show the AI
// analysis at all. Only managers may change it.
router.get("/ai", getAiSettings);
router.put("/ai", requireAdmin, putAiSettings);
router.delete("/ai", requireAdmin, deleteAiProvider);
router.post("/ai/test", requireAdmin, expensiveLimiter, testAiProvider);
router.get("/ai/models", requireAdmin, expensiveLimiter, getAiModels);
router.put("/ai/model", requireAdmin, expensiveLimiter, putAiModel);

// Whether the background worker is running. Everyone signed in may read it: the candidate page
// uses it to explain a CV that is still waiting to be read.
router.get("/worker", async (_req, res) => {
  res.status(200).json({ data: { status: await getWorkerStatus() } });
});

export default router;
