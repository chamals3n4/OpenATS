import { Router } from "express";
import {
  getIntegrationStatus,
  getUserIntegrationStatus,
  getGoogleAuthorizeUrl,
  disconnectGoogle,
} from "../controllers/integrations.controller";
import { requireManager } from "../middlewares/role.middleware";

const router: Router = Router();

router.get("/status", getIntegrationStatus);
router.get("/status/:userId", requireManager, getUserIntegrationStatus);
router.get("/google/authorize-url", getGoogleAuthorizeUrl);
router.delete("/google", disconnectGoogle);

export default router;
