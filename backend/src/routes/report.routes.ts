import { Router } from "express";
import {
  exportReportsAnalytics,
  getReportsAnalytics,
} from "../controllers/report.controller";

import { requireManager } from "../middlewares/role.middleware";

const router: Router = Router();

router.get("/analytics", getReportsAnalytics);
router.get("/analytics/export", requireManager, exportReportsAnalytics);

export default router;
