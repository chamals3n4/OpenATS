import { Router } from "express";
import {
  exportReportsAnalytics,
  getReportsAnalytics,
} from "../controllers/report.controller";

const router: Router = Router();

router.get("/analytics", getReportsAnalytics);
router.get("/analytics/export", exportReportsAnalytics);

export default router;
