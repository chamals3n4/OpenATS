import { Router } from "express";
import {
  getAllowedOrigins,
  putAllowedOrigins,
} from "./page-settings.controller";
import { getAiSettings, putAiSettings } from "./ai-settings.controller";
import { requireManager } from "../../middlewares/role.middleware";

const router: Router = Router();

router.get("/allowed-origins", requireManager, getAllowedOrigins);
router.put("/allowed-origins", requireManager, putAllowedOrigins);

// Everyone signed in may read this: the candidate page uses it to decide whether to show the AI
// analysis at all. Only managers may change it.
router.get("/ai", getAiSettings);
router.put("/ai", requireManager, putAiSettings);

export default router;
