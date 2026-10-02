import { Router } from "express";
import {
  exportReportsAnalytics,
  getAttention,
  getReportsAnalytics,
} from "./report.controller";

import { requireManager } from "../../middlewares/role.middleware";

const router: Router = Router();

router.get("/analytics", getReportsAnalytics);
router.get("/attention", requireManager, getAttention);
router.get("/analytics/export", requireManager, exportReportsAnalytics);

export default router;
