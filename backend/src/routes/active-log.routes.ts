import { Router } from "express";
import {
  createActiveLog,
  exportActiveLogs,
  getActiveLogById,
  listActiveLogs,
} from "../controllers/active-log.controller";

const router: Router = Router();

router.get("/", listActiveLogs);
router.get("/export", exportActiveLogs);
router.get("/:id", getActiveLogById);
router.post("/", createActiveLog);

export default router;
