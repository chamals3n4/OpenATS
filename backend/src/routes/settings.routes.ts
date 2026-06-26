import { Router } from "express";
import {
  getAllowedOrigins,
  putAllowedOrigins,
} from "../controllers/page-settings.controller";
import { requireManager } from "../middlewares/role.middleware";

const router: Router = Router();

router.get("/allowed-origins", requireManager, getAllowedOrigins);
router.put("/allowed-origins", requireManager, putAllowedOrigins);

export default router;
